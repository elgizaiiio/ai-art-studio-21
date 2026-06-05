import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();
    const [{ data: tasks }, { data: done }] = await Promise.all([
      db.from("tasks").select("id,title,description,image_url,link,reward,verify_type,verify_target").eq("active", true).order("sort_order").order("created_at"),
      db.from("task_completions").select("task_id").eq("user_id", user.id),
    ]);
    const doneIds = new Set((done ?? []).map((r) => r.task_id));
    return (tasks ?? []).filter((t) => !doneIds.has(t.id));
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ initData: z.string(), taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();
    const t = await db.from("tasks").select("reward,verify_type,verify_target").eq("id", data.taskId).eq("active", true).maybeSingle();
    if (!t.data) throw new Error("task_not_found");
    if (t.data.verify_type === "megsy_email") {
      throw new Error("megsy_email_required");
    }
    const reward = t.data.reward;
    // Telegram channel verification
    if (t.data.verify_type === "telegram_channel" && t.data.verify_target) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) throw new Error("missing_bot_token");
      const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(t.data.verify_target)}&user_id=${user.telegram_id}`);
      const j: any = await res.json().catch(() => ({}));
      const status: string = j?.result?.status ?? "";
      const ok = ["creator", "administrator", "member"].includes(status);
      if (!ok) throw new Error("not_subscribed");
    }
    const ins = await db.from("task_completions").insert({ user_id: user.id, task_id: data.taskId }).select("id").maybeSingle();
    if (!ins.data) return { awarded: 0, points: user.points };
    const newPoints = user.points + reward;
    await db.from("users").update({ points: newPoints }).eq("id", user.id);
    await db.from("transactions").insert({ user_id: user.id, kind: "task", method: "internal", amount_points: reward, metadata: { task_id: data.taskId } });
    return { awarded: reward, points: newPoints };
  });

// Verify Megsy AI subscription by email and award credits.
export const verifyMegsyTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    initData: z.string(),
    taskId: z.string().uuid(),
    email: z.string().email().max(190),
  }).parse(d))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/lib/telegram-auth.server");
    const { getAdmin } = await import("@/lib/supabase-admin.server");
    const user = await requireUser(data.initData);
    const db = getAdmin();

    const email = data.email.trim().toLowerCase();
    if (email === "support@megsyai.com") {
      throw new Error("email_blocked");
    }

    const t = await db.from("tasks")
      .select("reward,verify_type,verify_target")
      .eq("id", data.taskId).eq("active", true).maybeSingle();
    if (!t.data) throw new Error("task_not_found");
    if (t.data.verify_type !== "megsy_email") throw new Error("wrong_task_type");
    const reward = t.data.reward || 1000;

    // Already completed?
    const done = await db.from("task_completions").select("id").eq("user_id", user.id).eq("task_id", data.taskId).maybeSingle();
    if (done.data) return { awarded: 0, points: user.points, status: "already_done" as const };

    // Call Megsy verify endpoint.
    const key = process.env.MEGSY_API_KEY;
    if (!key) throw new Error("missing_megsy_api_key");
    const endpoint = "https://ltgampdtawuefwwayncx.supabase.co/functions/v1/verify-subscription";
    let resp: any = null;
    let httpStatus = 0;
    try {
      const r = await fetch(`${endpoint}?email=${encodeURIComponent(email)}`, {
        headers: { "x-api-key": key },
      });
      httpStatus = r.status;
      resp = await r.json().catch(() => ({}));
    } catch (e) {
      throw new Error("megsy_unreachable");
    }

    // Persist the attempt regardless of outcome.
    await db.from("task_verification_requests").upsert({
      task_id: data.taskId,
      user_id: user.id,
      email,
      provider: "megsy",
      status: resp?.found && resp?.status === "active" ? "verified" : "rejected",
      reward,
      request_payload: { email },
      response_payload: { http: httpStatus, body: resp },
      verified_at: resp?.found && resp?.status === "active" ? new Date().toISOString() : null,
    }, { onConflict: "task_id,user_id" });

    const ok = Boolean(resp?.found) && resp?.status === "active";
    if (!ok) throw new Error("not_subscribed");

    // Award the credits.
    const ins = await db.from("task_completions").insert({ user_id: user.id, task_id: data.taskId, reward }).select("id").maybeSingle();
    if (!ins.data) return { awarded: 0, points: user.points, status: "already_done" as const };
    const newPoints = user.points + reward;
    await db.from("users").update({ points: newPoints }).eq("id", user.id);
    await db.from("transactions").insert({
      user_id: user.id, kind: "task", method: "megsy", amount_points: reward,
      metadata: { task_id: data.taskId, email, megsy_plan: resp?.plan },
    });
    return { awarded: reward, points: newPoints, status: "verified" as const };
  });
