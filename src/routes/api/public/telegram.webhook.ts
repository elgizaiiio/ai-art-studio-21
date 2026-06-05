import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
          const { createHash } = await import("crypto");
          const expected = createHash("sha256").update("gram-webhook:" + (process.env.TELEGRAM_BOT_TOKEN ?? "")).digest("hex");
          if (secret !== expected) return new Response("unauthorized", { status: 401 });

          const update = await request.json() as any;
          // Handle Telegram Stars payment flow first
          if (update.pre_checkout_query) {
            const token = process.env.TELEGRAM_BOT_TOKEN!;
            await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
            });
            return Response.json({ ok: true });
          }

          // Admin inline-keyboard callback handling
          if (update.callback_query) {
            const { isAdmin } = await import("@/lib/telegram-bot.server");
            const { handleAdminCallback } = await import("@/lib/telegram-admin.server");
            const fromId = update.callback_query.from?.id;
            if (isAdmin(fromId)) {
              try { await handleAdminCallback(update.callback_query); } catch {}
            } else {
              const { tgAnswerCallback } = await import("@/lib/telegram-bot.server");
              await tgAnswerCallback(update.callback_query.id, "Not authorized");
            }
            return Response.json({ ok: true });
          }

          const msg = update.message ?? update.edited_message;
          if (!msg?.chat?.id) return Response.json({ ok: true });

          // successful_payment (Stars / Telegram Payments)
          if (msg.successful_payment) {
            try {
              const sp = msg.successful_payment as any;
              const payload = JSON.parse(sp.invoice_payload ?? "{}");
              const { getAdmin } = await import("@/lib/supabase-admin.server");
              const { tgSendMessage, tgNotifyAdmins } = await import("@/lib/telegram-bot.server");
              const supa = getAdmin();
              const { PLAN_PRICE_USD } = await import("@/lib/payments.functions");
              const credits = (PLAN_PRICE_USD as any)[payload.plan]?.credits ?? 0;
              if (payload.user_id) {
                await supa.from("transactions").insert({
                  user_id: payload.user_id,
                  kind: "subscription",
                  method: "stars",
                  amount_stars: sp.total_amount,
                  amount_points: credits,
                  external_id: sp.telegram_payment_charge_id,
                  status: "completed",
                  metadata: { plan: payload.plan, cycle: payload.cycle },
                });
                const { data: u } = await supa.from("users").select("points").eq("id", payload.user_id).maybeSingle();
                if (u) await supa.from("users").update({ points: (u.points ?? 0) + credits }).eq("id", payload.user_id);
              }
              await tgSendMessage(msg.chat.id, `✅ Payment received! +${credits} credits added.`);
              await tgNotifyAdmins(
                `💸 <b>New payment</b>\nMethod: <b>Stars</b>\nPlan: <b>${payload.plan}</b> · ${payload.cycle}\nAmount: <b>${sp.total_amount}⭐</b>\nUser id: <code>${payload.user_id}</code>`
              );
            } catch (e) {
              // swallow
            }
            return Response.json({ ok: true });
          }

          const { tgSendMessage, tgSendChatAction, tgEditMessage, aiStream, systemForModel, mdToTelegramHtml, isAdmin } = await import("@/lib/telegram-bot.server");
          const { openAdminPanel, handleAdminReply } = await import("@/lib/telegram-admin.server");
          const { getAdmin } = await import("@/lib/supabase-admin.server");
          const chatId = msg.chat.id as number;
          const text: string = (msg.text ?? "").toString();
          const from = msg.from ?? {};
          const langCode: string = (from.language_code ?? "").toString();

          await getAdmin().from("users").upsert({
            telegram_id: from.id ?? chatId,
            username: from.username ?? null,
            first_name: from.first_name ?? null,
            last_name: from.last_name ?? null,
            language_code: from.language_code ?? null,
            points: 50,
          }, { onConflict: "telegram_id", ignoreDuplicates: true });

          // Admin entry: /111 opens the interactive admin panel
          if (isAdmin(from.id) && (text === "/111" || text.startsWith("/111 "))) {
            await openAdminPanel(chatId);
            return Response.json({ ok: true });
          }
          // Admin reply-to-prompt handling (force_reply prompts)
          if (isAdmin(from.id) && msg.reply_to_message?.text && text) {
            const handled = await handleAdminReply(chatId, msg.reply_to_message.text, text);
            if (handled) return Response.json({ ok: true });
          }

          if (text.startsWith("/start")) {
            // Track /start press for admin stats
            try { await getAdmin().from("bot_events").insert({ telegram_id: from.id ?? chatId, event: "start", metadata: {} }); } catch {}
            const origin = (() => {
              const proto = request.headers.get("x-forwarded-proto") ?? "https";
              const host = request.headers.get("host") ?? "project--95395e69-8f2c-415e-995a-e5f4015731e7.lovable.app";
              return `${proto}://${host}`;
            })();
            const caption = [
              "<b>Welcome to Gram AI</b>",
              "",
              "Your all-in-one AI studio inside Telegram:",
              "<b>Image</b> — Nano Banana, FLUX.2 Pro, GPT Image 2, Seedream 4.5",
              "<b>Video</b> — Veo 3.1, Kling 2.6, Seedance 2.0, Hailuo",
              "<b>Chat</b> — GPT-5, Gemini 3 Pro, Claude",
              "<b>Slides · Docs · Deep Research</b>",
              "",
              "<b>Pro plan</b> = <i>Unlimited · 0 credits</i> on premium models.",
              "You start with <b>50 free credits</b>.",
            ].join("\n");
            const reply_markup = {
              inline_keyboard: [
                [{ text: "Open Gram AI", url: "https://t.me/Gramaiibot/App" }],
                [
                  { text: "Upgrade", web_app: { url: `${origin}/pricing` } },
                  { text: "Invite & earn", web_app: { url: `${origin}/referral` } },
                ],
                [{ text: "Templates", web_app: { url: `${origin}/templates/image` } }],
              ],
            };
            try {
              const { tgSendPhotoBytes } = await import("@/lib/telegram-bot.server");
              const { data: img } = await getAdmin().storage.from("brand").download("gram-start.jpg");
              if (!img) throw new Error("no_banner");
              const ab = await img.arrayBuffer();
              await tgSendPhotoBytes(chatId, ab, "gram-start.jpg", "image/jpeg", caption, { parse_mode: "HTML", reply_markup });
            } catch {
              await tgSendMessage(chatId, caption, { reply_markup });
            }
            return Response.json({ ok: true });
          }
          if (!text) {
            await tgSendMessage(chatId, "Send text and I'll reply ✨");
            return Response.json({ ok: true });
          }

          // Detect mode from keywords
          const lower = text.toLowerCase();
          const mode = lower.includes("slide") || lower.includes("سلايد") || lower.includes("شرائح") ? "slides"
            : lower.includes("doc") || lower.includes("وثيقة") || lower.includes("مستند") ? "docs"
            : lower.includes("deep research") || lower.includes("بحث عميق") ? "research"
            : "chat";

          const profile = systemForModel("gram-1", mode);
          const sys = profile.system + (langCode ? ` User's Telegram language code is "${langCode}" — prefer that locale unless their message clearly uses another language.` : "");
          await tgSendChatAction(chatId, "typing");
          // Streaming: post a placeholder, then edit it as tokens arrive.
          const placeholder = await tgSendMessage(chatId, "✍️ …");
          const messageId = (placeholder as any)?.message_id as number;
          let lastEdit = 0;
          let lastText = "";
          const editIfChanged = async (full: string) => {
            const now = Date.now();
            // Throttle to ~1 edit/sec, and only if content grew meaningfully
            if (now - lastEdit < 900 || full.length - lastText.length < 16) return;
            const out = mdToTelegramHtml(full).slice(0, 3800);
            if (out === lastText) return;
            lastText = out;
            lastEdit = now;
            await tgEditMessage(chatId, messageId, out, { parse_mode: "HTML" });
          };
          let full = "";
          try {
            full = await aiStream([{ role: "user", content: text }], sys, profile.model, editIfChanged);
          } catch (err) {
            const m = err instanceof Error ? err.message : "ai_error";
            await tgEditMessage(chatId, messageId, `⚠️ ${m}`);
            return Response.json({ ok: true });
          }
          const finalHtml = mdToTelegramHtml(full || "(empty)");
          // Final flush (split if too long)
          if (finalHtml.length <= 3800) {
            await tgEditMessage(chatId, messageId, finalHtml, { parse_mode: "HTML" });
          } else {
            await tgEditMessage(chatId, messageId, finalHtml.slice(0, 3800), { parse_mode: "HTML" });
            for (let i = 3800; i < finalHtml.length; i += 3800) {
              await tgSendMessage(chatId, finalHtml.slice(i, i + 3800), { parse_mode: "HTML" });
            }
          }
          return Response.json({ ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          return Response.json({ error: msg }, { status: 200 });
        }
      },
    },
  },
});
