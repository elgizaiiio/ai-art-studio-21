import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass rounded-3xl p-6 max-w-sm text-center">
          <h1 className="text-2xl font-semibold">404</h1>
          <p className="mt-1 text-sm text-muted-foreground">Page not found</p>
          <a href="/" className="mt-4 inline-block rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Go home</a>
        </div>
      </div>
    ),
    defaultErrorComponent: ({ error, reset }) => (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass rounded-3xl p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error?.message ?? "Unknown error"}</p>
          <button onClick={() => { if (typeof window !== "undefined") window.location.reload(); reset(); }} className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Try again</button>
        </div>
      </div>
    ),
  });

  return router;
};
