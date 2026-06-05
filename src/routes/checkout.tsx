import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { IconCheck } from "@/components/icons";
import { createDodoCheckout, createStarsInvoice, getTonPaymentInfo, verifyTonPayment } from "@/lib/payments.functions";
import { getInitData } from "@/lib/telegram";
import { TonConnectUIProvider, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";

const searchSchema = z.object({
  plan: z.enum(["starter", "pro", "ultra"]).default("pro"),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Gram AI" }] }),
  validateSearch: searchSchema,
  component: CheckoutWrapper,
  errorComponent: ({ reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold text-white">Checkout error</h1>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  ),
});

function CheckoutWrapper() {
  const manifestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/tonconnect-manifest`
      : "https://gram.megsyai.com/api/public/tonconnect-manifest";
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <CheckoutPage />
    </TonConnectUIProvider>
  );
}

const PLANS = {
  starter: { name: "Core", monthly: 9, yearly: 84, credits: 40, perks: ["Unlimited chat", "Unlimited image", "Unlimited music", "40 video credits / month"] },
  pro: { name: "Plus", monthly: 19, yearly: 180, credits: 120, perks: ["Unlimited chat, image & music", "Premium chat & image models", "120 video credits / month", "Priority speed"] },
  ultra: { name: "Scale", monthly: 39, yearly: 372, credits: 320, perks: ["Unlimited chat, image & music", "All premium models", "320 video credits / month", "Highest priority"] },
} as const;

function CheckoutPage() {
  const search = Route.useSearch() as { plan: "starter" | "pro" | "ultra"; cycle: "monthly" | "yearly" };
  const { plan, cycle } = search;
  const navigate = useNavigate();
  const p = PLANS[plan];
  const amount = cycle === "monthly" ? p.monthly : p.yearly;

  const [tonRate, setTonRate] = useState<number | null>(null);
  const [method, setMethod] = useState<"card" | "ton" | "stars">("card");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tonInfo, setTonInfo] = useState<{ amountTon: number; tonLink: string; wallet: string; comment: string } | null>(null);
  const dodoFn = useServerFn(createDodoCheckout);
  const starsFn = useServerFn(createStarsInvoice);
  const tonFn = useServerFn(getTonPaymentInfo);
  const verifyTon = useServerFn(verifyTonPayment);
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd")
      .then((r) => r.json())
      .then((j) => setTonRate(j?.["the-open-network"]?.usd ?? null))
      .catch(() => {});
  }, []);

  const tonAmount = tonRate ? (amount / tonRate).toFixed(2) : "—";
  const stars = Math.round(amount / 0.013);

  const methods = [
    { id: "card" as const, title: "Credit card", subtitle: "Visa · Mastercard · Apple Pay", amount: `$${amount.toFixed(2)}` },
    { id: "ton" as const, title: "TON Wallet", subtitle: "Pay on-chain in seconds", amount: `${tonAmount} TON` },
    { id: "stars" as const, title: "Telegram Stars", subtitle: "Use your in-app balance", amount: `${stars.toLocaleString()} Stars` },
  ];

  async function confirm() {
    setError(null);
    setProcessing(true);
    try {
      const initData = getInitData() || "dev:999000001:dev_user";
      if (method === "card") {
        // ALLOW PAYMENT — Dodo Payments checkout
        const { url } = await dodoFn({ data: { plan, cycle, initData } });
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("No checkout URL returned");
      }
      if (method === "stars") {
        // ALLOW PAYMENT — Telegram Stars invoice
        const { url } = await starsFn({ data: { plan, cycle, initData } });
        const tg = (window as any).Telegram?.WebApp;
        // openInvoice is unavailable in older WebApp versions → fall back to opening the t.me link
        try {
          if (tg?.openInvoice) {
            tg.openInvoice(url, () => {});
          } else if (tg?.openTelegramLink) {
            tg.openTelegramLink(url);
          } else {
            window.open(url, "_blank");
          }
        } catch {
          if (tg?.openTelegramLink) tg.openTelegramLink(url);
          else window.open(url, "_blank");
        }
        return;
      }
      if (method === "ton") {
        // ALLOW PAYMENT — TON via TON Connect (connect wallet, then auto-send tx)
        const info = await tonFn({ data: { plan, cycle, initData } });
        setTonInfo({ amountTon: info.amountTon, tonLink: info.tonLink, wallet: info.wallet, comment: info.comment });
        // 1) Connect wallet if needed
        if (!wallet) {
          await tonConnectUI.openModal();
          // Wait until user connects (max ~2min)
          await new Promise<void>((resolve, reject) => {
            const unsub = tonConnectUI.onStatusChange((w) => {
              if (w) { unsub(); resolve(); }
            });
            setTimeout(() => { unsub(); reject(new Error("wallet_connect_timeout")); }, 120000);
          });
        }
        // 2) Send transaction
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [{
            address: info.wallet,
            amount: String(Math.floor(info.amountTon * 1e9)),
            payload: info.payload,
          }],
        });
        // 3) Poll backend for on-chain verification
        let tries = 0;
        const pollId = setInterval(async () => {
          tries++;
          try {
            const r = await verifyTon({ data: { plan, cycle, initData } });
            if (r.ok) {
              clearInterval(pollId);
              navigate({ to: "/pricing", search: { paid: "1" } as never });
            }
          } catch {}
          if (tries > 40) clearInterval(pollId);
        }, 5000);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <AppShell hideNav>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate({ to: "/pricing" })}
          aria-label="Back"
          className="size-9 rounded-full bg-white/8 border border-white/12 grid place-items-center text-white/85"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[13px] font-medium text-white/70">Checkout</div>
        <div className="size-9" />
      </div>

      {/* Title */}
      <div className="px-6 pt-4 pb-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold">{cycle === "monthly" ? "Monthly" : "Yearly"}</div>
        <h1 className="mt-1 text-[26px] font-semibold text-white">{p.name} plan</h1>
        <div className="mt-3 flex items-baseline justify-center gap-1.5">
          <span className="text-[44px] font-bold text-white tabular-nums leading-none">${amount}</span>
          <span className="text-[14px] text-white/55">/ {cycle === "monthly" ? "mo" : "yr"}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4">
        <div className="rounded-3xl bg-white/6 border border-white/12 p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-white/65">What you get</div>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary">
              +{p.credits} credits
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {p.perks.map((perk: string) => (
              <li key={perk} className="flex items-center gap-2.5 text-[13.5px] text-white/88">
                <span className="grid place-items-center size-4 rounded-full bg-primary/20 shrink-0">
                  <IconCheck className="size-2.5 text-primary" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Payment methods */}
      <div className="px-4 mt-6">
        <div className="px-1 pb-2 text-[12px] uppercase tracking-wider text-white/45 font-semibold">Payment method</div>
        <div className="space-y-2">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                  active ? "bg-white/10 border border-white/25" : "bg-white/5 border border-white/10"
                }`}
              >
                <span
                  className={`size-[18px] rounded-full grid place-items-center shrink-0 ${
                    active ? "bg-primary" : "border-2 border-white/25"
                  }`}
                >
                  {active && <span className="size-1.5 rounded-full bg-[oklch(0.10_0.02_250)]" />}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[14px] font-medium text-white truncate">{m.title}</div>
                  <div className="text-[11.5px] text-white/55 truncate">{m.subtitle}</div>
                </div>
                <div className="text-[13px] font-semibold text-white tabular-nums shrink-0">{m.amount}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-6 tg-safe-pb">
        <button
          onClick={confirm}
          disabled={processing}
          className="w-full rounded-full py-4 text-[14.5px] font-semibold text-white shadow-[var(--shadow-glow)] disabled:opacity-70 transition active:scale-[0.99]"
          style={{ background: "var(--gradient-primary)" }}
        >
          {processing ? "Processing…" : `Pay ${methods.find((m) => m.id === method)?.amount}`}
        </button>
        {error && <div className="mt-3 text-center text-[11.5px] text-red-300">{error}</div>}
        <div className="mt-3 text-center text-[11px] text-white/45">Encrypted and secure</div>
      </div>

      <div className="h-6" />
    </AppShell>
  );
}