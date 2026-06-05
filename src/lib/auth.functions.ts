import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InitInput = z.object({ initData: z.string() });

export const authMe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InitInput.parse(d))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const user = await requireUser(data.initData);
    return {
      id: user.id,
      telegramId: String(user.telegram_id),
      username: user.username,
      firstName: user.first_name,
      photoUrl: user.photo_url,
      points: user.points,
      totalReferrals: user.total_referrals,
      tonWallet: user.ton_wallet,
    };
  });
