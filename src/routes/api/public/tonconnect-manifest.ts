import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tonconnect-manifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const manifest = {
          url: origin,
          name: "Gram AI",
          iconUrl:
            "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7d1e38b-0108-4f11-a317-869434ceec4a/id-preview-fbeec4ba--95395e69-8f2c-415e-995a-e5f4015731e7.lovable.app-1780598694672.png",
          termsOfUseUrl: `${origin}/terms`,
          privacyPolicyUrl: `${origin}/privacy`,
        };
        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});