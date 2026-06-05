import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { authMe } from "@/lib/auth.functions";
import { getInitDataOrDevFallback, initTelegram } from "@/lib/telegram";

export type AuthedUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  points: number;
  totalReferrals: number;
  tonWallet: string | null;
  referralCode?: string | null;
  isPro?: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const me = useServerFn(authMe);

  useEffect(() => {
    let cancelled = false;
    initTelegram();
    const initData = getInitDataOrDevFallback();
    if (!initData) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    me({ data: { initData } })
      .then((u) => {
        if (cancelled) return;
        setUser({
          id: u.id,
          telegramId: u.telegramId,
          username: u.username,
          firstName: u.firstName,
          photoUrl: u.photoUrl,
          points: u.points,
          totalReferrals: u.totalReferrals,
          tonWallet: u.tonWallet,
          referralCode: u.referralCode,
          isPro: u.isPro,
        });
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "auth_failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [me]);

  return { user, setUser, loading, error };
}
