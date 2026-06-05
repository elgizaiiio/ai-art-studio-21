// Shared catalog of all media models exposed to the UI.
// Pricing rule: subscribers always pay 0 (unlimited). Free users pay `cost` points.
// Pollinations is free for everyone. deAPI = 1 point. Leonardo varies.

export type MediaKind = "image" | "video";
export type Provider = "pollinations" | "deapi" | "leonardo";

export interface ModelEntry {
  id: string;              // unique key used by the client
  label: string;           // display name
  kind: MediaKind;
  provider: Provider;
  providerModel?: string;  // slug or modelId passed to the provider
  cost: number;            // points charged to FREE users (subscribers always 0)
  freeForAll?: boolean;    // pollinations -> true
  unlimitedForSubs?: boolean;
  badge?: string;          // e.g. "Nano Banana", "New", "Pro"
  description?: string;
}

export const MODELS: ModelEntry[] = [
  // ---------- Pollinations (free for everyone) ----------
  {
    id: "pollinations-flux",
    label: "Pollinations Flux",
    kind: "image",
    provider: "pollinations",
    providerModel: "flux",
    cost: 0,
    freeForAll: true,
    description: "Free, unlimited for everyone.",
  },

  // ---------- deAPI (1 credit, unlimited for subscribers) ----------
  {
    id: "deapi-flux-schnell",
    label: "deAPI · Flux Schnell",
    kind: "image",
    provider: "deapi",
    providerModel: "Flux1schnell",
    cost: 1,
    unlimitedForSubs: true,
  },
  {
    id: "deapi-ltx-video",
    label: "deAPI · LTX Video",
    kind: "video",
    provider: "deapi",
    providerModel: "Ltxv_13B_0_9_8_Distilled_FP8",
    cost: 1,
    unlimitedForSubs: true,
  },

  // ---------- Leonardo IMAGE models (unlimited 0-credit for subscribers) ----------
  {
    id: "leo-nano-banana",
    label: "Nano Banana",
    kind: "image",
    provider: "leonardo",
    providerModel: "gemini-2.5-flash-image",
    cost: 5,
    unlimitedForSubs: true,
    badge: "Google",
  },
  {
    id: "leo-nano-banana-pro",
    label: "Nano Banana Pro",
    kind: "image",
    provider: "leonardo",
    providerModel: "gemini-image-2",
    cost: 10,
    unlimitedForSubs: true,
    badge: "Pro",
  },
  {
    id: "leo-flux-2-pro",
    label: "FLUX.2 Pro",
    kind: "image",
    provider: "leonardo",
    providerModel: "flux-pro-2.0",
    cost: 10,
    unlimitedForSubs: true,
    badge: "BFL",
  },
  {
    id: "leo-seedream-4-5",
    label: "Seedream 4.5",
    kind: "image",
    provider: "leonardo",
    providerModel: "seedream-4.5",
    cost: 8,
    unlimitedForSubs: true,
    badge: "ByteDance",
  },
  {
    id: "leo-gpt-image-2",
    label: "GPT Image 2",
    kind: "image",
    provider: "leonardo",
    providerModel: "gpt-image-2",
    cost: 10,
    unlimitedForSubs: true,
    badge: "OpenAI",
  },
  {
    id: "leo-lucid-origin",
    label: "Lucid Origin",
    kind: "image",
    provider: "leonardo",
    providerModel: "lucid-origin",
    cost: 6,
    unlimitedForSubs: true,
  },

  // ---------- Leonardo VIDEO models (unlimited 0-credit for subscribers) ----------
  {
    id: "leo-veo-3-1",
    label: "Veo 3.1",
    kind: "video",
    provider: "leonardo",
    providerModel: "veo-3.1",
    cost: 80,
    unlimitedForSubs: true,
    badge: "Google",
  },
  {
    id: "leo-veo-3-0",
    label: "Veo 3.0",
    kind: "video",
    provider: "leonardo",
    providerModel: "veo-3.0",
    cost: 60,
    unlimitedForSubs: true,
    badge: "Google",
  },
  {
    id: "leo-kling-2-6",
    label: "Kling 2.6",
    kind: "video",
    provider: "leonardo",
    providerModel: "kling-2.6",
    cost: 50,
    unlimitedForSubs: true,
  },
  {
    id: "leo-kling-2-5-turbo",
    label: "Kling 2.5 Turbo",
    kind: "video",
    provider: "leonardo",
    providerModel: "kling-2.5-turbo",
    cost: 40,
    unlimitedForSubs: true,
  },
  {
    id: "leo-seedance-2",
    label: "Seedance 2.0",
    kind: "video",
    provider: "leonardo",
    providerModel: "seedance-2.0",
    cost: 50,
    unlimitedForSubs: true,
    badge: "ByteDance",
  },
  {
    id: "leo-seedance-2-fast",
    label: "Seedance 2.0 Fast",
    kind: "video",
    provider: "leonardo",
    providerModel: "seedance-2.0-fast",
    cost: 35,
    unlimitedForSubs: true,
  },
  {
    id: "leo-hailuo-2-3",
    label: "Hailuo 2.3 Fast",
    kind: "video",
    provider: "leonardo",
    providerModel: "hailuo-2_3-fast",
    cost: 40,
    unlimitedForSubs: true,
  },
  {
    id: "leo-ltx-2-3",
    label: "LTX 2.3",
    kind: "video",
    provider: "leonardo",
    providerModel: "ltx-2.3",
    cost: 30,
    unlimitedForSubs: true,
  },
];

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.id === id);
}

export const IMAGE_MODELS = MODELS.filter((m) => m.kind === "image");
export const VIDEO_MODELS = MODELS.filter((m) => m.kind === "video");