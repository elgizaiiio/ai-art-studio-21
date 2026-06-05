// Client-side Telegram WebApp wrapper
export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

type TgWebApp = {
  initData: string;
  initDataUnsafe: { user?: TgUser; start_param?: string };
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  isFullscreen?: boolean;
  isExpanded?: boolean;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  safeAreaInset?: { top: number; right: number; bottom: number; left: number };
  contentSafeAreaInset?: { top: number; right: number; bottom: number; left: number };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy") => void; notificationOccurred: (s: "success" | "warning" | "error") => void };
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  themeParams?: Record<string, string>;
  colorScheme?: "light" | "dark";
  version?: string;
  platform?: string;
};

export function getTg(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  // @ts-expect-error injected by Telegram
  return window.Telegram?.WebApp ?? null;
}

function applySafeAreaInsets(tg: TgWebApp) {
  if (typeof document === "undefined") return;
  const content = tg.contentSafeAreaInset;
  const safe = tg.safeAreaInset;
  const top = Math.max(
    (content?.top ?? 0) + (safe?.top ?? 0),
    tg.isFullscreen ? 96 : 56,
  );
  const bottom = Math.max((content?.bottom ?? 0) + (safe?.bottom ?? 0), 0);
  document.documentElement.style.setProperty("--tg-safe-top", `${top}px`);
  document.documentElement.style.setProperty("--tg-safe-bottom", `${bottom}px`);
}

export function initTelegram() {
  const tg = getTg();
  // Block pinch/double-tap zoom on iOS Safari (viewport meta is not enough there).
  if (typeof document !== "undefined") {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("gestureend", prevent);
    let lastTouch = 0;
    document.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTouch <= 350) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
    // Try to open in full-screen (Bot API 8.0+); silently ignored otherwise.
    try { tg.requestFullscreen?.(); } catch {}
    try { tg.disableVerticalSwipes?.(); } catch {}
    // Match the dark app background so Telegram chrome doesn't flash white.
    try { tg.setHeaderColor("#0a0a0f"); } catch {}
    try { tg.setBackgroundColor("#0a0a0f"); } catch {}
    applySafeAreaInsets(tg);
    const onChange = () => applySafeAreaInsets(tg);
    try {
      tg.onEvent?.("safeAreaChanged", onChange);
      tg.onEvent?.("contentSafeAreaChanged", onChange);
      tg.onEvent?.("fullscreenChanged", onChange);
      tg.onEvent?.("viewportChanged", onChange);
    } catch {}
  } catch {}
  return tg;
}

// Persist initData so server fns can read it via header
let cachedInitData: string | null = null;
export function getInitData(): string {
  if (cachedInitData) return cachedInitData;
  const tg = getTg();
  const data = tg?.initData ?? "";
  if (data) cachedInitData = data;
  return data;
}

export function getInitDataOrDevFallback(): string {
  const data = getInitData();
  if (data) return data;
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  const isDevHost = host === "localhost" || host === "127.0.0.1" || host.includes("preview");
  return isDevHost ? "dev:999000001:dev_user" : "";
}

export function getStartParam(): string | null {
  const tg = getTg();
  return tg?.initDataUnsafe?.start_param ?? null;
}
