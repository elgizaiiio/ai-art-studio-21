import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Catalog ----------

export const TON_WALLET = "UQBFD2nn4IFNq2cc-WbhJj6u4KcjjDoAs7yL31DMmzMMJI2K";

export const PLAN_PRICE_USD: Record<string, { monthly: number; yearly: number; credits: number; name: string }> = {
  starter: { monthly: 9, yearly: 84, credits: 40, name: "Core" },
  pro: { monthly: 19, yearly: 180, credits: 120, name: "Plus" },
  ultra: { monthly: 39, yearly: 372, credits: 320, name: "Scale" },
};

// Dodo Payments product IDs (provided by user)
export const DODO_PRODUCTS: Record<string, Record<string, string>> = {
  starter: {
    monthly: "pdt_0NgKfZjWhDpq2omVkIlcC",
    yearly: "pdt_0NgKgH40N3QGDeQ8UrTVh",
  },
  pro: {
    monthly: "pdt_0NgKfpun8jBZDbFJTENZ8",
    yearly: "pdt_0NgKgVS2rgasaSj1a9vLP",
  },
  ultra: {
    monthly: "pdt_0NgKg3rpWC8Dz9Rpm3LDP",
    yearly: "pdt_0NgKgg0eGebmThcOBI9oZ",
  },
};

const planCycle = z.object({
  plan: z.enum(["starter", "pro", "ultra"]),
  cycle: z.enum(["monthly", "yearly"]),
  initData: z.string().min(1),
});

async function resolveUserId(initData: string): Promise<string> {
  const { requireUser } = await import("@/lib/telegram-auth.server");
  const u = await requireUser(initData);
  return u.id;
}

// ---------- Dodo Payments ----------

function dodoBase() {
  // Default to LIVE; user can opt into test by setting DODO_ENV=test
  return process.env.DODO_ENV === "test" ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
}

export const createDodoCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planCycle.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.DODO_API_KEY;
    if (!key) throw new Error("missing_dodo_key");
    const productId = DODO_PRODUCTS[data.plan]?.[data.cycle];
    if (!productId) throw new Error("unknown_product");
    const userId = await resolveUserId(data.initData);
    // Fetch user for customer info (Dodo requires customer)
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const { data: u } = await getAdmin()
      .from("users")
      .select("telegram_id, username, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.username || `tg_${u?.telegram_id ?? userId}`;
    const email = `tg_${u?.telegram_id ?? userId}@gramai.app`;
    const origin =
      process.env.PUBLIC_APP_ORIGIN ??
      "https://project--95395e69-8f2c-415e-995a-e5f4015731e7-dev.lovable.app";
    const body = JSON.stringify({
      product_id: productId,
      quantity: 1,
      payment_link: true,
      return_url: `${origin}/pricing?paid=1`,
      metadata: { user_id: userId, plan: data.plan, cycle: data.cycle },
      billing: { country: "US" },
      customer: { email, name },
    });
    async function call(base: string) {
      return fetch(`${base}/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body,
      });
    }
    let res = await call(dodoBase());
    // If primary env returns 401/403, try the other env (key may be for the other mode)
    if (res.status === 401 || res.status === 403) {
      const alt = dodoBase().includes("live") ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
      res = await call(alt);
    }
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`dodo_failed:${res.status}:${JSON.stringify(j)}`);
    return { url: j.payment_link ?? j.url ?? null, subscription_id: j.subscription_id ?? null };
  });

// ---------- Telegram Stars ----------

// 1 Star ≈ $0.013 → match checkout.tsx pricing
function starsForUsd(usd: number) {
  return Math.max(1, Math.round(usd / 0.013));
}

export const createStarsInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planCycle.parse(d))
  .handler(async ({ data }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("missing_bot_token");
    const usd = data.cycle === "monthly" ? PLAN_PRICE_USD[data.plan].monthly : PLAN_PRICE_USD[data.plan].yearly;
    const stars = starsForUsd(usd);
    const planName = PLAN_PRICE_USD[data.plan].name;
    const userId = await resolveUserId(data.initData);
    const payload = JSON.stringify({ kind: "subscription", user_id: userId, plan: data.plan, cycle: data.cycle });
    const res = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Gram AI ${planName} (${data.cycle})`,
        description: `${planName} plan — ${data.cycle} subscription`,
        payload,
        currency: "XTR",
        prices: [{ label: `${planName} ${data.cycle}`, amount: stars }],
      }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(`stars_failed:${JSON.stringify(j)}`);
    return { url: j.result as string, stars };
  });

// ---------- TON Wallet ----------

export const getTonPaymentInfo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planCycle.parse(d))
  .handler(async ({ data }) => {
    const userId = await resolveUserId(data.initData);
    const usd = data.cycle === "monthly" ? PLAN_PRICE_USD[data.plan].monthly : PLAN_PRICE_USD[data.plan].yearly;
    // Fetch TON/USD spot
    let tonRate = 5.5;
    try {
      const r = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd");
      const j: any = await r.json();
      const v = j?.rates?.TON?.prices?.USD;
      if (typeof v === "number" && v > 0) tonRate = v;
    } catch {
      // ignore, fall back
    }
    const amountTon = +(usd / tonRate).toFixed(3);
    const comment = `gramai:${userId}:${data.plan}:${data.cycle}`;
    const tonLink = `ton://transfer/${TON_WALLET}?amount=${Math.floor(amountTon * 1e9)}&text=${encodeURIComponent(comment)}`;
    return { wallet: TON_WALLET, amountTon, tonRate, comment, tonLink, amountUsd: usd };
  });

// ---------- TON Verify ----------

export const verifyTonPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ plan: z.enum(["starter", "pro", "ultra"]), cycle: z.enum(["monthly", "yearly"]), initData: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const userId = await resolveUserId(data.initData);
    const expectedComment = `gramai:${userId}:${data.plan}:${data.cycle}`;
    const usd = data.cycle === "monthly" ? PLAN_PRICE_USD[data.plan].monthly : PLAN_PRICE_USD[data.plan].yearly;
    // Pull recent txs for the wallet, look for matching comment within last 30 min
    const url = `https://tonapi.io/v2/blockchain/accounts/${TON_WALLET}/transactions?limit=30`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`tonapi_failed:${r.status}`);
    const j: any = await r.json();
    const now = Math.floor(Date.now() / 1000);
    let match: any = null;
    for (const tx of j.transactions ?? []) {
      const inMsg = tx.in_msg;
      const text = inMsg?.decoded_body?.text ?? inMsg?.message ?? "";
      if (typeof text === "string" && text.includes(expectedComment) && now - (tx.utime ?? 0) < 1800) {
        match = tx;
        break;
      }
    }
    if (!match) return { ok: false as const };
    // Record + grant credits via admin
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const supa = getAdmin();
    await supa.from("transactions").insert({
      user_id: userId,
      kind: "subscription",
      method: "ton",
      amount_usd: usd,
      external_id: match.hash,
      status: "completed",
      metadata: { plan: data.plan, cycle: data.cycle },
    });
    try {
      const { tgNotifyAdmins } = await import("@/lib/telegram-bot.server");
      await tgNotifyAdmins(`💸 <b>New payment</b>\nMethod: <b>TON</b>\nPlan: <b>${data.plan}</b> · ${data.cycle}\nAmount: <b>$${usd}</b>\nUser id: <code>${userId}</code>\nTx: <code>${match.hash}</code>`);
    } catch {}
    return { ok: true as const, hash: match.hash };
  });