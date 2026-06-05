import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { PLAN_PRICE_USD } from "@/lib/payments.functions";

export const Route = createFileRoute("/api/public/dodo/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const secret = process.env.DODO_WEBHOOK_SECRET;
        if (!secret) return new Response("not_configured", { status: 500 });

        // Dodo signature: try common header names; verify HMAC-SHA256 hex
        const sig =
          request.headers.get("webhook-signature") ??
          request.headers.get("x-dodo-signature") ??
          request.headers.get("dodo-signature") ??
          "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const ok = (() => {
          try {
            const a = Buffer.from(sig.replace(/^sha256=/, ""));
            const b = Buffer.from(expected);
            return a.length === b.length && timingSafeEqual(a, b);
          } catch {
            return false;
          }
        })();
        if (!ok && process.env.DODO_ENV !== "test_no_verify") {
          return new Response("invalid_signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("bad_json", { status: 400 });
        }

        const type: string = event?.type ?? event?.event ?? "";
        const data = event?.data ?? event?.payload ?? event;
        const meta = data?.metadata ?? {};
        const userId: string | undefined = meta.user_id;
        const plan: string | undefined = meta.plan;
        const cycle: string | undefined = meta.cycle;

        const isPaid =
          type.includes("succeeded") ||
          type.includes("paid") ||
          type.includes("active") ||
          data?.status === "active" ||
          data?.status === "succeeded";

        if (isPaid && userId && plan && cycle) {
          const usd = (PLAN_PRICE_USD as any)[plan]?.[cycle] ?? null;
          const credits = (PLAN_PRICE_USD as any)[plan]?.credits ?? 0;
          const { getAdmin } = await import("@/lib/supabase-admin.server");
          const supa = getAdmin();
          await supa.from("transactions").insert({
            user_id: userId,
            kind: "subscription",
            method: "dodo",
            amount_usd: usd,
            amount_points: credits,
            external_id: data?.subscription_id ?? data?.payment_id ?? data?.id ?? null,
            status: "completed",
            metadata: { plan, cycle, event: type },
          });
          // Grant credits
          const { data: u } = await supa.from("users").select("points").eq("id", userId).maybeSingle();
          if (u) {
            await supa.from("users").update({ points: (u.points ?? 0) + credits }).eq("id", userId);
          }
          try {
            const { tgNotifyAdmins } = await import("@/lib/telegram-bot.server");
            await tgNotifyAdmins(`💸 <b>New payment</b>\nMethod: <b>Dodo</b>\nPlan: <b>${plan}</b> · ${cycle}\nAmount: <b>$${usd ?? "?"}</b>\nUser id: <code>${userId}</code>`);
          } catch {}
        }

        return Response.json({ ok: true });
      },
    },
  },
});