import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requiredUrlEnv, requiredEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const url = requiredUrlEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    requiredEnv("SUPABASE_PUBLISHABLE_KEY", { format: "Supabase publishable or anon key" });

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot set cookies. Middleware/actions handle refreshes.
          }
        }
      }
    }
  );
}
