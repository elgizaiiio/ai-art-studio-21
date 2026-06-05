import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getModel } from "@/lib/models-catalog";

// Send a freshly-generated asset to the user's Telegram chat (best-effort, never throws).
async function deliverToTelegram(
  telegramId: number | null | undefined,
  url: string,
  kind: "image" | "video" | "music",
  prompt: string,
) {
  if (!telegramId || !url) return;
  try {
    const tg = await import("@/lib/telegram-bot.server");
    const caption = `🪄 ${prompt.slice(0, 200)}`;
    if (kind === "image") await tg.tgSendPhoto(telegramId, url, caption);
    else if (kind === "video") await tg.tgSendVideo(telegramId, url, caption);
    else await tg.tgSendAudio(telegramId, url, caption);
  } catch {}
}

// ===== deAPI helpers (async jobs with polling) =====
const DEAPI_BASE = "https://api.deapi.ai";

async function deapiSubmit(path: string, body: Record<string, unknown>): Promise<string> {
  const key = process.env.DEAPI_API_KEY;
  if (!key) throw new Error("deapi_not_configured");
  const r = await fetch(`${DEAPI_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`deapi_submit_failed:${r.status}:${await r.text().catch(() => "")}`);
  const j = await r.json() as { data?: { request_id?: string } };
  const id = j?.data?.request_id;
  if (!id) throw new Error("deapi_no_request_id");
  return id;
}

async function deapiSubmitForm(path: string, form: FormData): Promise<string> {
  const key = process.env.DEAPI_API_KEY;
  if (!key) throw new Error("deapi_not_configured");
  const r = await fetch(`${DEAPI_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    body: form,
  });
  if (!r.ok) throw new Error(`deapi_submit_failed:${r.status}:${await r.text().catch(() => "")}`);
  const j = await r.json() as { data?: { request_id?: string } };
  const id = j?.data?.request_id;
  if (!id) throw new Error("deapi_no_request_id");
  return id;
}

async function deapiPoll(requestId: string, opts: { intervalMs?: number; maxAttempts?: number } = {}): Promise<string> {
  const key = process.env.DEAPI_API_KEY!;
  const interval = opts.intervalMs ?? 2500;
  const maxAttempts = opts.maxAttempts ?? 80;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));
    const r = await fetch(`${DEAPI_BASE}/api/v2/jobs/${requestId}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!r.ok) continue;
    const j = await r.json() as { data?: { status?: string; result_url?: string; result?: { url?: string } } };
    const status = j?.data?.status;
    if (status === "done" || status === "completed" || status === "success") {
      const url = j?.data?.result_url ?? j?.data?.result?.url;
      if (!url) throw new Error("deapi_no_result_url");
      return url;
    }
    if (status === "failed" || status === "error") throw new Error(`deapi_job_failed:${status}`);
  }
  throw new Error("deapi_timeout");
}

// ===== Image: Pollinations (free) | deAPI (paid) | Leonardo (premium)
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      initData: z.string(),
      prompt: z.string().min(2).max(2000),
      // Catalog model id (e.g. "leo-nano-banana", "pollinations-flux"). Legacy
      // shorthand "pollinations"/"deapi"/"leonardo" still works.
      model: z.string().default("pollinations-flux"),
      width: z.number().int().min(256).max(1536).default(1024),
      height: z.number().int().min(256).max(1536).default(1024),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();

    // Legacy aliases → catalog ids
    const legacy: Record<string, string> = {
      pollinations: "pollinations-flux",
      deapi: "deapi-flux-schnell",
      leonardo: "leo-nano-banana",
    };
    const modelId = legacy[data.model] ?? data.model;
    const entry = getModel(modelId);
    if (!entry || entry.kind !== "image") throw new Error("unknown_model");

    const isSubscriber = Boolean((user as any).plan && (user as any).plan !== "free");
    const cost = entry.freeForAll || (isSubscriber && entry.unlimitedForSubs) ? 0 : entry.cost;
    if (cost > 0 && user.points < cost) {
      throw new Error("insufficient_points");
    }

    let resultUrl = "";

    if (entry.provider === "pollinations") {
      const seed = Math.floor(Math.random() * 1_000_000);
      resultUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(data.prompt)}?width=${data.width}&height=${data.height}&seed=${seed}&nologo=true&model=flux`;
    } else if (entry.provider === "deapi") {
      const reqId = await deapiSubmit("/api/v2/images/generations", {
        prompt: data.prompt,
        model: entry.providerModel ?? "Flux1schnell",
        width: data.width,
        height: data.height,
        steps: 4,
      });
      resultUrl = await deapiPoll(reqId, { intervalMs: 2000, maxAttempts: 60 });
    } else {
      const key = process.env.LEONARDO_API_KEY;
      if (!key) throw new Error("leonardo_not_configured");
      // Leonardo v2 endpoint takes model slug + parameters object.
      const create = await fetch("https://cloud.leonardo.ai/api/rest/v2/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: entry.providerModel,
          public: false,
          parameters: {
            prompt: data.prompt,
            width: data.width,
            height: data.height,
            quantity: 1,
            prompt_enhance: "OFF",
          },
        }),
      });
      if (!create.ok) throw new Error(`leonardo_create_failed:${create.status}`);
      const cj = await create.json();
      const genId =
        cj?.generate?.generationId ??
        cj?.sdGenerationJob?.generationId ??
        cj?.generationId ??
        cj?.data?.generationId ??
        cj?.generations?.[0]?.id;
      if (!genId) throw new Error("leonardo_no_id");
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const r = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!r.ok) continue;
        const j = await r.json();
        const status = j?.generations_by_pk?.status;
        if (status === "COMPLETE") {
          resultUrl = j?.generations_by_pk?.generated_images?.[0]?.url ?? "";
          break;
        }
        if (status === "FAILED") throw new Error("leonardo_failed");
      }
      if (!resultUrl) throw new Error("leonardo_timeout");
    }

    if (cost > 0) {
      await db.from("users").update({ points: user.points - cost }).eq("id", user.id);
    }
    const ins = await db.from("generations").insert({
      user_id: user.id, type: "image", model: entry.id,
      prompt: data.prompt, output_url: resultUrl, cost, status: "done",
      metadata: { provider: entry.provider, width: data.width, height: data.height },
    }).select("id").single();
    await deliverToTelegram(user.telegram_id, resultUrl, "image", data.prompt);
    return { id: ins.data?.id ?? "", url: resultUrl, cost, pointsLeft: user.points - cost };
  });

