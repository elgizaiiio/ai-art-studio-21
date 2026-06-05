import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { IconArrowUp, IconChevronDown, IconChipChat, IconChipImage, IconChipMusic, IconChipVideo, IconProfile } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { IMAGE_MODELS, VIDEO_MODELS, type ModelEntry } from "@/lib/models-catalog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Gram AI — Chat" }] }),
  component: HomePage,
  errorComponent: ({ reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold text-white">Something went off</h1>
        <button onClick={reset} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Retry</button>
      </div>
    </div>
  ),
});

type ChipId = "image" | "video" | "music" | "chat";
type Mode = "chat" | "slides" | "docs" | "research";

const chips: Array<{ id: ChipId; label: string; icon: typeof IconChipImage }> = [
  { id: "chat", label: "Chat", icon: IconChipChat },
  { id: "image", label: "Create image", icon: IconChipImage },
  { id: "video", label: "Create video", icon: IconChipVideo },
  { id: "music", label: "Create music", icon: IconChipMusic },
];

// Curated model catalog. `id` maps to the backend provider key. Source providers
// are deliberately not surfaced in the UI.
type ModelOpt = {
  id: string;
  label: string;
  logo?: string;
  cost: number;
  pro?: boolean;            // requires subscription
  freeForAll?: boolean;     // Pollinations: free for everyone
  unlimitedForSubs?: boolean; // subscribers pay 0
  badge?: string;
};

function fromCatalog(m: ModelEntry): ModelOpt {
  return {
    id: m.id,
    label: m.label,
    cost: m.cost,
    freeForAll: m.freeForAll,
    unlimitedForSubs: m.unlimitedForSubs,
    badge: m.badge,
    pro: false, // gating handled by unlimitedForSubs + isPro at runtime
  };
}

const chatModels: ModelOpt[] = [
  { id: "pollinations", label: "Gram 1.0", cost: 1 },
  { id: "pollinations", label: "GPT-5", cost: 3 },
  { id: "pollinations", label: "Gemini 3 Pro", cost: 3 },
  { id: "leonardo", label: "Claude Opus 4.8", cost: 8, pro: true },
  { id: "leonardo", label: "Claude Sonnet 4.6", cost: 5, pro: true },
];
const imageModels: ModelOpt[] = IMAGE_MODELS.map(fromCatalog);
const videoModels: ModelOpt[] = VIDEO_MODELS.map(fromCatalog);
const musicModels: ModelOpt[] = [
  { id: "pollinations", label: "Suno v4", cost: 15 },
  { id: "pollinations", label: "Udio v1.5", cost: 14 },
  { id: "pollinations", label: "Stable Audio 2", cost: 10 },
];

function detectMode(text: string): Mode {
  const l = text.toLowerCase();
  if (/(slide|سلايد|شرائح|عرض تقديمي)/.test(l)) return "slides";
  if (/(\bdoc\b|document|وثيقة|مستند|مقال)/.test(l)) return "docs";
  if (/(deep research|بحث عميق|بحث معمق)/.test(l)) return "research";
  return "chat";
}

