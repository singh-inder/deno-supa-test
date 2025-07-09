import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { tasks as originalTasks } from "npm:@trigger.dev/sdk/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type PayloadType = { householdId: string; delayedTimeOfUseUpdateRequired?: boolean };

// Modify the function to accept `tasks` as an argument, defaulting to the actual tasks module
export function createHandler(tasks = originalTasks) {
  return async function (req: Request) {
    if (req.method !== "POST") {
      console.log(`Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, Allow: "POST" },
        status: 405
      });
    }

    try {
      const payload: PayloadType = await req.json();
      const job = await tasks.trigger("update-system-settings", payload, {
        metadata: {
          source: "supabase-system-settings-handler"
        }
      });

      console.log(`Job: ${JSON.stringify(job)}`);
      return new Response(JSON.stringify(job), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
  };
}

// Pass the handler with the default `tasks` module to Deno.serve
Deno.serve(createHandler());

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hello' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
