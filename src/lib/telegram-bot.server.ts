// Direct Telegram Bot API helpers (server-only)
const API = "https://api.telegram.org";

function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("missing_bot_token");
  return t;
}

export async function tgSendMessage(chatId: number | string, text: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`tg_send_failed:${res.status}:${JSON.stringify(j)}`);
  return j.result;
}

// Answer a callback_query (removes loading spinner on button)
export async function tgAnswerCallback(callbackId: string, text?: string, opts: Record<string, unknown> = {}) {
  try {
    await fetch(`${API}/bot${token()}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text, ...opts }),
    });
  } catch {}
}

// Edit ONLY the inline keyboard of an existing message (keeps text intact)
export async function tgEditReplyMarkup(chatId: number | string, messageId: number, reply_markup: unknown) {
  try {
    await fetch(`${API}/bot${token()}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup }),
    });
  } catch {}
}

// Delete a message (admin "close" button)
export async function tgDeleteMessage(chatId: number | string, messageId: number) {
  try {
    await fetch(`${API}/bot${token()}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch {}
}

// Edit a previously-sent text message. Used for streaming.
export async function tgEditMessage(chatId: number | string, messageId: number, text: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/bot${token()}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...opts }),
  });
  return res.json().catch(() => ({}));
}

// Send a video by URL.
export async function tgSendVideo(chatId: number | string, videoUrl: string, caption?: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/bot${token()}/sendVideo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, video: videoUrl, caption, ...opts }),
  });
  return res.json().catch(() => ({}));
}

export async function tgSendAudio(chatId: number | string, audioUrl: string, caption?: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/bot${token()}/sendAudio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, audio: audioUrl, caption, ...opts }),
  });
  return res.json().catch(() => ({}));
}

export async function tgSendVoice(chatId: number | string, voiceUrl: string, caption?: string, opts: Record<string, unknown> = {}) {
  const res = await fetch(`${API}/bot${token()}/sendVoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, voice: voiceUrl, caption, ...opts }),
  });
  return res.json().catch(() => ({}));
}

// Get chat member status (subscription verification).
export async function tgGetChatMember(chatId: string | number, userId: number): Promise<string | null> {
  try {
    const res = await fetch(`${API}/bot${token()}/getChatMember?chat_id=${encodeURIComponent(String(chatId))}&user_id=${userId}`);
    const j: any = await res.json();
    return j?.result?.status ?? null;
  } catch { return null; }
}

// Admin telegram IDs (hard-coded per spec).
export const ADMIN_TG_IDS: number[] = [6657246146, 5630740075];

export function isAdmin(telegramId: number | string | undefined | null): boolean {
  if (telegramId == null) return false;
  const n = Number(telegramId);
  return ADMIN_TG_IDS.includes(n);
}

// Broadcast a short notice to every admin.
export async function tgNotifyAdmins(text: string, opts: Record<string, unknown> = {}) {
  await Promise.all(ADMIN_TG_IDS.map((id) => tgSendMessage(id, text, opts).catch(() => null)));
}

// Show "typing…" indicator in the chat. Auto-expires after ~5 seconds on
// Telegram's side, so call again for long generations.
export async function tgSendChatAction(chatId: number | string, action = "typing") {
  try {
    await fetch(`${API}/bot${token()}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {}
}

export async function tgSendPhoto(
  chatId: number | string,
  photoUrl: string,
  caption?: string,
  opts: Record<string, unknown> = {},
) {
  const res = await fetch(`${API}/bot${token()}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, ...opts }),
  });
  return res.json().catch(() => ({}));
}

// Send a photo by uploading raw bytes via multipart (no public URL needed).
export async function tgSendPhotoBytes(
  chatId: number | string,
  bytes: ArrayBuffer,
  filename: string,
  mime: string,
  caption?: string,
  opts: Record<string, unknown> = {},
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  for (const [k, v] of Object.entries(opts)) {
    form.append(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  form.append("photo", blob, filename);
  const res = await fetch(`${API}/bot${token()}/sendPhoto`, { method: "POST", body: form });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(`tg_photo_failed:${res.status}:${JSON.stringify(j)}`);
  return j.result;
}

export async function tgGetFileBytes(fileId: string): Promise<{ bytes: ArrayBuffer; filename: string; mime: string }> {
  const metaRes = await fetch(`${API}/bot${token()}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = await metaRes.json().catch(() => ({}));
  const filePath = meta?.result?.file_path as string | undefined;
  if (!metaRes.ok || !meta?.ok || !filePath) {
    throw new Error(`tg_get_file_failed:${metaRes.status}:${JSON.stringify(meta)}`);
  }

  const fileRes = await fetch(`${API}/file/bot${token()}/${filePath}`);
  if (!fileRes.ok) {
    throw new Error(`tg_download_file_failed:${fileRes.status}`);
  }

  const filename = filePath.split("/").pop() || `${fileId}.jpg`;
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    "image/jpeg";

  return {
    bytes: await fileRes.arrayBuffer(),
    filename,
    mime,
  };
}

export async function tgGetFileUrl(fileId: string): Promise<{ url: string; filename: string; mime: string }> {
  const metaRes = await fetch(`${API}/bot${token()}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = await metaRes.json().catch(() => ({}));
  const filePath = meta?.result?.file_path as string | undefined;
  if (!metaRes.ok || !meta?.ok || !filePath) {
    throw new Error(`tg_get_file_failed:${metaRes.status}:${JSON.stringify(meta)}`);
  }
  const filename = filePath.split("/").pop() || fileId;
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    ext === "gif" ? "image/gif" :
    ext === "mp4" ? "video/mp4" :
    ext === "mp3" ? "audio/mpeg" :
    ext === "ogg" ? "audio/ogg" :
    ext === "wav" ? "audio/wav" :
    ext === "pdf" ? "application/pdf" :
    "application/octet-stream";
  return {
    url: `${API}/file/bot${token()}/${filePath}`,
    filename,
    mime,
  };
}

// Non-streaming completion via Lovable AI Gateway
export async function aiComplete(
  messages: Array<{ role: string; content: string }>,
  system?: string,
  model?: string,
) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("missing_lovable_api_key");
  const sys = system ?? defaultSystem();
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: sys }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`ai_failed:${res.status}`);
  const j = await res.json();
  return (j?.choices?.[0]?.message?.content ?? "").toString();
}

