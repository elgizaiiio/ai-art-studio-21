import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { IconCheck, IconCopy } from "@/components/icons";
import { getReferralStats } from "@/lib/referral.functions";
import { getInitData, getTg } from "@/lib/telegram";

export const Route = createFileRoute("/referral")({
  head: () => ({ meta: [{ title: "Gram AI — Invite friends" }] }),
  component: ReferralPage,
  errorComponent: RouteError,
});

function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold text-white">Something went off</h1>
        <p className="mt-1 text-sm text-white/60">Please try again.</p>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  );
}

const BOT_USERNAME = "Gramaiibot";

function ReferralPage() {
  const stats = useServerFn(getReferralStats);
  const [data, setData] = useState<{ telegramId: string; referralCode: string | null; referrals: number; pointsEarned: number; usdEarned: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tgFallback, setTgFallback] = useState(false);

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setTgFallback(true);
      return;
    }
    (async () => {
      try {
        setData(await stats({ data: { initData } }));
      } catch {
        setTgFallback(true);
      }
    })();
  }, [stats]);

  const startValue = data?.referralCode || data?.telegramId;
  const link = startValue
    ? `https://t.me/${BOT_USERNAME}/app?startapp=${encodeURIComponent(startValue)}`
    : null;

  function copy() {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  }
  function share() {
    if (!link) return;
    const tg = getTg();
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join me on Gram AI — unlimited AI right inside Telegram.")}`;
    tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, "_blank");
  }

  const referrals = data?.referrals ?? 0;
  const points = data?.pointsEarned ?? 0;
  const usd = data?.usdEarned ?? 0;

  return (
    <AppShell>
      {/* Hero icon */}
      <div className="px-6 pt-8 pb-2 flex flex-col items-center text-center">
        <div className="relative mx-auto">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-44"
            aria-hidden
            style={{ filter: "drop-shadow(0 18px 40px oklch(0.6 0.22 260 / 0.55))" }}
          >
            <defs>
              <linearGradient id="refGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.16 245)" />
                <stop offset="100%" stopColor="oklch(0.55 0.22 280)" />
              </linearGradient>
            </defs>
            <path
              d="M16 14a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.34-8 4v2h9v-2a5.4 5.4 0 0 1 2.1-4.18A13.7 13.7 0 0 0 8 16Zm8 0c-.29 0-.62 0-.97.05A5 5 0 0 1 18 20v2h6v-2c0-2.66-5.3-4-8-4Z"
              fill="url(#refGrad)"
            />
          </svg>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-2 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-md animate-[shine_2.6s_ease-in-out_infinite]"
          />
        </div>
        <h1 className="mt-6 text-[24px] font-semibold tracking-tight text-white leading-snug">
          Invite friends, earn <span className="text-primary">20%</span> forever
        </h1>
        <p className="mt-2 text-[13.5px] text-white/65 leading-relaxed max-w-[300px]">
          Get 20% of their subscriptions for life + 3 credits per friend who joins.
        </p>
      </div>

      {/* Stats */}
      {!tgFallback && (
        <div className="px-4 mt-5 grid grid-cols-3 gap-2">
          <Stat label="Friends" value={referrals.toString()} />
          <Stat label="Credits" value={points.toLocaleString()} />
          <Stat label="Earned" value={`$${usd}`} />
        </div>
      )}
      {tgFallback && (
        <div className="px-4 mt-5">
          <div className="rounded-2xl bg-white/6 border border-white/12 p-3 text-center text-[12px] text-white/65">
            Open inside Telegram to see your stats.
          </div>
        </div>
      )}

      {/* Invite link */}
      <div className="px-4 mt-5">
        <div className="rounded-3xl bg-white/6 border border-white/12 p-4">
          <div className="text-[11px] uppercase tracking-wide text-white/50 font-medium">Your invite link</div>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 pl-3 pr-1.5 py-1.5">
            <div className="flex-1 truncate text-[12.5px] text-white/85">{link || (tgFallback ? "Open inside Telegram" : "Generating…")}</div>
            <button
              onClick={copy}
              aria-label="Copy link"
              className="size-9 rounded-xl bg-white/12 border border-white/15 grid place-items-center text-white"
            >
              {copied ? <IconCheck className="size-4 text-emerald-300" /> : <IconCopy className="size-4" />}
            </button>
          </div>
          <button
            onClick={share}
            disabled={!link}
            className="mt-3 w-full rounded-full py-3 text-[14px] font-semibold text-white shadow-[var(--shadow-glow)] disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            Share invite
          </button>
        </div>
      </div>

      <div className="h-6" />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/6 border border-white/12 p-3 text-center">
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="mt-0.5 text-[19px] font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}
