import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { completeTask, listTasks } from "@/lib/tasks.functions";
import { getInitData } from "@/lib/telegram";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Gram AI — Tasks" }] }),
  component: TasksPage,
  errorComponent: ({ reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold text-white">Couldn't load tasks</h1>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  ),
});

type Task = { id: string; title: string; image_url: string | null; link: string; reward: number };

function TasksPage() {
  const list = useServerFn(listTasks);
  const complete = useServerFn(completeTask);
  const { user, setUser } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const initData = getInitData();
    if (!initData) { setTasks([]); return; }
    (async () => {
      try {
        const data = await list({ data: { initData } });
        setTasks(data as Task[]);
      } catch { setTasks([]); }
    })();
  }, [list]);

  async function onClick(t: Task) {
    if (!opened[t.id]) {
      window.open(t.link, "_blank");
      setOpened((o) => ({ ...o, [t.id]: true }));
      return;
    }
    setBusy(t.id);
    try {
      const initData = getInitData();
      if (!initData) { setBusy(null); return; }
      const r = await complete({ data: { initData, taskId: t.id } });
      setTasks((arr) => (arr ?? []).filter((x) => x.id !== t.id));
      if (user) setUser({ ...user, points: r.points });
    } catch {} finally { setBusy(null); }
  }

  return (
    <AppShell>
      <div className="px-5 pt-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-xs text-muted-foreground">Complete tasks to earn points.</p>
        </div>
      </div>

      <div className="mt-5 px-3 space-y-2.5">
        {tasks === null && (
          <>
            {[1, 2, 3].map((i) => <div key={i} className="glass h-20 rounded-3xl animate-pulse" />)}
          </>
        )}
        {tasks && tasks.length === 0 && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">No tasks available. Check back soon.</div>
        )}
        {tasks?.map((t) => {
          const isOpened = opened[t.id];
          return (
            <div key={t.id} className="glass rounded-3xl p-3 flex items-center gap-3">
              {t.image_url && (
                <div className="size-14 rounded-2xl bg-secondary overflow-hidden shrink-0">
                  <img src={t.image_url} alt="" className="size-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium truncate">{t.title}</div>
                <div className="text-xs text-primary mt-0.5">+{t.reward} points</div>
              </div>
              <button
                onClick={() => onClick(t)}
                disabled={busy === t.id}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${isOpened ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {busy === t.id ? "…" : isOpened ? "Verify" : "Start"}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
