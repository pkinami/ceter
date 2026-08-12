declare module "@supabase/ssr" {
  import type { CookieOptions, SupabaseClient } from "@supabase/supabase-js";

  export type CookieMethodsServer = {
    getAll(): Array<{ name: string; value: string }>;
    setAll(cookies: Array<{ name: string; value: string; options?: CookieOptions }>): void;
  };

  export function createBrowserClient(url: string, key: string): SupabaseClient;
  export function createServerClient(
    url: string,
    key: string,
    options: { cookies: CookieMethodsServer }
  ): SupabaseClient;
}
