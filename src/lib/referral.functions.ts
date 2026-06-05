import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getReferralStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();
    const { count: c } = await db.from("users").select("id", { count: "exact", head: true }).eq("referred_by", user.id);
    const count = c ?? 0;
    // 3 credits per referral
    const PER_REFERRAL = 3;
    return {
      telegramId: String(user.telegram_id),
      referrals: count,
      pointsEarned: count * PER_REFERRAL,
      usdEarned: +(count * PER_REFERRAL * 0.01).toFixed(2),
    };
  });

export const listTemplates = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ type: z.enum(["image", "video", "music"]) }).parse(d))
  .handler(async ({ data }) => {
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const r = await getAdmin().from("templates").select("id,name,description,cover_url,prompt")
      .eq("type", data.type).eq("active", true).order("sort_order");
    return r.data ?? [];
  });

export const getTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const r = await getAdmin().from("templates").select("*").eq("id", data.id).maybeSingle();
    if (!r.data) throw new Error("not_found");
    return r.data;
  });
