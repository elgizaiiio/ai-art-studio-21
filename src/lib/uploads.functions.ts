import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Upload a base64-encoded image (taken straight from the phone camera/gallery)
// into the private `uploads` bucket and return a short-lived signed URL the
// generation models can fetch.
export const uploadPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      initData: z.string(),
      // "data:image/jpeg;base64,..." OR raw base64
      dataUrl: z.string().min(32).max(15_000_000),
      filename: z.string().min(1).max(120).default("upload.jpg"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();

    const m = data.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    const mime = m?.[1] ?? "image/jpeg";
    const b64 = m?.[2] ?? data.dataUrl;
    const bytes = Buffer.from(b64, "base64");
    const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${user.telegram_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const up = await db.storage.from("uploads").upload(path, bytes, { contentType: mime, upsert: false });
    if (up.error) throw new Error(`upload_failed:${up.error.message}`);

    const signed = await db.storage.from("uploads").createSignedUrl(path, 60 * 60 * 6);
    if (signed.error || !signed.data) throw new Error(`signed_url_failed`);
    return { path, url: signed.data.signedUrl };
  });