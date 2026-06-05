import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram-debug")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, route: "telegram-debug" });
      },
      POST: async ({ request }) => {
        const body = await request.text().catch(() => "");
        return Response.json({ ok: true, route: "telegram-debug", body });
      },
    },
  },
});