import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconChat = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8H6l-2 2v-10z" />
    <circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

/* ---------- Bottom nav (coherent rounded geometric family) ---------- */

export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 11.4 12 4l8.5 7.4" />
    <path d="M5.4 10.2V19a1 1 0 0 0 1 1H10v-4.6a2 2 0 0 1 4 0V20h3.6a1 1 0 0 0 1-1v-8.8" />
  </svg>
);

export const IconTasks = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 4.5h8a1 1 0 0 1 1 1V6h1.5A1.5 1.5 0 0 1 20 7.5v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H7v-.5a1 1 0 0 1 1-1Z" />
    <path d="M9 4.5h6v2H9z" fill="currentColor" stroke="none" />
    <path d="m8 13 2.4 2.4L15.5 10.3" />
  </svg>
);

export const IconReferral = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8.5" r="3.3" />
    <path d="M3 19.5c0-3.1 2.7-5.5 6-5.5s6 2.4 6 5.5" />
    <path d="M17 6.5h5M19.5 4v5" />
  </svg>
);

export const IconPricing = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12.6 3.4 20 10.8a1.4 1.4 0 0 1 0 2L13 19.8a1.4 1.4 0 0 1-2 0L3.4 12.2a1.4 1.4 0 0 1-.4-1.1l.5-6.2A1.4 1.4 0 0 1 4.9 3.6l6.2-.5a1.4 1.4 0 0 1 1.5.3Z" />
    <circle cx="8.4" cy="8.4" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconUpgrade = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3l4 5h-2.5v6h-3V8H8l4-5z" />
    <path d="M5 18h14" />
    <path d="M6 21h12" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconArrowUp = (p: P) => (
  <svg {...base} {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);

export const IconImage = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 17l-5-5-8 8" />
  </svg>
);

export const IconVideo = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="13" height="12" rx="3" />
    <path d="M16 10l5-3v10l-5-3z" />
  </svg>
);

export const IconDoc = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const IconSlides = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M9 21h6M12 17v4" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M21 21l-4-4" />
    <path d="M9 11h4M11 9v4" />
  </svg>
);

export const IconCoin = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M9 9.5c0-1 1.3-1.5 3-1.5s3 .8 3 2-1.3 1.6-3 1.6-3 .6-3 1.7 1.3 1.7 3 1.7 3-.5 3-1.5" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 012-2h9" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base} {...p}><path d="M5 12l5 5L20 7" /></svg>
);

export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
  </svg>
);

export const IconBack = (p: P) => (
  <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);

export const IconAgent = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2l1.8 4.2L18 8l-4.2 1.8L12 14l-1.8-4.2L6 8l4.2-1.8L12 2z" />
    <circle cx="12" cy="8" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconImagine = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 4l1.2 2.8L19 8l-2.8 1.2L15 12l-1.2-2.8L11 8l2.8-1.2L15 4z" />
    <path d="M7 13l.9 2.1L10 16l-2.1.9L7 19l-.9-2.1L4 16l2.1-.9L7 13z" />
  </svg>
);

export const IconProfile = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base} {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>
);

/* IconHome defined above with the nav family */

export const IconMusic = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 18V6l12-2v12" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const IconGramMark = (p: P) => (
  <svg {...base} {...p} viewBox="0 0 24 24" strokeWidth={2.1}>
    <path d="M19.3 8.4A7.85 7.85 0 1 0 19.55 15H13.2" />
    <path d="M21 12.2h-7.8" />
    <path d="M21 12.2v4.7" />
  </svg>
);

/* ---------- Service chips (matching family with one accent sparkle each) ---------- */

export const IconChipChat = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 5h11a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-5.4l-3.4 2.6a.5.5 0 0 1-.8-.4V16H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
    <path d="M7.5 9.5h6M7.5 12.2h4" />
  </svg>
);

export const IconChipImage = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.6" />
    <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
    <path d="m3.4 17 4.8-4.6a1.2 1.2 0 0 1 1.65 0L13 15.6l2.6-2.4a1.2 1.2 0 0 1 1.65 0L21 16.8" />
  </svg>
);

export const IconChipVideo = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="5.5" width="14.5" height="13" rx="3" />
    <path d="m17 10 4.2-2.6a.7.7 0 0 1 1.05.6v8a.7.7 0 0 1-1.05.6L17 14" />
    <path d="M8.5 9.6v4.8a.6.6 0 0 0 .9.5l4.1-2.4a.6.6 0 0 0 0-1L9.4 9.1a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChipMusic = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 16.5V6.4a.8.8 0 0 1 .62-.78l8-1.9a.8.8 0 0 1 .98.78v10" />
    <ellipse cx="7.5" cy="16.5" rx="2.5" ry="2.2" fill="currentColor" stroke="none" />
    <ellipse cx="17.1" cy="14.5" rx="2.5" ry="2.2" fill="currentColor" stroke="none" />
    <path d="M10 10 19.6 8" />
  </svg>
);
