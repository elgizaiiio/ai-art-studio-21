import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { IconCheck } from "@/components/icons";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Gram AI" },
      { name: "description", content: "Choose a clean and flexible Gram AI plan with clear credits, premium models, and fast creative workflows." },
      { property: "og:title", content: "Pricing — Gram AI" },
      { property: "og:description", content: "Clear plans, logical credits, and premium creative tools in one place." },
    ],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "yearly";
type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  credits: number;
  perks: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Core",
    tagline: "Unlimited chat, image & music",
    monthly: 9,
    yearly: 84,
    credits: 40,
    perks: [
      "Unlimited chat",
      "Unlimited image generation",
      "Unlimited music generation",
      "40 video credits / month",
    ],
  },
  {
    id: "pro",
    name: "Plus",
    tagline: "More video credits for creators",
    monthly: 19,
    yearly: 180,
    credits: 120,
    perks: [
      "Unlimited chat, image & music",
      "Premium chat & image models",
      "120 video credits / month",
      "Priority speed",
    ],
    popular: true,
  },
  {
    id: "ultra",
    name: "Scale",
    tagline: "For heavy video work",
    monthly: 39,
    yearly: 372,
    credits: 320,
    perks: [
      "Unlimited chat, image & music",
      "All premium models",
      "320 video credits / month",
      "Highest priority",
    ],
  },
];

function PricingPage() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-6 text-center">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-white">
          Simple pricing
        </h1>
        <p className="mt-2 text-[14px] text-white/65">Pick a plan. Cancel anytime.</p>
      </div>

      <div className="px-4 flex justify-center">
        <div className="inline-flex p-1 rounded-full bg-white/8 border border-white/15">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`relative px-4 py-1.5 rounded-full text-[13px] font-medium transition ${
                cycle === c ? "bg-white text-[oklch(0.10_0.02_250)]" : "text-white/75"
              }`}
            >
              {c === "monthly" ? "Monthly" : "Yearly"}
              {c === "yearly" && (
                <span className="ms-1.5 inline-block rounded-full bg-emerald-400/90 text-[10px] font-bold px-1.5 py-0.5 text-emerald-950">
                  −16%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 px-4 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
        {plans.map((p) => {
          const price = cycle === "monthly" ? p.monthly : p.yearly;
          const perMonth = cycle === "yearly" ? (p.yearly / 12).toFixed(2) : null;
          return (
            <button
              key={p.id}
              onClick={() => navigate({ to: "/checkout", search: { plan: p.id as "starter" | "pro" | "ultra", cycle } })}
              className={`group block w-full text-left rounded-[24px] p-5 transition-all ${
                p.popular
                  ? "border border-transparent shadow-[var(--shadow-glow)]"
                  : "bg-white/6 border border-white/12"
              }`}
              style={p.popular ? { background: "var(--gradient-primary)" } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[20px] font-semibold text-white">{p.name}</h2>
                    {p.popular && (
                      <span className="rounded-full bg-white text-[oklch(0.10_0.02_250)] text-[9px] font-bold px-2 py-0.5">
                        POPULAR
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12.5px] text-white/72">{p.tagline}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[26px] font-bold text-white tabular-nums leading-none">
                    ${price}
                  </div>
                  <div className="text-[11px] text-white/60 mt-1">
                    / {cycle === "monthly" ? "mo" : "yr"}
                  </div>
                  {perMonth && <div className="text-[10.5px] text-white/45">≈ ${perMonth}/mo</div>}
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5 text-[13px] text-white/88">
                    <span
                      className={`grid place-items-center size-4 rounded-full shrink-0 ${
                        p.popular ? "bg-white/25" : "bg-primary/20"
                      }`}
                    >
                      <IconCheck className={`size-2.5 ${p.popular ? "text-white" : "text-primary"}`} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <div
                className={`mt-5 w-full rounded-full py-3 text-center text-[13.5px] font-semibold ${
                  p.popular ? "bg-white text-[oklch(0.10_0.02_250)]" : "bg-white/12 text-white border border-white/15"
                }`}
              >
                Choose {p.name}
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-6" />

    </AppShell>
  );
}

