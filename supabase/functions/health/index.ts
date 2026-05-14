// Health check para validar deploy de Edge Functions (sem segredos).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "reparo-expresso-health",
      ts: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
