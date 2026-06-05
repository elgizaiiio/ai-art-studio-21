import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { IconBack, IconSpark } from "@/components/icons";
import { getTemplate } from "@/lib/referral.functions";

export const Route = createFileRoute("/templates/$type/$id")({
  head: () => ({ meta: [{ title: "Gram AI — Template" }] }),
  component: TemplateDetail,
});

function TemplateDetail() {
  const { type, id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getTemplate);
  const [tpl, setTpl] = useState<{ name: string; description: string | null; prompt: string; cover_url: string | null } | null>(null);

  useEffect(() => {
    (async () => { try { setTpl(await get({ data: { id } }) as never); } catch {} })();
  }, [get, id]);

  function use() {
    if (!tpl) return;
    sessionStorage.setItem("pending_prompt", tpl.prompt);
    navigate({ to: "/" });
  }

  return (
    <AppShell hideNav>
      <div className="px-3 pt-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/templates/$type", params: { type } })} className="size-10 rounded-2xl bg-secondary grid place-items-center">
          <IconBack className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">Template</h1>
      </div>

      <div className="px-3 mt-3">
        <div className="glass rounded-3xl overflow-hidden">
          <div className="aspect-[4/3] bg-[image:var(--gradient-primary)]/30 grid place-items-center">
            {tpl?.cover_url ? <img src={tpl.cover_url} alt="" className="size-full object-cover" /> : <IconSpark className="size-12 text-primary" />}
          </div>
          <div className="p-5">
            <h2 className="text-xl font-semibold">{tpl?.name ?? "…"}</h2>
            {tpl?.description && <p className="mt-1 text-sm text-muted-foreground">{tpl.description}</p>}
            <div className="mt-4 rounded-2xl bg-secondary/60 p-3 text-[13px] whitespace-pre-wrap">{tpl?.prompt}</div>
            <button onClick={use} className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold">Use this template</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
