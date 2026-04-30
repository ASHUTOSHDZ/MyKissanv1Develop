import type { SupabaseClient } from "@supabase/supabase-js";

export const VEHICLE_OWNER_PROFILES_TABLE = "vehicle_owner_profiles" as const;
export const VEHICLE_RENTAL_ITEMS_TABLE = "vehicle_rental_items" as const;
export const VEHICLE_ITEM_RATINGS_TABLE = "vehicle_item_ratings" as const;

export type BillingUnit = "minute" | "hour" | "day" | "acre" | "km";
export type ListingKind = "vehicle" | "equipment" | "service";

export type VehicleOwnerProfile = {
  userId: string;
  ownerName: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  businessName: string;
  bio: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VehicleRentalItem = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerPhone: string;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  ownerGender: "male" | "female" | "other" | "prefer_not_to_say";
  title: string;
  useCaseLabel: string;
  description: string;
  listingKind: ListingKind;
  billingUnit: BillingUnit;
  rateAmount: number;
  imageUrl: string;
  ageYears: number | null;
  workingPercent: number | null;
  maxRentDays: number | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VehicleItemRating = {
  id: string;
  itemId: string;
  farmerUserId: string;
  farmerName: string;
  rating: number;
  review: string;
  createdAt: string;
  updatedAt: string;
};

export type VehicleItemRatingSummary = {
  itemId: string;
  avgRating: number;
  ratingCount: number;
};

type OwnerProfileRow = {
  user_id: string;
  owner_name: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  business_name: string;
  bio: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_phone: string;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  owner_gender: "male" | "female" | "other" | "prefer_not_to_say";
  title: string;
  use_case_label: string | null;
  description: string | null;
  listing_kind: ListingKind;
  billing_unit: BillingUnit;
  rate_amount: number;
  image_url: string | null;
  age_years: number | null;
  working_percent: number | null;
  max_rent_days: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

type RatingRow = {
  id: string;
  item_id: string;
  farmer_user_id: string;
  farmer_name: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
};

const mapOwnerProfile = (row: OwnerProfileRow): VehicleOwnerProfile => ({
  userId: row.user_id,
  ownerName: row.owner_name,
  phone: row.phone,
  state: row.state,
  district: row.district,
  block: row.block,
  village: row.village,
  pincode: row.pincode,
  gender: row.gender,
  businessName: row.business_name,
  bio: row.bio ?? "",
  isAvailable: row.is_available,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapItem = (row: ItemRow): VehicleRentalItem => ({
  id: row.id,
  ownerUserId: row.owner_user_id,
  ownerName: row.owner_name,
  ownerPhone: row.owner_phone,
  state: row.state,
  district: row.district,
  block: row.block,
  village: row.village,
  pincode: row.pincode,
  ownerGender: row.owner_gender,
  title: row.title,
  useCaseLabel: row.use_case_label ?? "",
  description: row.description ?? "",
  listingKind: row.listing_kind,
  billingUnit: row.billing_unit,
  rateAmount: row.rate_amount,
  imageUrl: row.image_url ?? "",
  ageYears: row.age_years,
  workingPercent: row.working_percent,
  maxRentDays: row.max_rent_days,
  isAvailable: row.is_available,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRating = (row: RatingRow): VehicleItemRating => ({
  id: row.id,
  itemId: row.item_id,
  farmerUserId: row.farmer_user_id,
  farmerName: row.farmer_name,
  rating: row.rating,
  review: row.review ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getVehicleOwnerProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: VehicleOwnerProfile | null; error: Error | null }> {
  const { data, error } = await client
    .from(VEHICLE_OWNER_PROFILES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };
  return { data: mapOwnerProfile(data as OwnerProfileRow), error: null };
}

export async function upsertVehicleOwnerProfile(
  client: SupabaseClient,
  profile: Omit<VehicleOwnerProfile, "createdAt" | "updatedAt">,
): Promise<{ data: VehicleOwnerProfile | null; error: Error | null }> {
  const payload = {
    user_id: profile.userId,
    owner_name: profile.ownerName.trim(),
    phone: profile.phone.trim(),
    state: profile.state.trim(),
    district: profile.district.trim(),
    block: profile.block.trim(),
    village: profile.village.trim(),
    pincode: profile.pincode.trim(),
    gender: profile.gender,
    business_name: profile.businessName.trim(),
    bio: profile.bio.trim(),
    is_available: profile.isAvailable,
  };
  const { data, error } = await client
    .from(VEHICLE_OWNER_PROFILES_TABLE)
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: mapOwnerProfile(data as OwnerProfileRow), error: null };
}

export async function upsertVehicleRentalItem(
  client: SupabaseClient,
  item: Omit<VehicleRentalItem, "createdAt" | "updatedAt">,
): Promise<{ data: VehicleRentalItem | null; error: Error | null }> {
  const payload = {
    id: item.id,
    owner_user_id: item.ownerUserId,
    owner_name: item.ownerName.trim(),
    owner_phone: item.ownerPhone.trim(),
    state: item.state.trim(),
    district: item.district.trim(),
    block: item.block.trim(),
    village: item.village.trim(),
    pincode: item.pincode.trim(),
    owner_gender: item.ownerGender,
    title: item.title.trim(),
    use_case_label: item.useCaseLabel.trim() || null,
    description: item.description.trim(),
    listing_kind: item.listingKind,
    billing_unit: item.billingUnit,
    rate_amount: item.rateAmount,
    image_url: item.imageUrl.trim() || null,
    age_years: item.ageYears,
    working_percent: item.workingPercent,
    max_rent_days: item.maxRentDays,
    is_available: item.isAvailable,
  };
  const { data, error } = await client
    .from(VEHICLE_RENTAL_ITEMS_TABLE)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: mapItem(data as ItemRow), error: null };
}

export async function listVehicleOwnerItems(
  client: SupabaseClient,
  ownerUserId: string,
): Promise<{ data: VehicleRentalItem[] | null; error: Error | null }> {
  const { data, error } = await client
    .from(VEHICLE_RENTAL_ITEMS_TABLE)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as ItemRow[]).map(mapItem), error: null };
}

export async function listAvailableItemsForFarmer(
  client: SupabaseClient,
  pincode?: string,
): Promise<{ data: VehicleRentalItem[] | null; error: Error | null }> {
  let q = client
    .from(VEHICLE_RENTAL_ITEMS_TABLE)
    .select("*")
    .eq("is_available", true)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (pincode?.trim()) q = q.eq("pincode", pincode.trim());
  const { data, error } = await q;
  if (error) return { data: null, error: new Error(error.message) };
  return { data: (data as ItemRow[]).map(mapItem), error: null };
}

export async function setVehicleItemAvailability(
  client: SupabaseClient,
  itemId: string,
  isAvailable: boolean,
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from(VEHICLE_RENTAL_ITEMS_TABLE)
    .update({ is_available: isAvailable })
    .eq("id", itemId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function upsertVehicleItemRating(
  client: SupabaseClient,
  payload: {
    itemId: string;
    farmerUserId: string;
    farmerName: string;
    rating: number;
    review?: string;
  },
): Promise<{ data: VehicleItemRating | null; error: Error | null }> {
  const { data, error } = await client
    .from(VEHICLE_ITEM_RATINGS_TABLE)
    .upsert(
      {
        item_id: payload.itemId,
        farmer_user_id: payload.farmerUserId,
        farmer_name: payload.farmerName.trim(),
        rating: payload.rating,
        review: payload.review?.trim() || null,
      },
      { onConflict: "item_id,farmer_user_id" },
    )
    .select("*")
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: mapRating(data as RatingRow), error: null };
}

export async function listRatingSummaryForItems(
  client: SupabaseClient,
  itemIds: string[],
): Promise<{ data: VehicleItemRatingSummary[]; error: Error | null }> {
  if (itemIds.length === 0) return { data: [], error: null };
  const { data, error } = await client
    .from(VEHICLE_ITEM_RATINGS_TABLE)
    .select("item_id,rating")
    .in("item_id", itemIds);
  if (error) return { data: [], error: new Error(error.message) };

  const map = new Map<string, { total: number; count: number }>();
  for (const row of (data ?? []) as { item_id: string; rating: number }[]) {
    const prev = map.get(row.item_id) ?? { total: 0, count: 0 };
    map.set(row.item_id, { total: prev.total + row.rating, count: prev.count + 1 });
  }
  return {
    data: itemIds.map((itemId) => {
      const agg = map.get(itemId);
      const count = agg?.count ?? 0;
      return {
        itemId,
        avgRating: count === 0 ? 0 : Number((agg!.total / count).toFixed(1)),
        ratingCount: count,
      };
    }),
    error: null,
  };
}
