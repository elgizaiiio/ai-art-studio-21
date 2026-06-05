import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IconProfile } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Gram AI" },
      { name: "description", content: "Your Gram AI profile, credits and quick actions." },
    ],
  }),
  component: ProfilePage,
  errorComponent: ({ reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold text-white">Profile unavailable</h1>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  ),
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-3 text-center">
        <h1 className="text-[15px] font-semibold text-white">Profile</h1>
      </div>

      <div className="px-6 pt-6 flex flex-col items-center text-center">
        <div className="size-24 rounded-full bg-white/10 border border-white/15 grid place-items-center overflow-hidden">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <IconProfile className="size-10 text-white/80" />
          )}
        </div>
        <div className="mt-4 text-[20px] font-semibold text-white">
          {loading ? "…" : (user?.firstName || user?.username || "Guest")}
        </div>
        {user?.username && (
          <div className="mt-1 text-[13px] text-white/60">@{user.username}</div>
        )}
      </div>

      <div className="mt-8 px-4 grid grid-cols-2 gap-3 lg:max-w-xl lg:mx-auto">
        <div className="rounded-2xl bg-white/8 border border-white/15 p-4">
          <div className="text-[12px] text-white/60">Credits</div>
          <div className="mt-1 text-[22px] font-semibold text-white tabular-nums">
            {loading ? "…" : user?.points ?? 0}
          </div>
        </div>
        <button
          onClick={() => navigate({ to: "/pricing" })}
          className="rounded-2xl p-4 text-left text-white shadow-[var(--shadow-glow)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="text-[12px] opacity-90">Upgrade</div>
          <div className="mt-1 text-[16px] font-semibold">Get Gram Pro</div>
        </button>
      </div>

      <div className="mt-6 px-4 space-y-2 lg:max-w-xl lg:mx-auto">
        <button
          onClick={() => navigate({ to: "/tasks" })}
          className="w-full rounded-2xl bg-white/8 border border-white/15 px-4 py-3.5 text-left text-[14px] text-white"
        >
          Tasks
        </button>
        <button
          onClick={() => navigate({ to: "/referral" })}
          className="w-full rounded-2xl bg-white/8 border border-white/15 px-4 py-3.5 text-left text-[14px] text-white"
        >
          Referral
        </button>
        <button
          onClick={() => navigate({ to: "/pricing" })}
          className="w-full rounded-2xl bg-white/8 border border-white/15 px-4 py-3.5 text-left text-[14px] text-white"
        >
          Pricing
        </button>
      </div>
    </AppShell>
  );
}