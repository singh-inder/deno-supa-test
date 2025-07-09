import { assert, assertEquals } from "jsr:@std/assert";
import { createHandler } from "./hello/index.ts";
// import { Database } from "@/database-types";
import { createClient } from "npm:@supabase/supabase-js";
import { tasks } from "npm:@trigger.dev/sdk/v3";

//#region - Generic Retry Function
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 10,
  delay = 1000
): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`Retry ${attempt} failed.`);
      if (attempt < retries) {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}
//#endregion

//#region - Configurations
// Set up the configuration for the Supabase client
// const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseUrl = "http://localhost:54321";
// const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};
//#endregion

//#region - Mock Trigger.dev
const mockTasks = {
  trigger: (jobName: string, payload: object) => {
    return { id: "mock-id", status: "success", jobName, payload };
  }
} as unknown as typeof tasks;
//#endregion

// TODO: Improve this test

// Test triggering the update system settings handler
Deno.test("Test triggering the update system settings handler", async () => {
  // Use the handler with the mocked `tasks` object
  const handler = createHandler(mockTasks);

  // Simulate the POST request to the handler
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ householdId: "1", delayedTimeOfUseUpdateRequired: true })
  });

  const response = await handler(request);
  const data = await response.json();

  // Assertions
  assertEquals(response.status, 200);
  assertEquals(data, {
    id: "mock-id",
    status: "success",
    jobName: "update-system-settings",
    payload: { householdId: "1", delayedTimeOfUseUpdateRequired: true }
  });
});

// Test that the function returns an error if the request method is not a POST
Deno.test(
  "[Unit Test] Method Not POST",
  { sanitizeOps: false, sanitizeResources: false },
  async () => {
    await withRetry(async () => {
      const anonClient = createClient(supabaseUrl, anonKey, options);

      // Optional: check the endpoint is reachable (HEAD request or GET if allowed)
      /* const checkResponse = await fetch(
        `${supabaseUrl}/functions/v1/update-system-settings-handler`
      );
      console.log(
        `Function (${supabaseUrl}/functions/v1/update-system-settings-handler) reachable: ${checkResponse.status}`
      ); */

      const { data, error } = await anonClient.functions.invoke("hello", {
        method: "PUT",
        headers: { Authorization: `Bearer ${anonKey}` },
        body: {}
      });

      const errorContext = await error.context;
      const errorMessage = (await errorContext.json()).error;
      const status = errorContext.status;
      const allowHeader = errorContext.headers.get("Allow");

      console.log(`message: ${errorMessage}`);
      console.log(`status: ${status}`);
      console.log(`headers: ${allowHeader}`);

      assertEquals(data, null);
      assert(error);
      assertEquals(errorMessage, "Method not allowed");
      assertEquals(status, 405);
      assertEquals(allowHeader, "POST");
    });
  }
);

// TODO: Test that the function returns an error if householdId or delayedTimeOfUseUpdateRequired is not provided

// TODO: Test that the function returns handles when the update system settings handler fails

// TODO: Test for missing api key (not sure how do this if mocking the tasks object)
