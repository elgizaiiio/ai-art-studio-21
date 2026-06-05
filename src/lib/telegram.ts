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
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  BackButton: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy") => void; notificationOccurred: (s: "success" | "warning" | "error") => void };
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  themeParams?: Record<string, string>;
  colorScheme?: "light" | "dark";
};

export function getTg(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  // @ts-expect-error injected by Telegram
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTg();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
    // Match the dark app background so Telegram chrome doesn't flash white.
    try { tg.setHeaderColor("#0a0a0f"); } catch {}
    try { tg.setBackgroundColor("#0a0a0f"); } catch {}
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

export function getStartParam(): string | null {
  const tg = getTg();
  return tg?.initDataUnsafe?.start_param ?? null;
}