function HomePage() {
  const navigate = useNavigate();
  const { user, setUser, loading } = useAuth();
  const [input, setInput] = useState("");
  const [active, setActive] = useState<ChipId>("chat");
  const [modelLabel, setModelLabel] = useState<string>(chatModels[0].label);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input, active]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showModelMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (modelMenuRef.current?.contains(target)) return;
      setShowModelMenu(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowModelMenu(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showModelMenu]);

  const expanded = true;
  const modelOpts =
    active === "video" ? videoModels :
    active === "music" ? musicModels :
    active === "image" ? imageModels :
    chatModels;
  const currentModel = modelOpts.find((m) => m.label === modelLabel) ?? modelOpts[0];
  const isPro = Boolean((user as { isPro?: boolean } | null)?.isPro);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const mode = active === "chat" ? detectMode(text) : active;
    const isFreeChat = mode === "chat";
    if (currentModel.pro && !isPro) {
      setToast("This model is Pro-only — upgrade to unlock");
      navigate({ to: "/pricing" });
      return;
    }
    setSending(true);
    setImgPreview(null);
    try {
      // Design preview only — backend is disabled.
      await new Promise((r) => setTimeout(r, 500));
      setToast(`Preview: ${mode} request with ${currentModel.label}`);
      if (user && !isFreeChat) {
        setUser({ ...user, points: Math.max(0, user.points - currentModel.cost) });
      }
      setInput("");
    } catch (e) {
      setToast(`⚠ ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      {/* Top bar — mobile only (desktop sidebar replaces this) */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:hidden">
        <button
          onClick={() => navigate({ to: "/tasks" })}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/12 px-3 py-1.5"
        >
          <span className="text-[12px] font-medium text-white/65">Credits</span>
          <span className="text-[13px] font-semibold tabular-nums text-white">{loading ? "…" : user?.points ?? 0}</span>
        </button>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/pricing" })}
            aria-label="Upgrade"
            className="inline-flex items-center rounded-full bg-white/8 border border-white/12 px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-white/12 transition"
          >
            Upgrade
          </button>
          <button
            onClick={() => navigate({ to: "/profile" })}
            aria-label="Profile"
            className="grid place-items-center size-9 rounded-full overflow-hidden bg-white/8 border border-white/12 hover:bg-white/12 transition"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <IconProfile className="size-[17px] text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-8 pb-5">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-white">
          How can I help you{user?.firstName ? `, ${user.firstName}` : ""} today?
        </h1>
      </div>

      {/* Composer */}
      <div className="relative z-20 px-4">
        <div className={`bg-white/8 border border-white/15 backdrop-blur-xl ${expanded ? "rounded-3xl p-2" : "rounded-full pl-5 pr-1.5 py-1.5"} flex ${expanded ? "flex-col gap-2" : "items-center gap-2"}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={
              active === "image" ? "Describe the image…" :
              active === "video" ? "Describe the video…" :
              active === "music" ? "Describe the music…" :
              "Ask anything..."
            }
            rows={expanded ? 3 : 1}
            className={`flex-1 resize-none bg-transparent ${expanded ? "px-3 pt-2" : "py-2.5"} text-[15px] outline-none text-white placeholder:text-white/55 max-h-48`}
          />
          {expanded ? (
            <div className="px-1">
              <div ref={modelMenuRef} className="flex items-start justify-between gap-2">
                <div className="flex-1 max-w-[260px]">
                  <button onClick={() => setShowModelMenu((v) => !v)} className="inline-flex w-full items-center gap-1.5 rounded-full bg-white/10 border border-white/15 pl-2 pr-3 py-1.5 text-[12.5px] text-white">
                    <span className="truncate pl-1">{modelLabel}</span>
                    <IconChevronDown className="ml-auto size-3.5 shrink-0" />
                  </button>

                  {showModelMenu && (
                    <div className="mt-2 w-full max-w-[260px] max-h-[320px] overflow-y-auto rounded-2xl bg-[oklch(0.13_0.02_250)] border border-white/15 p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2">
                      {modelOpts.map((m) => {
                        const isSelected = modelLabel === m.label;
                        return (
                          <button
                            key={m.label}
                            onClick={() => { setModelLabel(m.label); setShowModelMenu(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition ${isSelected ? "bg-white/12 text-white" : "text-white/85 hover:bg-white/6"}`}
                          >
                            <span className="flex-1 text-left truncate">{m.label}</span>
                            {m.freeForAll ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/25">FREE</span>
                            ) : m.unlimitedForSubs && isPro ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30">PRO</span>
                            ) : m.unlimitedForSubs || m.pro ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-200/85 border border-amber-300/25">PRO · {m.cost} cr</span>
                            ) : (
                              <span className="text-[11px] text-white/60 tabular-nums">{m.cost} cr</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={send} disabled={!input.trim() || sending} aria-label="Send" className="shrink-0 size-9 rounded-full bg-white/15 border border-white/15 text-white grid place-items-center disabled:opacity-50">
                  <IconArrowUp className="size-[18px]" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={send} disabled={!input.trim() || sending} aria-label="Send" className="shrink-0 size-9 rounded-full bg-white/15 border border-white/15 text-white grid place-items-center disabled:opacity-50">
              <IconArrowUp className="size-[18px]" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {chips.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActive(id);
                  setShowModelMenu(false);
                  const opts =
                    id === "video" ? videoModels :
                    id === "music" ? musicModels :
                    id === "image" ? imageModels :
                    chatModels;
                  setModelLabel(opts[0].label);
                  textareaRef.current?.focus();
                }}
                className={`inline-flex items-center gap-2 rounded-full border backdrop-blur px-4 py-2.5 text-[13px] font-medium text-white ${isActive ? "bg-white/15 border-white/25" : "bg-white/8 border-white/15"}`}
              >
                <Icon className="size-4 text-white/90" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Image preview (image mode result) */}
        {imgPreview && (
          <div className="mt-5 rounded-3xl overflow-hidden border border-white/15">
            <img src={imgPreview} alt="" className="w-full aspect-square object-cover" />
          </div>
        )}
      </div>

      {/* Imagine templates row */}
      <div className="mt-8 px-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold text-white">Imagine</h2>
        <button onClick={() => navigate({ to: "/templates/$type", params: { type: active === "video" ? "video" : "image" } })} className="text-[14px] font-medium text-primary">Show more</button>
      </div>
      <div className="mt-3 pl-4 pr-2 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[1,2,3,4].map((i) => <div key={i} className="shrink-0 w-[160px] aspect-[4/5] rounded-3xl bg-white/8" />)}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 px-6 pointer-events-none">
          <div className="mx-auto max-w-sm rounded-2xl bg-[oklch(0.14_0.02_250)] border border-white/15 px-4 py-3 text-center text-[13px] text-white shadow-2xl">{toast}</div>
        </div>
      )}
    </AppShell>
  );
}
