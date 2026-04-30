import type { SupabaseClient } from "@supabase/supabase-js";

export const FARM_JOBS_TABLE = "farm_jobs" as const;

export type JobPost = {
  id: string;
  farmerUserId: string;
  farmerName: string;
  /** Copied from `profiles.phone` when the farmer publishes/updates the job (denormalized for worker UI). */
  farmerPhone: string;
  pincode: string;
  district: string;
  state: string;
  block: string;
  farmingType: string;
  farmingTypeOther: string;
  jobRole: string;
  jobRoleOther: string;
  workersNeeded: number;
  location: string;
  duration: string;
  durationOther: string;
  minWagePerDay: number;
  foodProvided: boolean;
  transportProvided: boolean;
  extraRequirements: string;
  createdAt: string;
  updatedAt: string;
};

type FarmJobRow = {
  id: string;
  farmer_user_id: string;
  farmer_name: string;
  farmer_phone?: string | null;
  pincode: string;
  district: string;
  state: string;
  block: string;
  farming_type: string;
  farming_type_other: string;
  job_role: string;
  job_role_other: string;
  workers_needed: number;
  location: string;
  duration: string;
  duration_other: string;
  min_wage_per_day: number;
  food_provided: boolean;
  transport_provided: boolean;
  extra_requirements: string;
  created_at: string;
  updated_at: string;
};

const rowToJobPost = (row: FarmJobRow): JobPost => ({
  id: row.id,
  farmerUserId: row.farmer_user_id,
  farmerName: row.farmer_name,
  farmerPhone: (row.farmer_phone ?? "").trim(),
  pincode: row.pincode,
  district: row.district,
  state: row.state,
  block: row.block,
  farmingType: row.farming_type,
  farmingTypeOther: row.farming_type_other ?? "",
  jobRole: row.job_role,
  jobRoleOther: row.job_role_other ?? "",
  workersNeeded: row.workers_needed,
  location: row.location,
  duration: row.duration,
  durationOther: row.duration_other ?? "",
  minWagePerDay: row.min_wage_per_day,
  foodProvided: row.food_provided,
  transportProvided: row.transport_provided,
  extraRequirements: row.extra_requirements ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type InsertPayload = {
  farmer_user_id: string;
  farmer_name: string;
  farmer_phone: string;
  pincode: string;
  district: string;
  state: string;
  block: string;
  farming_type: string;
  farming_type_other: string;
  job_role: string;
  job_role_other: string;
  workers_needed: number;
  location: string;
  duration: string;
  duration_other: string;
  min_wage_per_day: number;
  food_provided: boolean;
  transport_provided: boolean;
  extra_requirements: string;
};

const toInsertPayload = (post: Omit<JobPost, "id" | "createdAt" | "updatedAt">): InsertPayload => ({
  farmer_user_id: post.farmerUserId,
  farmer_name: post.farmerName,
  farmer_phone: post.farmerPhone.trim(),
  pincode: post.pincode.trim(),
  district: post.district,
  state: post.state,
  block: post.block,
  farming_type: post.farmingType,
  farming_type_other: post.farmingTypeOther,
  job_role: post.jobRole,
  job_role_other: post.jobRoleOther,
  workers_needed: post.workersNeeded,
  location: post.location,
  duration: post.duration,
  duration_other: post.durationOther,
  min_wage_per_day: post.minWagePerDay,
  food_provided: post.foodProvided,
  transport_provided: post.transportProvided,
  extra_requirements: post.extraRequirements,
});

export type JobListFilters = {
  /** Exact match on job pincode (recommended for performance). */
  pincode?: string;
  /** Case-insensitive partial match on `district`. */
  district?: string;
  /** Case-insensitive partial match on `block`. */
  block?: string;
  /** Minimum offered wage per day (₹). */
  minWagePerDay?: number;
};

/**
 * Query jobs with optional filters. Supply at least `pincode` and/or `district` to avoid scanning the whole table.
 */
export async function listJobsWithFilters(
  client: SupabaseClient,
  filters: JobListFilters,
): Promise<{ data: JobPost[] | null; error: Error | null }> {
  const pincode = filters.pincode?.trim();
  const district = filters.district?.trim();
  const block = filters.block?.trim();
  const minWage = filters.minWagePerDay;

  if (!pincode && !district) {
    return {
      data: null,
      error: new Error("Set at least a pincode or district to search jobs."),
    };
  }

  let q = client.from(FARM_JOBS_TABLE).select("*");
  if (pincode) q = q.eq("pincode", pincode);
  if (district) q = q.ilike("district", `%${district}%`);
  if (block) q = q.ilike("block", `%${block}%`);
  if (minWage != null && Number.isFinite(minWage) && minWage > 0) {
    q = q.gte("min_wage_per_day", minWage);
  }
  q = q.order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as FarmJobRow[]).map(rowToJobPost), error: null };
}

