// Interactive Telegram in-bot admin panel.
// Entry: /111 → inline-keyboard menu. All actions are buttons; data entry
// uses `force_reply` so admins just type plain text in the reply.
import { getAdmin } from "@/lib/supabase-admin.server";
import {
  tgSendMessage,
  tgAnswerCallback,
  tgEditMessage,
  tgDeleteMessage,
  tgGetFileBytes,
  MODEL_PROFILES,
} from "@/lib/telegram-bot.server";

// Markers we put in force_reply prompts so we can identify a reply later.
const TAG = {
  addtask: "‹addtask›",
  edittask: "‹edittask›",
  deltask: "‹deltask›",
  addmodel: "‹addmodel›",
  delmodel: "‹delmodel›",
  broadcast: "‹broadcast›",
  addtpl: "‹addtpl›",
  edittpl: "‹edittpl›",
} as const;

function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: "📊 Stats", callback_data: "a:stats" },
        { text: "🚀 /start hits", callback_data: "a:starts" },
      ],
      [
        { text: "📋 Tasks", callback_data: "a:tasks" },
        { text: "➕ Add task", callback_data: "a:addtask" },
      ],
      [
        { text: "🖼 Templates", callback_data: "a:tpls" },
        { text: "➕ Add template", callback_data: "a:addtpl" },
      ],
      [
        { text: "🤖 Models", callback_data: "a:models" },
        { text: "➕ Add model", callback_data: "a:addmodel" },
      ],
      [
        { text: "📢 Broadcast", callback_data: "a:broadcast" },
        { text: "❌ Close", callback_data: "a:close" },
      ],
    ],
  };
}

function backRow(extra: Array<Array<{ text: string; callback_data: string }>> = []) {
  return { inline_keyboard: [...extra, [{ text: "« Menu", callback_data: "a:menu" }]] };
}

export async function openAdminPanel(chatId: number) {
  await tgSendMessage(chatId, "<b>👑 Gram Admin</b>\nPick a section:", { reply_markup: mainMenu() });
}

async function renderStats(chatId: number, messageId: number) {
  const db = getAdmin();
  const [usersRes, gensRes, txRes, startsRes, tasksRes] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("generations").select("id", { count: "exact", head: true }),
    db.from("transactions").select("amount_usd").eq("status", "completed"),
    db.from("bot_events").select("id", { count: "exact", head: true }).eq("event", "start"),
    db.from("tasks").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  const revenue = (txRes.data ?? []).reduce((s, r: any) => s + Number(r.amount_usd ?? 0), 0);
  const text = [
    "<b>📊 Site Stats</b>",
    "",
    `👥 Users: <b>${usersRes.count ?? 0}</b>`,
    `🎨 Generations: <b>${gensRes.count ?? 0}</b>`,
    `🚀 /start hits: <b>${startsRes.count ?? 0}</b>`,
    `📋 Active tasks: <b>${tasksRes.count ?? 0}</b>`,
    `💰 Revenue: <b>$${revenue.toFixed(2)}</b>`,
  ].join("\n");
  await tgEditMessage(chatId, messageId, text, { reply_markup: backRow() });
}

async function renderStarts(chatId: number, messageId: number) {
  const db = getAdmin();
  const all = await db.from("bot_events").select("id", { count: "exact", head: true }).eq("event", "start");
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const today = await db.from("bot_events").select("id", { count: "exact", head: true }).eq("event", "start").gte("created_at", since.toISOString());
  const week = new Date(Date.now() - 7 * 86400000);
  const w = await db.from("bot_events").select("id", { count: "exact", head: true }).eq("event", "start").gte("created_at", week.toISOString());
  await tgEditMessage(chatId, messageId, [
    "<b>🚀 /start presses</b>",
    "",
    `All-time: <b>${all.count ?? 0}</b>`,
    `Last 7 days: <b>${w.count ?? 0}</b>`,
    `Today: <b>${today.count ?? 0}</b>`,
  ].join("\n"), { reply_markup: backRow() });
}

