import { createAnonymousSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseBrowser";

export type UserRole = "farmer" | "worker" | "vendor" | "vehicle_owner";

export interface OnboardingProfile {
  role: UserRole;
  fullName: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  village?: string;
  pincode: string;
  crops?: string[];
  farmSize?: string;
  mainCrop?: string;
}

const KEY_PREFIX = "mykissan:profile:";
const TABLE = "profiles";

const supabase = createAnonymousSupabaseClient();

type ProfileRow = OnboardingProfile & { user_id: string };

const localGetProfile = (userId: string): OnboardingProfile | null => {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
};

const localSaveProfile = (userId: string, profile: OnboardingProfile | Partial<OnboardingProfile>) => {
  localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(profile));
};

export const getProfile = async (userId: string): Promise<OnboardingProfile | null> => {
  if (!supabase || !isSupabaseConfigured()) return localGetProfile(userId);
  const { data, error } = await supabase
    .from(TABLE)
    .select("role,fullName,phone,state,district,block,village,pincode,crops,farmSize,mainCrop")
    .eq("user_id", userId)
    .maybeSingle<OnboardingProfile>();
  if (error) {
    console.warn("Supabase getProfile failed, using local profile fallback", error.message);
    return localGetProfile(userId);
  }
  return data ?? null;
};

export const saveProfile = async (userId: string, profile: OnboardingProfile) => {
  if (!supabase || !isSupabaseConfigured()) {
    localSaveProfile(userId, profile);
    return;
  }
  const payload: ProfileRow = { user_id: userId, ...profile };
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" });
  if (error) {
    console.warn("Supabase saveProfile failed, saving locally", error.message);
    localSaveProfile(userId, profile);
  }
};

export const saveRole = async (userId: string, role: UserRole) => {
  const existing = await getProfile(userId);
  const next = { ...(existing ?? {}), role };
  if (!supabase || !isSupabaseConfigured()) {
    localSaveProfile(userId, next);
    return;
  }
  const payload = { user_id: userId, role };
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" });
  if (error) {
    console.warn("Supabase saveRole failed, saving locally", error.message);
    localSaveProfile(userId, next);
  }
};

export const ROLE_LABELS: Record<UserRole, string> = {
  farmer: "Farmer",
  worker: "Worker",
  vendor: "Vendor",
  vehicle_owner: "Vehicle Owner",
};

export const isOnboardingComplete = (profile: OnboardingProfile | null): boolean => {
  if (!profile?.role) return false;
  const basicsDone = Boolean(
    profile.fullName?.trim() &&
      profile.phone?.trim() &&
      profile.state?.trim() &&
      profile.district?.trim() &&
      profile.block?.trim() &&
      profile.pincode?.trim(),
  );
  if (!basicsDone) return false;
  if (profile.role === "farmer") {
    return Array.isArray(profile.crops) && profile.crops.length > 0;
  }
  return true;
};