/**
 * List recent active jobs without location filters.
 * Use this for "show all jobs" feeds in worker UI.
 */
export async function listAllRecentJobs(
  client: SupabaseClient,
): Promise<{ data: JobPost[] | null; error: Error | null }> {
  const { data, error } = await client
    .from(FARM_JOBS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as FarmJobRow[]).map(rowToJobPost), error: null };
}

export async function listJobsByPincode(
  client: SupabaseClient,
  pincode: string,
): Promise<{ data: JobPost[] | null; error: Error | null }> {
  return listJobsWithFilters(client, { pincode });
}

export async function listJobsForFarmer(
  client: SupabaseClient,
  farmerUserId: string,
  pincode: string,
): Promise<{ data: JobPost[] | null; error: Error | null }> {
  const { data, error } = await client
    .from(FARM_JOBS_TABLE)
    .select("*")
    .eq("pincode", pincode.trim())
    .eq("farmer_user_id", farmerUserId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as FarmJobRow[]).map(rowToJobPost), error: null };
}

export async function getJobById(
  client: SupabaseClient,
  id: string,
): Promise<{ data: JobPost | null; error: Error | null }> {
  const { data, error } = await client.from(FARM_JOBS_TABLE).select("*").eq("id", id).maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };
  return { data: rowToJobPost(data as FarmJobRow), error: null };
}

export async function addJob(
  client: SupabaseClient,
  post: Omit<JobPost, "id" | "createdAt" | "updatedAt">,
): Promise<{ data: JobPost | null; error: Error | null }> {
  const { data, error } = await client
    .from(FARM_JOBS_TABLE)
    .insert(toInsertPayload(post))
    .select("*")
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: rowToJobPost(data as FarmJobRow), error: null };
}

export async function updateJob(
  client: SupabaseClient,
  farmerUserId: string,
  id: string,
  patch: Partial<Omit<JobPost, "id" | "farmerUserId" | "createdAt">>,
): Promise<{ data: JobPost | null; error: Error | null }> {
  const snake: Record<string, unknown> = {};
  if (patch.farmerName !== undefined) snake.farmer_name = patch.farmerName;
  if (patch.farmerPhone !== undefined) snake.farmer_phone = patch.farmerPhone.trim();
  if (patch.pincode !== undefined) snake.pincode = patch.pincode.trim();
  if (patch.district !== undefined) snake.district = patch.district;
  if (patch.state !== undefined) snake.state = patch.state;
  if (patch.block !== undefined) snake.block = patch.block;
  if (patch.farmingType !== undefined) snake.farming_type = patch.farmingType;
  if (patch.farmingTypeOther !== undefined) snake.farming_type_other = patch.farmingTypeOther;
  if (patch.jobRole !== undefined) snake.job_role = patch.jobRole;
  if (patch.jobRoleOther !== undefined) snake.job_role_other = patch.jobRoleOther;
  if (patch.workersNeeded !== undefined) snake.workers_needed = patch.workersNeeded;
  if (patch.location !== undefined) snake.location = patch.location;
  if (patch.duration !== undefined) snake.duration = patch.duration;
  if (patch.durationOther !== undefined) snake.duration_other = patch.durationOther;
  if (patch.minWagePerDay !== undefined) snake.min_wage_per_day = patch.minWagePerDay;
  if (patch.foodProvided !== undefined) snake.food_provided = patch.foodProvided;
  if (patch.transportProvided !== undefined) snake.transport_provided = patch.transportProvided;
  if (patch.extraRequirements !== undefined) snake.extra_requirements = patch.extraRequirements;

  const { data, error } = await client
    .from(FARM_JOBS_TABLE)
    .update(snake)
    .eq("id", id)
    .eq("farmer_user_id", farmerUserId)
    .select("*")
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: rowToJobPost(data as FarmJobRow), error: null };
}

export async function deleteJob(
  client: SupabaseClient,
  farmerUserId: string,
  id: string,
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from(FARM_JOBS_TABLE)
    .delete()
    .eq("id", id)
    .eq("farmer_user_id", farmerUserId);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}