// ===== Video: deAPI (paid) | Leonardo (Veo / Kling / Seedance / Hailuo / LTX)
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      initData: z.string(),
      prompt: z.string().min(2).max(1000),
      model: z.string().default("deapi-ltx-video"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();
    const legacy: Record<string, string> = {
      deapi: "deapi-ltx-video",
      leonardo: "leo-kling-2-6",
    };
    const modelId = legacy[data.model] ?? data.model;
    const entry = getModel(modelId);
    if (!entry || entry.kind !== "video") throw new Error("unknown_model");

    const isSubscriber = Boolean((user as any).plan && (user as any).plan !== "free");
    const cost = entry.freeForAll || (isSubscriber && entry.unlimitedForSubs) ? 0 : entry.cost;
    if (cost > 0 && user.points < cost) throw new Error("insufficient_points");

    let videoUrl = "";

    if (entry.provider === "deapi") {
      const reqId = await deapiSubmit("/api/v2/videos/generations", {
        prompt: data.prompt,
        model: entry.providerModel ?? "Ltxv_13B_0_9_8_Distilled_FP8",
        width: 512,
        height: 512,
        frames: 81,
        fps: 24,
        steps: 8,
      });
      videoUrl = await deapiPoll(reqId, { intervalMs: 4000, maxAttempts: 90 });
    } else {
      const key = process.env.LEONARDO_API_KEY;
      if (!key) throw new Error("leonardo_not_configured");
      // Text-to-video via Leonardo v2 generations using the chosen model slug.
      const create = await fetch("https://cloud.leonardo.ai/api/rest/v2/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: entry.providerModel,
          public: false,
          parameters: {
            prompt: data.prompt,
            duration: 5,
            width: 1280,
            height: 720,
            mode: "RESOLUTION_720",
            prompt_enhance: "OFF",
          },
        }),
      });
      if (!create.ok) throw new Error(`leonardo_video_failed:${create.status}:${await create.text().catch(() => "")}`);
      const cj = await create.json();
      const genId =
        cj?.generate?.generationId ??
        cj?.sdGenerationJob?.generationId ??
        cj?.motionSvdGenerationJob?.generationId ??
        cj?.generationId ??
        cj?.data?.generationId ??
        cj?.generations?.[0]?.id;
      if (!genId) throw new Error("leonardo_video_no_id");
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const r = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, { headers: { Authorization: `Bearer ${key}` } });
        if (!r.ok) continue;
        const j = await r.json();
        const g = j?.generations_by_pk;
        const status = g?.status;
        if (status === "COMPLETE") {
          videoUrl =
            g?.generated_images?.[0]?.motionMP4URL ??
            g?.generated_images?.[0]?.url ??
            g?.videoUrl ??
            "";
          if (videoUrl) break;
        }
        if (status === "FAILED") throw new Error("leonardo_video_failed");
      }
      if (!videoUrl) throw new Error("leonardo_video_timeout");
    }

    if (cost > 0) {
      await db.from("users").update({ points: user.points - cost }).eq("id", user.id);
    }
    await db.from("generations").insert({
      user_id: user.id, type: "video", model: entry.id,
      prompt: data.prompt, output_url: videoUrl, cost, status: "done",
      metadata: { provider: entry.provider },
    });
    await deliverToTelegram(user.telegram_id, videoUrl, "video", data.prompt);
    return { url: videoUrl, cost, pointsLeft: user.points - cost };
  });

// ===== Music: deAPI ACE-Step (paid)
export const generateMusic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      initData: z.string(),
      prompt: z.string().min(2).max(500),
      duration: z.number().int().min(5).max(120).default(30),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();
    const cost = 20;
    if (user.points < cost) throw new Error("insufficient_points");

    const form = new FormData();
    form.append("caption", data.prompt);
    form.append("model", "ACE-Step-v1.5-turbo");
    form.append("lyrics", "[Instrumental]");
    form.append("duration", String(data.duration));
    form.append("inference_steps", "8");
    form.append("guidance_scale", "7");
    form.append("format", "mp3");
    const reqId = await deapiSubmitForm("/api/v2/audio/music", form);
    const audioUrl = await deapiPoll(reqId, { intervalMs: 3000, maxAttempts: 60 });

    await db.from("users").update({ points: user.points - cost }).eq("id", user.id);
    await db.from("generations").insert({
      user_id: user.id, type: "music", model: "ACE-Step-v1.5-turbo",
      prompt: data.prompt, output_url: audioUrl, cost, status: "done",
      metadata: { provider: "deapi", duration: data.duration },
    });
    await deliverToTelegram(user.telegram_id, audioUrl, "music", data.prompt);
    return { url: audioUrl, cost, pointsLeft: user.points - cost };
  });
