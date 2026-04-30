import type { SupabaseClient } from "@supabase/supabase-js";

const PROFILES_TABLE = "profiles" as const;

export type FarmerProfilePublic = {
  userId: string;
  fullName: string;
  phone: string;
  village: string | null;
  block: string;
  district: string;
  state: string;
  pincode: string;
};

/**
 * Reads `public.profiles` for the posting farmer (anon key must be allowed to SELECT this row in Supabase).
 */
export async function fetchFarmerProfilePublic(
  client: SupabaseClient,
  farmerUserId: string,
): Promise<{ data: FarmerProfilePublic | null; error: Error | null }> {
  const { data, error } = await client
    .from(PROFILES_TABLE)
    .select("user_id, fullName, phone, village, block, district, state, pincode")
    .eq("user_id", farmerUserId)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };

  const row = data as {
    user_id: string;
    fullName: string;
    phone: string;
    village: string | null;
    block: string;
    district: string;
    state: string;
    pincode: string;
  };

  return {
    data: {
      userId: row.user_id,
      fullName: row.fullName,
      phone: (row.phone ?? "").trim(),
      village: row.village ?? null,
      block: row.block,
      district: row.district,
      state: row.state,
      pincode: row.pincode,
    },
    error: null,
  };
}
