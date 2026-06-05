import { Link, useRouterState } from "@tanstack/react-router";
import { IconHome, IconTasks, IconReferral, IconPricing, IconProfile, IconGramMark } from "./icons";
import { useAuth } from "@/hooks/use-auth";

const tabs = [
  { to: "/", label: "Home", icon: IconHome },
  { to: "/tasks", label: "Tasks", icon: IconTasks },
  { to: "/referral", label: "Referral", icon: IconReferral },
  { to: "/pricing", label: "Pricing", icon: IconPricing },
] as const;

export function DesktopSidebar() {
  const { location } = useRouterState();
  const { user, loading } = useAuth();

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[260px] z-40 flex-col border-r border-white/8 bg-[oklch(0.08_0.01_250/0.7)] backdrop-blur-2xl">
      {/* Brand */}
      <div className="px-6 pt-7 pb-8 flex items-center gap-2.5">
        <span className="size-9 rounded-2xl grid place-items-center text-white shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-primary)" }}>
          <IconGramMark className="size-5" />
        </span>
        <span className="text-[18px] font-semibold tracking-tight text-white">Gram AI</span>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1">
        <ul className="space-y-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <Icon className={`size-[20px] ${active ? "text-primary" : "text-white/70 group-hover:text-white"}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Upgrade card */}
        <div className="mt-8 rounded-3xl p-4 text-white shadow-[var(--shadow-glow)]"
             style={{ background: "var(--gradient-primary)" }}>
          <div className="text-[12px] opacity-85">Upgrade</div>
          <div className="mt-0.5 text-[15px] font-semibold">Go Pro</div>
          <div className="mt-1 text-[11.5px] opacity-80">All premium models, more credits, priority speed.</div>
          <Link
            to="/pricing"
            className="mt-3 inline-flex w-full justify-center rounded-full bg-white/15 hover:bg-white/25 transition py-2 text-[12.5px] font-semibold"
          >
            See plans
          </Link>
        </div>
      </nav>

      {/* Profile */}
      <div className="p-3 border-t border-white/8">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-white/6 transition-colors"
        >
          <span className="size-9 rounded-full overflow-hidden bg-white/10 grid place-items-center border border-white/12">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <IconProfile className="size-4 text-white" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white truncate">
              {loading ? "…" : user?.firstName || user?.username || "Guest"}
            </div>
            <div className="text-[11px] text-white/55 tabular-nums">
              {loading ? "…" : `${user?.points ?? 0} credits`}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}