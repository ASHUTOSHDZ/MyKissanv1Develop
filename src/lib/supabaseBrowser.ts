import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const normalizeSupabaseUrl = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey);

/** Profile/onboarding reads/writes using the anon key only (matches existing app behavior). */
export const createAnonymousSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

/**
 * Optional: pass a Clerk JWT on each request when you enable strict RLS + Supabase third-party auth.
 * Default app code uses {@link createAnonymousSupabaseClient} for `farm_jobs` instead.
 */
export const createClerkSupabaseClient = (
  getAccessToken: () => Promise<string | null>,
): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const token = await getAccessToken();
        const headers = new Headers(init?.headers ?? {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
};
