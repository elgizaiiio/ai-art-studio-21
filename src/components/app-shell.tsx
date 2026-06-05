import { Link, useRouterState } from "@tanstack/react-router";
import { House, SquareCheck, Sparkles, UserRoundPlus } from "lucide-react";
import { DesktopSidebar } from "./desktop-shell";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Home", icon: House },
  { to: "/tasks", label: "Tasks", icon: SquareCheck },
  { to: "/pricing", label: "Pro", icon: Sparkles },
  { to: "/referral", label: "Invite", icon: UserRoundPlus },
] as const;

export function BottomNav() {
  const { location } = useRouterState();
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 tg-safe-pb pointer-events-none">
      <div className="mx-auto max-w-md px-6 pb-3 flex justify-center">
        <div className="nav-pill pointer-events-auto rounded-full px-2 py-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
          <ul className="flex items-center gap-0.5">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 transition-colors ${active ? "bg-white/8" : ""}`}
                  >
                    <Icon
                      strokeWidth={active ? 2.2 : 1.7}
                      className={`size-[23px] ${active ? "text-primary fill-primary/15" : "text-white/85"}`}
                    />
                    <span className={`text-[10.5px] font-medium tracking-tight ${active ? "text-primary" : "text-white/70"}`}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const { location } = useRouterState();
  return (
    <div className="relative min-h-screen lg:pl-[260px]">
      <DesktopSidebar />
      <div className="tg-safe-pt" />
      <main
        key={location.pathname}
        className={`mx-auto max-w-md lg:max-w-3xl lg:pt-6 lg:px-8 animate-page-in ${hideNav ? "" : "pb-28 lg:pb-16"}`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
