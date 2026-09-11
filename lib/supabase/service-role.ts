import { createClient } from "@supabase/supabase-js";
import { requiredEnv, requiredUrlEnv } from "@/lib/env";

export function createServiceRoleClient() {
  const url = requiredUrlEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY", { format: "Supabase service role JWT" });

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
