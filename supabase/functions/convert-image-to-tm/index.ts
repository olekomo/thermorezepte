/// <reference types="https://esm.sh/@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const PROJECT_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
const SCHEMA = `{
  "title": "string",
  "portions": "number",
  "duration_minutes": "number",
  "accessories": ["string"],
  "ingredients": [{"name":"string","amount":"string","notes":"string"}],
  "steps": [{"step":"string","thermomix":{"mode":"string","temp_c":"number|null","speed":"string","time_seconds":"number|null"}}],
  "notes": "string"
}`;
Deno.serve(async (req)=>{
  try {
    const evt = await req.json();
    const rec = evt.record ?? evt.payload?.record ?? null;
    if (!rec?.bucket_id || !rec?.name) return new Response("ignored", {
      status: 200
    });
    if (rec.bucket_id !== "raw_uploads") {
      return new Response("ignored-bucket", {
        status: 200
      });
    }
    const bucket = rec.bucket_id;
    const name = rec.name;
    const imagePath = `${bucket}/${name}`;
    const firstSlash = name.indexOf("/");
    const userId = firstSlash > 0 ? name.slice(0, firstSlash) : null;
    if (!userId) {
      await markError(imagePath, "user-id-not-found-in-path", userId ?? null);
      return new Response("bad-object-key", {
        status: 400
      });
    }
    await supabase.from("recipes").upsert({
      image_path: imagePath,
      user_id: userId,
      status: "pending"
    }, {
      onConflict: "image_path"
    });
    // ADD: nicht nochmal konvertieren, wenn schon "done"
    const { data: existing } = await supabase.from("recipes").select("status").eq("image_path", imagePath).maybeSingle();
    if (existing?.status === "done") {
      return new Response("already-processed", {
        status: 200
      });
    }
    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(name, 600);
    if (signErr || !signed?.signedUrl) {
      await markError(imagePath, `sign-url: ${signErr?.message ?? "unknown"}`, userId);
      return new Response("sign-url-failed", {
        status: 500
      });
    }
    // 👇 User-Content mit Text + Bild (korrektes Format für chat.completions)
    const userContent = [
      {
        type: "text",
        text: `Extrahiere das Rezept aus dem Bild und konvertiere es in ein Thermomix-Rezept.
    Antworte ausschließlich als gültiges JSON im folgendem Schema:
    ${SCHEMA}
    Fehlende Thermomix-Parameter vorsichtig schätzen und in 'notes' vermerken.`
      },
      {
        type: "image_url",
        image_url: {
          url: signed.signedUrl
        } // signierte Supabase-URL
      }
    ];
    const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Du bist ein strenger JSON-Formatter. Gib NUR gültiges JSON aus."
          },
          {
            role: "user",
            content: userContent
          }
        ],
        temperature: 0.2
      })
    });
    if (!llmRes.ok) {
      const txt = await llmRes.text();
      console.error("OPENAI_ERROR:", txt); // <- bleibt im Serve-Log sichtbar
      await markError(imagePath, `llm: ${txt.slice(0, 500)}`, userId);
      return new Response("llm-error", {
        status: 500
      });
    }
    const data = await llmRes.json();
    let content = data.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    let recipeJson;
    try {
      recipeJson = JSON.parse(content);
    } catch  {
      recipeJson = {
        notes: "Model output not JSON",
        raw: content
      };
    }
    const title = recipeJson?.title && String(recipeJson.title).trim() || "Unbenanntes Rezept";
    const { error: upErr } = await supabase.from("recipes").upsert({
      image_path: imagePath,
      user_id: userId,
      title,
      recipe_json: recipeJson,
      status: "done",
      error: null
    }, {
      onConflict: "image_path"
    });
    if (upErr) {
      console.error("[Error] DB_ERROR:", upErr);
      await markError(imagePath, `db-upsert: ${upErr.message}`, userId);
      return new Response("db-error", {
        status: 500
      });
    }
    return new Response("ok", {
      status: 200
    });
  } catch (e) {
    console.error(e);
    return new Response("unexpected-error", {
      status: 500
    });
  }
});
async function markError(image_path, error, user_id) {
  await supabase.from("recipes").upsert(
    {
      image_path,
      user_id,          // <-- wichtig, sonst NOT NULL
      status: "error",
      error: String(error).slice(0, 500)
    },
    { onConflict: "image_path" }
  );
}