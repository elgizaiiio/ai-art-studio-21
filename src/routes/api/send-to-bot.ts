import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/send-to-bot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { initData?: string; prompt?: string; mode?: "chat" | "slides" | "docs" | "research" };
          if (!body.initData || !body.prompt) return new Response("bad_request", { status: 400 });
          const mode = body.mode ?? "chat";

          const { requireUser } = await import("@/lib/telegram-auth.server");
          const { getAdmin } = await import("@/lib/supabase-admin.server");
          const { tgSendMessage, aiComplete, systemFor } = await import("@/lib/telegram-bot.server");
          const user = await requireUser(body.initData);
          if (user.points < 1) return new Response(JSON.stringify({ error: "insufficient_points" }), { status: 402 });

          const chatId = user.telegram_id;
          const label = mode === "chat" ? "💬" : mode === "slides" ? "🎞 Slides" : mode === "docs" ? "📄 Doc" : "🔎 Research";

          // Echo user prompt into the bot chat
          await tgSendMessage(chatId, `<b>${label}</b>\n${escapeHtml(body.prompt)}`);

          // Generate AI answer and send back into chat
          const answer = await aiComplete([{ role: "user", content: body.prompt }], systemFor(mode));
          // Telegram message limit is 4096 chars; chunk if needed
          const chunks = chunk(answer || "(empty response)", 3800);
          for (const c of chunks) await tgSendMessage(chatId, c, { parse_mode: undefined });

          await getAdmin().from("users").update({ points: Math.max(user.points - 1, 0) }).eq("id", user.id);
          return new Response(JSON.stringify({ ok: true, sent: chunks.length }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function chunk(s: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}
