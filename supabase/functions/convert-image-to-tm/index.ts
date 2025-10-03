/// <reference types="https://esm.sh/@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- ENV ---
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const PROJECT_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// --- Clients ---
const supabase = createClient(PROJECT_URL!, SERVICE_ROLE_KEY!);

// (Optional) Vorgabe für das gewünschte JSON-Format in der Antwort
const SCHEMA = `{
  "title": "string",
  "portions": "number",
  "duration_minutes": "number",
  "accessories": ["string"],
  "ingredients": [{"name":"string","amount":"string","notes":"string"}],
  "steps": [{"step":"string","thermomix":{"mode":"string","temp_c":"number|null","speed":"string","time_seconds":"number|null"}}],
  "notes": "string"
}`;

Deno.serve(async (req) => {
  try {
    const evt = await req.json();

    // ---- Logging: ENV + Event Preview
    console.log(JSON.stringify({
      step: "env-check",
      has_OPENAI: !!OPENAI_API_KEY,
      has_URL: !!PROJECT_URL,
      has_SERVICE_ROLE: !!SERVICE_ROLE_KEY
    }));
    console.log(JSON.stringify({
      step: "event",
      evt_preview: { record: evt?.record, payload_rec: evt?.payload?.record }
    }));

    // ---- Event & Bucket prüfen
    const rec = evt.record ?? evt.payload?.record ?? null;
    if (!rec?.bucket_id || !rec?.name) {
      console.log(JSON.stringify({ step: "ignored", reason: "no-record" }));
      return new Response("ignored", { status: 200 });
    }
    if (rec.bucket_id !== "raw_uploads") {
      console.log(JSON.stringify({ step: "ignored", reason: "wrong-bucket", bucket: rec.bucket_id }));
      return new Response("ignored-bucket", { status: 200 });
    }

    const bucket = rec.bucket_id;          // "raw_uploads"
    const name = rec.name;                  // "<USER_ID>/<filename>.jpg"
    const imagePath = `${bucket}/${name}`;  // "raw_uploads/<USER_ID>/<filename>.jpg"

    // ---- user_id aus Pfad extrahieren
    const firstSlash = name.indexOf("/");
    const userId = firstSlash > 0 ? name.slice(0, firstSlash) : null;
    console.log(JSON.stringify({ step: "parsed", userId, imagePath }));

    if (!userId) {
      await markError(imagePath, "user-id-not-found-in-path", null);
      return new Response("bad-object-key", { status: 400 });
    }

    // ---- Erster Upsert: "pending" (idempotent; stellt sicher, dass eine Zeile existiert)
    const up1 = await supabase
      .from("recipes")
      .upsert(
        {
          image_path: imagePath,
          user_id: userId,      // WICHTIG: NOT NULL
          status: "pending",
          error: null
        },
        { onConflict: "image_path" }
      );
    if (up1.error) {
      console.error("upsert-pending.error", up1.error);
      return new Response("db-upsert-pending-error", { status: 500 });
    }
    console.log("upsert-pending.ok");

    // ---- Sanity-Check: Lesen möglich?
    const probe = await supabase.from("recipes").select("id").limit(1);
    if (probe.error) console.error("probe-select.error", probe.error);
    else console.log("probe-select.ok");

    // ---- Re-Run vermeiden
    const { data: existing, error: existingErr } = await supabase
      .from("recipes")
      .select("status")
      .eq("image_path", imagePath)
      .maybeSingle();
    if (existingErr) console.error("select-existing.error", existingErr);
    if (existing?.status === "done") {
      console.log("already-processed");
      return new Response("already-processed", { status: 200 });
    }

    // ---- Signed URL
    const { data: signed, error: signErr } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(name, 600);
    if (signErr || !signed?.signedUrl) {
      await markError(imagePath, `sign-url: ${signErr?.message ?? "unknown"}`, userId);
      return new Response("sign-url-failed", { status: 500 });
    }
    console.log("signed-url.ok");

    // ---- OpenAI-Aufruf (Chat Completions, Text + Bild)
    const userContent = [
      {
        type: "text",
        text:
          `Extrahiere das Rezept aus dem Bild und konvertiere es in ein Thermomix-Rezept.
Antworte ausschließlich als gültiges JSON im folgendem Schema:
${SCHEMA}
Fehlende Thermomix-Parameter vorsichtig schätzen und in 'notes' vermerken.`
      },
      {
        type: "image_url",
        image_url: { url: signed.signedUrl } // signierte Supabase-URL
      }
    ];

    console.log("openai.start");
    const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Du bist ein strenger JSON-Formatter. Gib NUR gültiges JSON aus." },
          { role: "user", content: userContent }
        ],
        temperature: 0
      })
    });

    if (!llmRes.ok) {
      const txt = await llmRes.text();
      console.error("OPENAI_ERROR:", txt);
      await markError(imagePath, `llm: ${txt.slice(0, 500)}`, userId);
      return new Response("llm-error", { status: 500 });
    }

    const data = await llmRes.json();
    console.log("openai.done");

    // ---- Inhalt extrahieren und JSON parsen
    let content = data?.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let recipeJson: any;
    try {
      recipeJson = JSON.parse(content);
    } catch {
      recipeJson = { notes: "Model output not JSON", raw: content };
    }

    const title =
      (recipeJson?.title && String(recipeJson.title).trim()) || "Unbenanntes Rezept";

    // ---- Finaler Upsert: status = done
    const up2 = await supabase
      .from("recipes")
      .upsert(
        {
          image_path: imagePath,
          user_id: userId,
          title,
          recipe_json: recipeJson,
          status: "done",
          error: null
        },
        { onConflict: "image_path" }
      );

    if (up2.error) {
      console.error("[Error] DB_ERROR:", up2.error);
      await markError(imagePath, `db-upsert: ${up2.error.message}`, userId);
      return new Response("db-error", { status: 500 });
    }
    console.log("upsert-done.ok");

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("unexpected-error", e);
    return new Response("unexpected-error", { status: 500 });
  }
});

// --- Helper: Fehler sicher persistieren (idempotent)
async function markError(image_path: string, error: string, user_id: string | null) {
  await supabase
    .from("recipes")
    .upsert(
      {
        image_path,
        user_id: user_id ?? undefined, // wenn unbekannt, bleibt undefined (späterer Upsert mit user_id überschreibt)
        status: "error",
        error: String(error).slice(0, 500)
      },
      { onConflict: "image_path" }
    );
}