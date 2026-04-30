import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const normalizeSupabaseUrl = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  if (!cleaned || cleaned.includes("your-project-ref.supabase.co")) return undefined;
  return cleaned;
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const normalizeAnonKey = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  if (!cleaned || cleaned === "your-anon-key") return undefined;
  return cleaned;
};
const supabaseAnonKey = normalizeAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
const clerkJwtTemplate = (import.meta.env.VITE_CLERK_SUPABASE_JWT_TEMPLATE as string | undefined)?.trim() || "supabase";

export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey);

/** Legacy anon client (avoid for production writes protected by RLS). */
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

export const getClerkJwtTemplate = (): string => clerkJwtTemplate;
