/// <reference types="https://esm.sh/@supabase/functions-js/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET")!; // neu!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ensureUser = async (uid: string) => {
  // existiert der User in public.users?
  const { data: urow, error: uerr } = await admin
    .from('users')
    .select('id')
    .eq('id', uid)
    .maybeSingle();

  if (uerr) {
    console.error('ensureUser.select.error', uerr);
    throw new Error('ensure-user-select-failed');
  }
  if (urow) return;

  // Email aus Auth ziehen (Service-Role-only)
  const { data: adminUser, error: aerr } = await admin.auth.admin.getUserById(uid);
  if (aerr) {
    console.error('ensureUser.authAdmin.error', aerr);
    throw new Error('ensure-user-auth-admin-failed');
  }
  const email = adminUser?.user?.email ?? `${uid}@invalid.local`;

  const { error: iErr } = await admin
    .from('users')
    .insert({ id: uid, email });
  if (iErr) {
    console.error('ensureUser.insert.error', iErr);
    throw new Error('ensure-user-insert-failed');
  }
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method-not-allowed", { status: 405 });

  try {
    // ---- nur vom Next-Server erlauben
    const secret = req.headers.get("x-internal-secret");
    if (!secret || secret !== INTERNAL_SECRET) {
      return new Response("forbidden", { status: 403 });
    }

    // ---- User kommt vom Server (bereits verifiziert)
    const userId = req.headers.get("x-user-id");
    if (!userId) return new Response("missing-user", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const imagePath: string | null = body?.image_path ?? null;
    const tmVersion: string | null =
      (body?.thermomix_version ?? body?.tm_version ?? body?.version ?? null) &&
      String(body.thermomix_version ?? body.tm_version ?? body.version);

    if (!imagePath) return new Response("missing-image-path", { status: 400 });
    if (!imagePath.startsWith("raw_uploads/")) return new Response("invalid-bucket", { status: 400 });

    const [, rest] = imagePath.split("raw_uploads/");
    const ownerId = rest.split("/")[0];
    if (ownerId !== userId) return new Response("forbidden-image", { status: 403 });

    // ---- Upsert pending
    await ensureUser(userId)
    const up1 = await admin.from("recipes").upsert(
      { image_path: imagePath, user_id: userId, status: "pending", error_message: null },
      { onConflict: "image_path" }
    );
    if (up1.error) return new Response("db-upsert-pending-error", { status: 500 });

    // ---- Re-Run vermeiden
    const { data: existing } = await admin
      .from("recipes").select("status").eq("image_path", imagePath).maybeSingle();
    if (existing?.status === "done") {
      return new Response(JSON.stringify({ ok: true, status: "already-processed" }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }

    // ---- Signed URL
    const name = rest; // "<USER_ID>/<filename>"
    const { data: signed, error: signErr } = await admin.storage
      .from("raw_uploads").createSignedUrl(name, 600);
    if (signErr || !signed?.signedUrl) {
      await markError(imagePath, `sign-url: ${signErr?.message ?? "unknown"}`, userId);
      return new Response("sign-url-failed", { status: 500 });
    }

    // ---- dein JSON-Schema (unverändert gekürzt)
    const jsonSchema = {
      name: "thermomix_recipe",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title","portions","duration_minutes","accessories","ingredients","steps","notes"],
        properties: {
          title:{type:"string",minLength:1},
          portions:{type:["number","null"]},
          duration_minutes:{type:["number","null"]},
          accessories:{type:"array",items:{type:"string"}},
          ingredients:{type:"array",minItems:1,items:{
            type:"object",additionalProperties:false,
            required:["name","amount","notes"],
            properties:{
              name:{type:"string",minLength:1},
              amount:{type:["string","null"]},
              notes:{type:["string","null"]}
            }
          }},
          steps:{type:"array",minItems:1,items:{
            type:"object",additionalProperties:false,
            required:["step","thermomix"],
            properties:{
              step:{type:"string",minLength:1},
              thermomix:{type:"object",additionalProperties:false,
                required:["mode","temp_c","speed","time_seconds"],
                properties:{
                  mode:{type:"string"},
                  temp_c:{type:["number","null"]},
                  speed:{type:"string"},
                  time_seconds:{type:["number","null"]}
                }
              }
            }
          }},
          notes:{type:["string","null"]}
        }
      },
      strict: true
    } as const;

    const userContent = [
      { type: "text", text:
`Extrahiere das Rezept aus dem Bild und konvertiere es in ein Cookidoo ähnliches Thermomix-Rezept.
Thermomix-Version: ${tmVersion ?? "unbekannt"}. Verwende passende Modi/Bezeichnungen.
Gib AUSSCHLIESSLICH gültiges JSON gemäß Schema aus. Fehlende Angaben vorsichtig schätzen und in "notes" vermerken.` },
      { type: "image_url", image_url: { url: signed.signedUrl } }
    ];

    const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_schema", json_schema: jsonSchema },
        messages: [
          { role: "system", content: "Du bist ein strenger JSON-Formatter. Gib NUR gültiges JSON aus." },
          { role: "user", content: userContent }
        ],
        temperature: 0
      })
    });

    if (!llmRes.ok) {
      const txt = await llmRes.text();
      await markError(imagePath, `llm: ${txt.slice(0, 500)}`, userId);
      return new Response("llm-error", { status: 500 });
    }

    const llmResp = await llmRes.json();
    const llmJsonText = llmResp?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try { parsed = JSON.parse(llmJsonText); } catch { parsed = { notes: "Model output not JSON", raw: llmJsonText }; }

    if (!parsed?.title || !Array.isArray(parsed?.ingredients) || !Array.isArray(parsed?.steps)) {
      await markError(imagePath, "schema-validation-failed: missing required fields", userId);
      return new Response("schema-error", { status: 500 });
    }

    const recipeToStore = { ...parsed, _meta: { ...(parsed?._meta ?? {}), thermomix_version: tmVersion ?? null } };
    const title = String(parsed.title).trim() || "Unbenanntes Rezept";

    const up2 = await admin.from("recipes").upsert(
      { image_path: imagePath, user_id: userId, title, recipe_json: recipeToStore, status: "done", error_message: null },
      { onConflict: "image_path" }
    );
    if (up2.error) {
      await markError(imagePath, `db-upsert: ${up2.error.message}`, userId);
      return new Response("db-error", { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("unexpected-error", e);
    return new Response("unexpected-error", { status: 500 });
  }
});

async function markError(image_path: string, error: string, user_id: string | null) {
  await admin.from("recipes").upsert(
    { image_path, user_id: user_id ?? undefined, status: "error", error_message: String(error).slice(0, 500) },
    { onConflict: "image_path" }
  );
}
