import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { initTelegram } from "../lib/telegram";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    // Auto-recover from stale chunk errors after a deploy
    const msg = String(error?.message || "");
    if (/Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError/i.test(msg)) {
      if (typeof window !== "undefined") window.location.reload();
    }
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { if (typeof window !== "undefined") window.location.reload(); router.invalidate(); reset(); }} className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass rounded-3xl p-6 max-w-sm text-center">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="mt-1 text-sm text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover, user-scalable=no" },
      { title: "Gram AI" },
      { name: "description", content: "AI assistant for Telegram: chat, images, videos, docs." },
      { name: "theme-color", content: "#0a0a0a" },
      { property: "og:title", content: "Gram AI" },
      { name: "twitter:title", content: "Gram AI" },
      { property: "og:description", content: "AI assistant for Telegram: chat, images, videos, docs." },
      { name: "twitter:description", content: "AI assistant for Telegram: chat, images, videos, docs." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7d1e38b-0108-4f11-a317-869434ceec4a/id-preview-fbeec4ba--95395e69-8f2c-415e-995a-e5f4015731e7.lovable.app-1780598694672.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7d1e38b-0108-4f11-a317-869434ceec4a/id-preview-fbeec4ba--95395e69-8f2c-415e-995a-e5f4015731e7.lovable.app-1780598694672.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{ src: "https://telegram.org/js/telegram-web-app.js?57" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    // Safe outside Telegram — returns null silently.
    try { initTelegram(); } catch {}
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