// Streaming completion via Lovable AI Gateway (SSE). Calls `onDelta(full)` with
// the accumulated text on every token. Returns the final full text.
export async function aiStream(
  messages: Array<{ role: string; content: string }>,
  system: string,
  model: string,
  onDelta: (full: string) => Promise<void> | void,
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("missing_lovable_api_key");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`ai_stream_failed:${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) {
          full += delta;
          try { await onDelta(full); } catch {}
        }
      } catch {}
    }
  }
  return full;
}

export type Mode = "chat" | "slides" | "docs" | "research";

const LANGUAGE_RULE =
  "Always detect the user's language and dialect from their message and reply in that SAME language and dialect (Arabic users: match their exact dialect — Egyptian, Gulf, Levantine, Maghrebi, MSA, etc.). Never switch languages. Use Markdown for emphasis: **bold** for key terms, _italic_ for nuance. Keep answers concise and well-structured.";

function defaultSystem(name = "Gram AI") {
  return `You are ${name}, a helpful assistant inside the Gram AI app on Telegram. ${LANGUAGE_RULE}`;
}

// Per-model display name → identity prompt. The user sees "Gram 1.0", "GPT-5", etc.
// but the gateway routes to a real backing model.
export const MODEL_PROFILES: Record<string, { name: string; model: string }> = {
  "gram-1": { name: "Gram 1.0", model: "google/gemini-3.5-flash" },
  "gpt-5": { name: "GPT-5", model: "openai/gpt-5" },
  "gemini-3-pro": { name: "Gemini 3 Pro", model: "google/gemini-3.1-pro-preview" },
  "claude-opus": { name: "Claude Opus 4.8", model: "openai/gpt-5.4" },
  "claude-sonnet": { name: "Claude Sonnet 4.6", model: "openai/gpt-5.4-mini" },
};

export function systemForModel(modelKey: string, mode: Mode = "chat"): { system: string; model: string; name: string } {
  const p = MODEL_PROFILES[modelKey] ?? MODEL_PROFILES["gram-1"];
  let extra = "";
  if (mode === "slides")
    extra = " Output a clean slide deck in Markdown using `---` between slides. Each slide: short title (## H2) and 3–6 concise bullets. No preamble.";
  else if (mode === "docs")
    extra = " Produce a clean, well-structured Markdown document with headings, bullets, and short paragraphs. No preamble.";
  else if (mode === "research")
    extra = " Produce a structured research brief: **Summary**, **Key Findings** (bulleted), **Details** (sections), **Sources/Notes**. Be specific and concise.";
  return {
    name: p.name,
    model: p.model,
    system: `You are ${p.name}, a helpful assistant inside the Gram AI app on Telegram. ${LANGUAGE_RULE}${extra}`,
  };
}

export function systemFor(mode: Mode): string {
  return systemForModel("gram-1", mode).system;
}

// Convert lightweight Markdown to Telegram-safe HTML so **bold** / _italic_ /
// `code` / ```block``` actually render as bold/italic/mono in the bot reply.
export function mdToTelegramHtml(input: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Pull out code blocks first
  const blocks: string[] = [];
  let s = input.replace(/```([\s\S]*?)```/g, (_m, code) => {
    blocks.push(code);
    return `\u0000CB${blocks.length - 1}\u0000`;
  });
  const inline: string[] = [];
  s = s.replace(/`([^`\n]+)`/g, (_m, c) => {
    inline.push(c);
    return `\u0000CI${inline.length - 1}\u0000`;
  });
  s = esc(s);
  // **bold**  and __bold__
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/__([^_\n]+)__/g, "<b>$1</b>");
  // *italic* / _italic_
  s = s.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, "$1<i>$2</i>");
  s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<i>$2</i>");
  // Headings: # / ## → bold line
  s = s.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, "<b>$1</b>");
  // Restore code spans/blocks
  s = s.replace(/\u0000CI(\d+)\u0000/g, (_m, i) => `<code>${esc(inline[Number(i)])}</code>`);
  s = s.replace(/\u0000CB(\d+)\u0000/g, (_m, i) => `<pre>${esc(blocks[Number(i)])}</pre>`);
  return s;
}
