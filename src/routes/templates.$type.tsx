import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { IconBack, IconImage, IconVideo } from "@/components/icons";
import { listTemplates } from "@/lib/referral.functions";

export const Route = createFileRoute("/templates/$type")({
  head: () => ({ meta: [{ title: "Gram AI — Templates" }] }),
  component: TemplatesPage,
});

type Template = { id: string; name: string; description: string | null; cover_url: string | null; prompt: string };

function TemplatesPage() {
  const { type } = Route.useParams();
  const t = type as "image" | "video";
  const navigate = useNavigate();
  const list = useServerFn(listTemplates);
  const [items, setItems] = useState<Template[] | null>(null);

  useEffect(() => {
    (async () => {
      try { setItems((await list({ data: { type: t } })) as Template[]); } catch { setItems([]); }
    })();
  }, [list, t]);

  return (
    <AppShell>
      <div className="px-3 pt-3 flex items-center gap-2">
        <button onClick={() => navigate({ to: "/" })} className="size-10 rounded-2xl bg-secondary grid place-items-center">
          <IconBack className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          {t === "image" ? <IconImage className="size-5 text-primary" /> : <IconVideo className="size-5 text-primary" />}
          <h1 className="text-lg font-semibold">{t === "image" ? "Image" : "Video"} templates</h1>
        </div>
      </div>

      <div className="mt-4 px-3 grid grid-cols-2 gap-3">
        {items === null && [1,2,3,4].map((i) => <div key={i} className="glass aspect-[4/5] rounded-3xl animate-pulse" />)}
        {items?.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => navigate({ to: "/templates/$type/$id", params: { type: t, id: tpl.id } })}
            className="glass rounded-3xl overflow-hidden text-left aspect-[4/5] flex flex-col"
          >
            <div className="flex-1 bg-[image:var(--gradient-primary)]/30 grid place-items-center">
              {tpl.cover_url ? <img src={tpl.cover_url} alt="" className="size-full object-cover" /> : (t === "image" ? <IconImage className="size-10 text-primary" /> : <IconVideo className="size-10 text-primary" />)}
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold truncate">{tpl.name}</div>
              {tpl.description && <div className="text-[11px] text-muted-foreground truncate">{tpl.description}</div>}
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
