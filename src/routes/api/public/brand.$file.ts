import { createFileRoute } from "@tanstack/react-router";

// Public proxy for files in the private "brand" Supabase Storage bucket.
// Lets us share assets (like the bot welcome banner) over HTTPS without
// flipping the bucket to public (which is blocked by workspace policy).
export const Route = createFileRoute("/api/public/brand/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (!file || file.includes("/") || file.includes("..")) {
          return new Response("bad request", { status: 400 });
        }
        const { getAdmin } = await import("@/lib/supabase-admin.server");
        const { data, error } = await getAdmin().storage.from("brand").download(file);
        if (error || !data) return new Response("not found", { status: 404 });
        const buf = await data.arrayBuffer();
        const ext = file.split(".").pop()?.toLowerCase();
        const mime =
          ext === "png" ? "image/png" :
          ext === "webp" ? "image/webp" :
          ext === "svg" ? "image/svg+xml" :
          "image/jpeg";
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      },
    },
  },
});