async function renderTasks(chatId: number, messageId: number) {
  const db = getAdmin();
  const { data } = await db.from("tasks").select("id,title,reward,active").order("sort_order").limit(20);
  const rows = (data ?? []).flatMap((t: any) => [[
    { text: `${t.active ? "✅" : "⛔"} ${t.title.slice(0, 28)} · ${t.reward}p`, callback_data: `a:task:${t.id.slice(0, 8)}` },
  ]]);
  rows.push([{ text: "➕ Add task", callback_data: "a:addtask" }]);
  rows.push([{ text: "« Menu", callback_data: "a:menu" }]);
  await tgEditMessage(chatId, messageId, "<b>📋 Tasks</b>\nTap a task to manage.", { reply_markup: { inline_keyboard: rows } });
}

async function renderTaskDetail(chatId: number, messageId: number, idPrefix: string) {
  const db = getAdmin();
  const { data: rows } = await db.from("tasks").select("*").like("id", `${idPrefix}%`).limit(1);
  const t: any = rows?.[0];
  if (!t) return tgEditMessage(chatId, messageId, "Task not found.", { reply_markup: backRow() });
  const text = [
    `<b>${t.title}</b>`,
    t.description ? `<i>${t.description}</i>` : "",
    "",
    `🔗 ${t.link}`,
    `🏆 Reward: <b>${t.reward}</b> pts`,
    `Verify: <code>${t.verify_type}</code>${t.verify_target ? " · " + t.verify_target : ""}`,
    `Status: ${t.active ? "<b>active</b>" : "<b>inactive</b>"}`,
  ].filter(Boolean).join("\n");
  await tgEditMessage(chatId, messageId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t.active ? "⛔ Deactivate" : "✅ Activate", callback_data: `a:toggle:${idPrefix}` },
          { text: "🗑 Delete", callback_data: `a:del:${idPrefix}` },
        ],
        [{ text: "« Tasks", callback_data: "a:tasks" }],
      ],
    },
  });
}

async function renderModels(chatId: number, messageId: number) {
  const rows = Object.entries(MODEL_PROFILES).map(([k, v]) => [
    { text: `${v.name} (${k})`, callback_data: `a:delmodel:${k}` },
  ]);
  rows.push([{ text: "➕ Add model", callback_data: "a:addmodel" }]);
  rows.push([{ text: "« Menu", callback_data: "a:menu" }]);
  await tgEditMessage(chatId, messageId, "<b>🤖 Models</b>\nTap to remove.", { reply_markup: { inline_keyboard: rows } });
}

async function renderTemplates(chatId: number, messageId: number) {
  const db = getAdmin();
  const { data } = await db.from("templates").select("id,title,type,is_active").order("created_at", { ascending: false }).limit(30);
  const rows: any[] = (data ?? []).map((t: any) => [
    { text: `${t.is_active ? "🖼" : "⛔"} [${t.type}] ${String(t.title).slice(0, 28)}`, callback_data: `a:tpl:${t.id.slice(0, 8)}` },
  ]);
  rows.push([{ text: "➕ Add template", callback_data: "a:addtpl" }]);
  rows.push([{ text: "« Menu", callback_data: "a:menu" }]);
  await tgEditMessage(chatId, messageId, "<b>🖼 Templates</b>\nTap a template to manage.", { reply_markup: { inline_keyboard: rows } });
}

async function renderTemplateDetail(chatId: number, messageId: number, idPrefix: string) {
  const db = getAdmin();
  const { data: rows } = await db.from("templates").select("*").like("id", `${idPrefix}%`).limit(1);
  const t: any = rows?.[0];
  if (!t) return tgEditMessage(chatId, messageId, "Template not found.", { reply_markup: backRow() });
  const text = [
    `<b>${t.title}</b>`,
    `Type: <code>${t.type}</code>`,
    t.preview_url ? `🖼 ${t.preview_url}` : "(no image)",
    "",
    `<i>Prompt:</i>`,
    `<code>${(t.prompt ?? "").toString().slice(0, 800)}</code>`,
    `Status: ${t.is_active ? "<b>active</b>" : "<b>inactive</b>"}`,
  ].join("\n");
  await tgEditMessage(chatId, messageId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✏️ Edit", callback_data: `a:tple:${idPrefix}` },
          { text: t.is_active ? "⛔ Deactivate" : "✅ Activate", callback_data: `a:tpltog:${idPrefix}` },
          { text: "🗑 Delete", callback_data: `a:tpld:${idPrefix}` },
        ],
        [{ text: "« Templates", callback_data: "a:tpls" }],
      ],
    },
  });
}

