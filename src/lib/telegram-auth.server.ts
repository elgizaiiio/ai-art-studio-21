import { createHmac } from "crypto";
import { getAdmin } from "@/lib/supabase-admin.server";

export type TgInitUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type VerifiedInit = {
  user: TgInitUser;
  start_param?: string;
  raw: Record<string, string>;
};

const DEV_MODE = process.env.NODE_ENV !== "production";

export function verifyInitData(initData: string): VerifiedInit {
  if (!initData) throw new Error("missing_init_data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};
  params.forEach((v, k) => { data[k] = v; });

  // Dev bypass: synthetic initData "dev:<id>:<username>"
  if (DEV_MODE && initData.startsWith("dev:")) {
    const [, id, username] = initData.split(":");
    return {
      user: { id: Number(id) || 999000001, first_name: username || "Dev", username: username || "dev_user" },
      start_param: data["start_param"],
      raw: data,
    };
  }

  if (!botToken) throw new Error("missing_bot_token");
  const hash = data.hash;
  if (!hash) throw new Error("missing_hash");
  delete data.hash;

  const dataCheckString = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (expected !== hash) throw new Error("invalid_init_data");

  const userRaw = data.user;
  if (!userRaw) throw new Error("missing_user");
  const user: TgInitUser = JSON.parse(userRaw);
  return { user, start_param: data.start_param, raw: data };
}

export async function getOrCreateUser(initData: string) {
  const { user, start_param } = verifyInitData(initData);
  const db = getAdmin();

  const existing = await db.from("users").select("*").eq("telegram_id", user.id).maybeSingle();
  if (existing.data) {
    const patch: Record<string, string | null> = {};
    if (user.username && existing.data.username !== user.username) patch.username = user.username;
    if (user.first_name && existing.data.first_name !== user.first_name) patch.first_name = user.first_name;
    if (user.last_name && existing.data.last_name !== user.last_name) patch.last_name = user.last_name;
    if (user.photo_url && existing.data.photo_url !== user.photo_url) patch.photo_url = user.photo_url;
    if (user.language_code && existing.data.language_code !== user.language_code) patch.language_code = user.language_code;
    if (Object.keys(patch).length) {
      const updated = await db.from("users").update(patch).eq("id", existing.data.id).select("*").maybeSingle();
      if (updated.data) return { user: updated.data, isNew: false };
    }
    return { user: existing.data, isNew: false };
  }

  // Resolve referrer from start_param
  let referredBy: string | null = null;
  if (start_param) {
    const refTgId = Number(start_param);
    if (!Number.isNaN(refTgId) && refTgId !== user.id) {
      const r = await db.from("users").select("id").eq("telegram_id", refTgId).maybeSingle();
      if (r.data) referredBy = (r.data as { id: string }).id;
    }
  }

  const ins = await db.from("users").insert({
    telegram_id: user.id,
    username: user.username ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    photo_url: user.photo_url ?? null,
    language_code: user.language_code ?? null,
    referred_by: referredBy,
    points: 50,
  }).select("*").single();
  if (ins.error) throw new Error("user_create_failed:" + ins.error.message);
  const newUser = ins.data as Record<string, unknown>;

  if (referredBy) {
    const ref = await db.from("users").select("points,total_referrals").eq("id", referredBy).single();
    if (ref.data) {
      await db.from("users").update({
        points: (ref.data as { points: number }).points + 50,
        total_referrals: (ref.data as { total_referrals: number }).total_referrals + 1,
      }).eq("id", referredBy);
      await db.from("transactions").insert({
        user_id: referredBy, kind: "referral", method: "internal", amount_points: 50,
        metadata: { referred_user_id: (newUser as { id: string }).id },
      });
    }
  }
  return { user: newUser, isNew: true };
}

export async function requireUser(initData: string) {
  const { user } = await getOrCreateUser(initData);
  return user as {
    id: string; telegram_id: number; username: string | null; first_name: string | null;
    last_name: string | null; photo_url: string | null; points: number; total_referrals: number;
    referred_by: string | null; ton_wallet: string | null; referral_code?: string | null;
  };
}
