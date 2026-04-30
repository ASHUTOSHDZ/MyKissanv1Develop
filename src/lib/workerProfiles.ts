import type { SupabaseClient } from "@supabase/supabase-js";

export const WORKER_PROFILES_TABLE = "worker_profiles" as const;

export type WorkerGender = "male" | "female" | "other";

export type WorkerProfile = {
  userId: string;
  fullName: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  pincode: string;
  skills: string[];
  minCostPerDay: number;
  age: number | null;
  gender: WorkerGender;
  availableFrom: string | null;
  availableTo: string | null;
  isOnline: boolean;
  bio: string;
  createdAt: string;
  updatedAt: string;
};

type WorkerRow = {
  user_id: string;
  full_name: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  pincode: string;
  skills: string[] | null;
  min_cost_per_day: number;
  age: number | null;
  gender: WorkerGender;
  available_from: string | null;
  available_to: string | null;
  is_online: boolean;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

const rowToProfile = (row: WorkerRow): WorkerProfile => ({
  userId: row.user_id,
  fullName: row.full_name,
  phone: row.phone,
  state: row.state,
  district: row.district,
  block: row.block,
  pincode: row.pincode,
  skills: (row.skills ?? []).filter(Boolean),
  minCostPerDay: row.min_cost_per_day,
  age: row.age,
  gender: row.gender,
  availableFrom: row.available_from,
  availableTo: row.available_to,
  isOnline: row.is_online,
  bio: row.bio ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type UpsertPayload = {
  user_id: string;
  full_name: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  pincode: string;
  skills: string[];
  min_cost_per_day: number;
  age: number | null;
  gender: WorkerGender;
  available_from: string | null;
  available_to: string | null;
  is_online: boolean;
  bio: string;
};

export async function upsertWorkerProfile(
  client: SupabaseClient,
  profile: Omit<WorkerProfile, "createdAt" | "updatedAt">,
): Promise<{ data: WorkerProfile | null; error: Error | null }> {
  const payload: UpsertPayload = {
    user_id: profile.userId,
    full_name: profile.fullName.trim(),
    phone: profile.phone.trim(),
    state: profile.state.trim(),
    district: profile.district.trim(),
    block: profile.block.trim(),
    pincode: profile.pincode.trim(),
    skills: profile.skills.map((s) => s.trim()).filter(Boolean),
    min_cost_per_day: profile.minCostPerDay,
    age: profile.age,
    gender: profile.gender,
    available_from: profile.availableFrom,
    available_to: profile.availableTo,
    is_online: profile.isOnline,
    bio: profile.bio.trim(),
  };

  const { data, error } = await client
    .from(WORKER_PROFILES_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: rowToProfile(data as WorkerRow), error: null };
}

export async function getWorkerProfileByUserId(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: WorkerProfile | null; error: Error | null }> {
  const { data, error } = await client
    .from(WORKER_PROFILES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };
  return { data: rowToProfile(data as WorkerRow), error: null };
}

export type WorkerSearchFilters = {
  pincode?: string;
  skill?: string;
  maxCostPerDay?: number;
  onlyOnline?: boolean;
};

export async function listWorkersForFarmer(
  client: SupabaseClient,
  filters: WorkerSearchFilters,
): Promise<{ data: WorkerProfile[] | null; error: Error | null }> {
  let q = client.from(WORKER_PROFILES_TABLE).select("*");
  if (filters.onlyOnline ?? true) q = q.eq("is_online", true);
  if (filters.pincode?.trim()) q = q.eq("pincode", filters.pincode.trim());
  if (filters.skill?.trim()) q = q.contains("skills", [filters.skill.trim()]);
  if (filters.maxCostPerDay && Number.isFinite(filters.maxCostPerDay) && filters.maxCostPerDay > 0) {
    q = q.lte("min_cost_per_day", filters.maxCostPerDay);
  }
  q = q.order("updated_at", { ascending: false }).limit(200);

  const { data, error } = await q;
  if (error) return { data: null, error: new Error(error.message) };
  const today = new Date().toISOString().slice(0, 10);
  const rows = (data as WorkerRow[]).map(rowToProfile).filter((w) => {
    if (!w.isOnline) return false;
    if (!w.availableFrom || !w.availableTo) return true;
    return w.availableFrom <= today && w.availableTo >= today;
  });
  return { data: rows, error: null };
}