function askForReply(chatId: number, prompt: string, tag: string) {
  return tgSendMessage(chatId, `${prompt}\n\n${tag}`, {
    reply_markup: { force_reply: true, selective: true, input_field_placeholder: "Type and send" },
  });
}

function splitTemplatePayload(payload: string) {
  return payload.split("|").map((s) => s.trim());
}

async function uploadTelegramPhotoToTemplateBucket(fileId: string) {
  const db = getAdmin();
  const { bytes, filename, mime } = await tgGetFileBytes(fileId);
  const path = `telegram-templates/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  const upload = await db.storage.from("brand").upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (upload.error) throw new Error(upload.error.message);
  return `/api/public/brand/${path}`;
}

// ---------- Public entry points ----------

export async function handleAdminCallback(cb: any): Promise<void> {
  const chatId = cb.message?.chat?.id as number;
  const messageId = cb.message?.message_id as number;
  const data: string = cb.data ?? "";
  await tgAnswerCallback(cb.id);

  if (data === "a:menu") {
    return void tgEditMessage(chatId, messageId, "<b>👑 Gram Admin</b>\nPick a section:", { reply_markup: mainMenu() });
  }
  if (data === "a:close") return void tgDeleteMessage(chatId, messageId);
  if (data === "a:stats") return void renderStats(chatId, messageId);
  if (data === "a:starts") return void renderStarts(chatId, messageId);
  if (data === "a:tasks") return void renderTasks(chatId, messageId);
  if (data === "a:models") return void renderModels(chatId, messageId);
  if (data === "a:tpls") return void renderTemplates(chatId, messageId);
  if (data === "a:addtpl")
    return void askForReply(
      chatId,
      "<b>➕ Add template</b>\nReply with: <code>type | title | image_url | prompt</code>\n<i>type</i> = <code>image</code> or <code>video</code>.\nExample:\n<code>image | Cyberpunk portrait | https://… | A neon cyberpunk portrait, ultra detailed</code>",
      TAG.addtpl,
    );
  if (data === "a:addtask")
    return void askForReply(
      chatId,
      "<b>➕ Add task</b>\nReply with: <code>title | link | reward | image_url | verify_type | verify_target</code>\nExample:\n<code>Join Megsy | https://t.me/megsyai | 6 | https://megsyai.com/logo.png | telegram | @megsyai</code>",
      TAG.addtask,
    );
  if (data === "a:addmodel")
    return void askForReply(chatId, "<b>➕ Add model</b>\nReply: <code>key | Display Name | backend-model</code>", TAG.addmodel);
  if (data === "a:broadcast")
    return void askForReply(chatId, "<b>📢 Broadcast</b>\nReply with the message to send to ALL users.", TAG.broadcast);

  if (data.startsWith("a:task:")) return void renderTaskDetail(chatId, messageId, data.slice("a:task:".length));
  if (data.startsWith("a:toggle:")) {
    const idPrefix = data.slice("a:toggle:".length);
    const db = getAdmin();
    const { data: rows } = await db.from("tasks").select("id,active").like("id", `${idPrefix}%`).limit(1);
    if (rows?.[0]) {
      await (db.from("tasks") as any).update({ active: !rows[0].active }).eq("id", rows[0].id);
    }
    return void renderTaskDetail(chatId, messageId, idPrefix);
  }
  if (data.startsWith("a:del:")) {
    const idPrefix = data.slice("a:del:".length);
    const db = getAdmin();
    const { data: rows } = await db.from("tasks").select("id").like("id", `${idPrefix}%`).limit(1);
    if (rows?.[0]) await db.from("tasks").delete().eq("id", rows[0].id);
    return void renderTasks(chatId, messageId);
  }
  if (data.startsWith("a:delmodel:")) {
    const key = data.slice("a:delmodel:".length);
    if (key in MODEL_PROFILES) delete (MODEL_PROFILES as any)[key];
    return void renderModels(chatId, messageId);
  }
  if (data.startsWith("a:tpl:")) return void renderTemplateDetail(chatId, messageId, data.slice("a:tpl:".length));
  if (data.startsWith("a:tpltog:")) {
    const idPrefix = data.slice("a:tpltog:".length);
    const db = getAdmin();
    const { data: rows } = await db.from("templates").select("id,is_active").like("id", `${idPrefix}%`).limit(1);
    if (rows?.[0]) await (db.from("templates") as any).update({ is_active: !rows[0].is_active }).eq("id", rows[0].id);
    return void renderTemplateDetail(chatId, messageId, idPrefix);
  }
  if (data.startsWith("a:tpld:")) {
    const idPrefix = data.slice("a:tpld:".length);
    const db = getAdmin();
    const { data: rows } = await db.from("templates").select("id").like("id", `${idPrefix}%`).limit(1);
    if (rows?.[0]) await db.from("templates").delete().eq("id", rows[0].id);
    return void renderTemplates(chatId, messageId);
  }
  if (data.startsWith("a:tple:")) {
    const idPrefix = data.slice("a:tple:".length);
    return void askForReply(
      chatId,
      `<b>✏️ Edit template</b> <code>${idPrefix}</code>\nReply with: <code>image_url | prompt</code> (use <code>-</code> to keep current).`,
      `${TAG.edittpl}:${idPrefix}`,
    );
  }
}

// Called when admin sends a regular message that is a reply to one of our
// force_reply prompts (identified by the trailing tag we put in the prompt).
export async function handleAdminReply(chatId: number, replyToText: string, payload: string): Promise<boolean> {
  const db = getAdmin();

  if (replyToText.includes(TAG.addtask)) {
    const parts = splitTemplatePayload(payload);
    if (parts.length < 3) {
      await tgSendMessage(chatId, "❌ Need at least: title | link | reward");
      return true;
    }
    const [title, link, rewardStr, image_url, verify_type, verify_target] = parts;
    const reward = Number(rewardStr) || 5;
    const ins = await db.from("tasks").insert({
      title, link, reward,
      image_url: image_url || null,
      verify_type: verify_type || "manual",
      verify_target: verify_target || null,
    }).select("id").single();
    await tgSendMessage(chatId, ins.error ? `❌ ${ins.error.message}` : `✅ Added task <code>${ins.data!.id.slice(0, 8)}</code>`, { reply_markup: mainMenu() });
    return true;
  }

  if (replyToText.includes(TAG.addtpl)) {
    const parts = splitTemplatePayload(payload);
    if (parts.length < 4) {
      await tgSendMessage(chatId, "❌ Need: type | title | image_url | prompt");
      return true;
    }
    const [type, title, image_url, ...rest] = parts;
    const prompt = rest.join(" | ");
    if (!["image", "video", "music"].includes(type)) {
      await tgSendMessage(chatId, "❌ type must be image, video, or music");
      return true;
    }
    const ins = await db.from("templates").insert({
      type, title,
      preview_url: image_url || null,
      prompt,
      is_active: true,
    }).select("id").single();
    await tgSendMessage(chatId, ins.error ? `❌ ${ins.error.message}` : `✅ Added template <code>${ins.data!.id.slice(0, 8)}</code>`, { reply_markup: mainMenu() });
    return true;
  }

  if (replyToText.includes(TAG.edittpl)) {
    const m = replyToText.match(/‹edittpl›:([0-9a-f]{4,})/);
    const idPrefix = m?.[1];
    if (!idPrefix) return false;
    const parts = payload.split("|").map((s) => s.trim());
    const [image_url, ...rest] = parts;
    const prompt = rest.join(" | ");
    const patch: Record<string, unknown> = {};
    if (image_url && image_url !== "-") patch.preview_url = image_url;
    if (prompt && prompt !== "-") patch.prompt = prompt;
    if (!Object.keys(patch).length) {
      await tgSendMessage(chatId, "Nothing to update.");
      return true;
    }
    const { data: rows } = await db.from("templates").select("id").like("id", `${idPrefix}%`).limit(1);
    if (!rows?.[0]) {
      await tgSendMessage(chatId, "Template not found.");
      return true;
    }
    const up = await (db.from("templates") as any).update(patch).eq("id", rows[0].id);
    await tgSendMessage(chatId, up.error ? `❌ ${up.error.message}` : `✅ Updated`, { reply_markup: mainMenu() });
    return true;
  }

  if (replyToText.includes(TAG.addmodel)) {
    const parts = payload.split("|").map((s) => s.trim());
    if (parts.length < 3) {
      await tgSendMessage(chatId, "❌ Need: key | Display Name | backend-model-id");
      return true;
    }
    const [key, name, backend] = parts;
    (MODEL_PROFILES as any)[key] = { name, model: backend };
    await tgSendMessage(chatId, `✅ Added model <code>${key}</code>`, { reply_markup: mainMenu() });
    return true;
  }

  if (replyToText.includes(TAG.broadcast)) {
    const { data: users } = await db.from("users").select("telegram_id").not("telegram_id", "is", null);
    let ok = 0, fail = 0;
    for (const u of users ?? []) {
      try { await tgSendMessage((u as any).telegram_id, payload); ok++; }
      catch { fail++; }
    }
    await tgSendMessage(chatId, `📢 Broadcast done.\nSent: <b>${ok}</b> · Failed: <b>${fail}</b>`, { reply_markup: mainMenu() });
    return true;
  }

  return false;
}

export async function handleAdminPhotoReply(chatId: number, replyToText: string, photo: Array<{ file_id: string }>, caption?: string | null): Promise<boolean> {
  const db = getAdmin();
  const fileId = photo.at(-1)?.file_id;
  if (!fileId) return false;

  if (replyToText.includes(TAG.addtpl)) {
    const parts = splitTemplatePayload(caption ?? "");
    if (parts.length < 3) {
      await tgSendMessage(chatId, "❌ Send the photo with caption: <code>type | title | prompt</code>");
      return true;
    }
    const [type, title, ...rest] = parts;
    const prompt = rest.join(" | ");
    if (!prompt) {
      await tgSendMessage(chatId, "❌ Prompt is required.");
      return true;
    }
    if (!["image", "video", "music"].includes(type)) {
      await tgSendMessage(chatId, "❌ type must be image, video, or music");
      return true;
    }
    try {
      const previewUrl = await uploadTelegramPhotoToTemplateBucket(fileId);
      const ins = await db.from("templates").insert({
        type,
        title,
        preview_url: previewUrl,
        prompt,
        is_active: true,
      }).select("id").single();
      await tgSendMessage(chatId, ins.error ? `❌ ${ins.error.message}` : `✅ Added template <code>${ins.data!.id.slice(0, 8)}</code>`, { reply_markup: mainMenu() });
    } catch (error) {
      await tgSendMessage(chatId, `❌ ${error instanceof Error ? error.message : "upload_failed"}`);
    }
    return true;
  }

  if (replyToText.includes(TAG.edittpl)) {
    const m = replyToText.match(/‹edittpl›:([0-9a-f]{4,})/);
    const idPrefix = m?.[1];
    if (!idPrefix) return false;
    const prompt = (caption ?? "").trim();
    try {
      const previewUrl = await uploadTelegramPhotoToTemplateBucket(fileId);
      const { data: rows } = await db.from("templates").select("id").like("id", `${idPrefix}%`).limit(1);
      if (!rows?.[0]) {
        await tgSendMessage(chatId, "Template not found.");
        return true;
      }
      const patch: Record<string, unknown> = { preview_url: previewUrl };
      if (prompt && prompt !== "-") patch.prompt = prompt;
      const up = await (db.from("templates") as any).update(patch).eq("id", rows[0].id);
      await tgSendMessage(chatId, up.error ? `❌ ${up.error.message}` : "✅ Updated", { reply_markup: mainMenu() });
    } catch (error) {
      await tgSendMessage(chatId, `❌ ${error instanceof Error ? error.message : "upload_failed"}`);
    }
    return true;
  }

  return false;
}