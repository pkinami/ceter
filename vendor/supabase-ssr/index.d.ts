import type { SupabaseClient } from "@supabase/supabase-js";

type Cookie = { name: string; value: string; options?: Record<string, unknown> };
type CookieAdapter = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookies: Cookie[]) => void;
};

export declare function createBrowserClient(url: string, key: string): SupabaseClient;
export declare function createServerClient(url: string, key: string, options: { cookies: CookieAdapter }): SupabaseClient;
