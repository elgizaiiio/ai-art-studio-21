import { createFileRoute } from "@tanstack/react-router";

const CHAT_COST = 0; // Chat is free
const SYSTEM_PROMPT = "You are Gram AI, a helpful, concise assistant inside a Telegram Mini App. Answer clearly. When useful, format with short bullets or short code blocks. Default to the user's language.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { initData?: string; messages?: Array<{ role: string; content: string }> };
          if (!body.initData || !Array.isArray(body.messages)) {
            return new Response("bad_request", { status: 400 });
          }

          const { requireUser } = await import("@/lib/telegram-auth.server");
          const { getAdmin } = await import("@/lib/supabase-admin.server");
          const user = await requireUser(body.initData);
          if (CHAT_COST > 0 && user.points < CHAT_COST) {
            return new Response(JSON.stringify({ error: "insufficient_points" }), { status: 402, headers: { "Content-Type": "application/json" } });
          }

          const apiKey = process.env.DASHSCOPE_API_KEY;
          if (!apiKey) return new Response("dashscope_api_key_not_configured", { status: 500 });

          // Qwen via Alibaba DashScope (OpenAI-compatible). qwen-turbo = fastest.
          const upstream = await fetch(
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "qwen-turbo",
                stream: true,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  ...body.messages.map((m) => ({ role: m.role, content: m.content })),
                ],
              }),
            },
          );

          if (!upstream.ok || !upstream.body) {
            const txt = await upstream.text();
            if (upstream.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "Content-Type": "application/json" } });
            if (upstream.status === 402) return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { "Content-Type": "application/json" } });
            return new Response(`upstream_error:${upstream.status}:${txt}`, { status: 502 });
          }

          // Chat is free — no charge.
          void getAdmin; void user;

          // Pass through SSE-ish stream as plain text deltas
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = "";

          const stream = new ReadableStream({
            async pull(controller) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); return; }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const json = JSON.parse(payload);
                  const delta = json?.choices?.[0]?.delta?.content;
                  if (delta) controller.enqueue(encoder.encode(delta));
                } catch {}
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
