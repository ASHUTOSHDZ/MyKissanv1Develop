import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { type OnboardingProfile, ROLE_LABELS } from "@/lib/onboarding";
import { createAnonymousSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseBrowser";
import {
  type BillingUnit,
  type ListingKind,
  type VehicleOwnerProfile,
  type VehicleRentalItem,
  getVehicleOwnerProfile,
  listRatingSummaryForItems,
  listVehicleOwnerItems,
  setVehicleItemAvailability,
  upsertVehicleOwnerProfile,
  upsertVehicleRentalItem,
  VEHICLE_ITEM_RATINGS_TABLE,
  VEHICLE_RENTAL_ITEMS_TABLE,
} from "@/lib/vehicleOwnerCatalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VehicleOwnerDashboardProps = {
  profile: OnboardingProfile;
};

const randomId = () => crypto.randomUUID();
const toOptionalNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
const toDisplayValue = (value: number | null): string => (value == null || Number.isNaN(value) ? "" : String(value));

const USE_CASE_OPTIONS = [
  "Equipment Rental (Without Operator)",
  "Grass Cutter Machine",
  "Water Pump",
  "Generator",
  "Welding Machine",
  "Drill Machine",
  "Chainsaw",
  "Electric Sprayer",
  "Soil Testing Kit",
  "Power Washer",
  "Tractor Ploughing Service",
  "Rotavator Work Service",
  "Harvesting Service",
  "Seed Sowing Service",
  "Spraying Fertilizer/Pesticide Service",
  "Goods Transport Service",
  "Shifting Service",
  "Sand/Soil Transport Service",
  "JCB Digging Service",
  "Land Leveling Service",
  "Borewell Drilling Service",
] as const;

const emptyItemDraft = (base: OnboardingProfile, ownerUserId: string): Omit<VehicleRentalItem, "createdAt" | "updatedAt"> => ({
  id: randomId(),
  ownerUserId,
  ownerName: base.fullName,
  ownerPhone: base.phone,
  state: base.state,
  district: base.district,
  block: base.block,
  village: base.village ?? "",
  pincode: base.pincode,
  ownerGender: "prefer_not_to_say",
  title: "",
  useCaseLabel: "",
  description: "",
  listingKind: "vehicle",
  billingUnit: "hour",
  rateAmount: 0,
  imageUrl: "",
  ageYears: null,
  workingPercent: null,
  maxRentDays: null,
  isAvailable: true,
});

export const VehicleOwnerDashboard = ({ profile }: VehicleOwnerDashboardProps) => {
  const { user } = useUser();
  const supabase = useMemo(() => createAnonymousSupabaseClient(), []);

  const [ownerProfile, setOwnerProfile] = useState<VehicleOwnerProfile | null>(null);
  const [ownerProfileSaving, setOwnerProfileSaving] = useState(false);
  const [ownerBusinessName, setOwnerBusinessName] = useState("");
  const [ownerBio, setOwnerBio] = useState("");
  const [ownerAvailability, setOwnerAvailability] = useState(true);
  const [ownerGender, setOwnerGender] = useState<"male" | "female" | "other" | "prefer_not_to_say">("prefer_not_to_say");

  const [items, setItems] = useState<VehicleRentalItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemDraft, setItemDraft] = useState<Omit<VehicleRentalItem, "createdAt" | "updatedAt"> | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [ratingSummary, setRatingSummary] = useState<Record<string, { avgRating: number; ratingCount: number }>>({});

  const loadOwnerProfile = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured() || !user?.id) return;
    const { data, error } = await getVehicleOwnerProfile(supabase, user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      setOwnerProfile(data);
      setOwnerBusinessName(data.businessName);
      setOwnerBio(data.bio);
      setOwnerAvailability(data.isAvailable);
      setOwnerGender(data.gender);
      return;
    }
    setOwnerBusinessName(`${profile.fullName}'s Rentals`);
    setOwnerBio("");
    setOwnerAvailability(true);
    setOwnerGender("prefer_not_to_say");
  }, [supabase, user?.id, profile.fullName]);

  const loadItems = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured() || !user?.id) {
      setItemsLoading(false);
      return;
    }
    setItemsLoading(true);
    const { data, error } = await listVehicleOwnerItems(supabase, user.id);
    setItemsLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(data ?? []);
  }, [supabase, user?.id]);

  const loadRatings = useCallback(async (itemIds: string[]) => {
    if (!supabase || !isSupabaseConfigured()) return;
    const { data, error } = await listRatingSummaryForItems(supabase, itemIds);
    if (error) return;
    const next: Record<string, { avgRating: number; ratingCount: number }> = {};
    for (const row of data) next[row.itemId] = { avgRating: row.avgRating, ratingCount: row.ratingCount };
    setRatingSummary(next);
  }, [supabase]);

  useEffect(() => {
    void loadOwnerProfile();
    void loadItems();
  }, [loadOwnerProfile, loadItems]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`vehicle-owner-items:${user?.id ?? "unknown"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: VEHICLE_RENTAL_ITEMS_TABLE, filter: `owner_user_id=eq.${user?.id ?? ""}` },
        () => void loadItems(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, loadItems]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`vehicle-owner-ratings:${user?.id ?? "unknown"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: VEHICLE_ITEM_RATINGS_TABLE }, () => void loadRatings(items.map((i) => i.id)))
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, items, loadRatings]);

  useEffect(() => {
    void loadRatings(items.map((item) => item.id));
  }, [items, loadRatings]);

  useEffect(() => {
    if (!itemDraft && user?.id) {
      setItemDraft(emptyItemDraft(profile, user.id));
    }
  }, [itemDraft, profile, user?.id]);

  const saveOwnerProfile = async () => {
    if (!supabase || !isSupabaseConfigured() || !user?.id) {
      toast.error("Supabase is not configured.");
      return;
    }
    if (!ownerBusinessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    setOwnerProfileSaving(true);
    const { data, error } = await upsertVehicleOwnerProfile(supabase, {
      userId: user.id,
      ownerName: profile.fullName,
      phone: profile.phone,
      state: profile.state,
      district: profile.district,
      block: profile.block,
      village: profile.village ?? "",
      pincode: profile.pincode,
      gender: ownerGender,
      businessName: ownerBusinessName.trim(),
      bio: ownerBio.trim(),
      isAvailable: ownerAvailability,
    });
    setOwnerProfileSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOwnerProfile(data);
    toast.success("Owner profile updated.");
  };

  const startAdd = () => {
    if (!user?.id) return;
    setEditingItemId(null);
    setItemDraft({ ...emptyItemDraft(profile, user.id), ownerGender, village: profile.village ?? "" });
  };

  const startEdit = (item: VehicleRentalItem) => {
    setEditingItemId(item.id);
    setItemDraft({ ...item, ownerGender: item.ownerGender || ownerGender, village: item.village || profile.village || "" });
  };

  const saveItem = async () => {
    if (!supabase || !isSupabaseConfigured() || !itemDraft) return;
    if (!itemDraft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!ownerBusinessName.trim()) {
      toast.error("Save your owner profile first.");
      return;
    }
    if (!Number.isFinite(itemDraft.rateAmount) || itemDraft.rateAmount <= 0) {
      toast.error("Rate must be greater than 0.");
      return;
    }
    if (!itemDraft.useCaseLabel.trim()) {
      toast.error("Please select a use case.");
      return;
    }
    if (itemDraft.workingPercent != null && (itemDraft.workingPercent < 1 || itemDraft.workingPercent > 100)) {
      toast.error("Working percentage must be between 1 and 100.");
      return;
    }
    const draftToSave: Omit<VehicleRentalItem, "createdAt" | "updatedAt"> = {
      ...itemDraft,
      ownerName: profile.fullName,
      ownerPhone: profile.phone,
      state: profile.state,
      district: profile.district,
      block: profile.block,
      village: profile.village ?? "",
      pincode: profile.pincode,
      ownerGender,
    };
    setItemSaving(true);
    const { error } = await upsertVehicleRentalItem(supabase, draftToSave);
    setItemSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingItemId ? "Item updated." : "Item added.");
    await loadItems();
    startAdd();
  };

  const toggleAvailability = async (item: VehicleRentalItem) => {
    if (!supabase || !isSupabaseConfigured()) return;
    const next = !item.isAvailable;
    const { error } = await setVehicleItemAvailability(supabase, item.id, next);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isAvailable: next } : it)));
    toast.success(next ? "Item set to available." : "Item set to unavailable.");
  };

  const onUploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !itemDraft) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image size should be under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setItemDraft((v) => (v ? { ...v, imageUrl: result } : v));
      toast.success("Photo selected.");
    };
    reader.onerror = () => toast.error("Failed to read image.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-lime-50/40">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-5 sm:p-7 shadow-[0_18px_48px_-18px_rgba(16,185,129,0.35)] transition-all duration-300 hover:shadow-[0_24px_56px_-18px_rgba(16,185,129,0.42)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-lime-200/35 blur-3xl" />
          <div className="relative inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS.vehicle_owner} dashboard
          </div>
          <h1 className="relative font-display text-3xl sm:text-5xl lg:text-6xl text-emerald-900 font-black tracking-tight">Welcome, {profile.fullName.split(" ")[0]}</h1>
          <p className="relative text-sm sm:text-base text-emerald-900/70 mt-3 leading-relaxed">
            Manage vehicles, equipment and service listings. Farmer dashboard updates in realtime when you create, edit or change availability.
          </p>
          {!isSupabaseConfigured() || !supabase ? (
            <p className="mt-4 text-sm font-medium text-destructive/90 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5 shadow-sm">
              Configure Supabase env vars and run <code className="text-xs font-bold">supabase/vehicle_owner_schema.sql</code>, then reload.
            </p>
          ) : null}
        </section>

        <section className="sticky top-16 z-20 rounded-2xl border border-emerald-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-3 py-3 shadow-[0_10px_26px_-18px_rgba(16,185,129,0.45)]">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            <a href="#owner-profile" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Owner Profile</a>
            <a href="#owner-add-listing" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Add Listing</a>
            <a href="#owner-my-listings" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">My Listings</a>
          </div>
        </section>

        <section id="owner-profile" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">Owner profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-business-name">Business name</Label>
              <Input id="owner-business-name" value={ownerBusinessName} onChange={(e) => setOwnerBusinessName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-gender">Gender</Label>
              <select
                id="owner-gender"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ownerGender}
                onChange={(e) => setOwnerGender(e.target.value as "male" | "female" | "other" | "prefer_not_to_say")}
              >
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-availability">Owner availability</Label>
              <select
                id="owner-availability"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ownerAvailability ? "available" : "not_available"}
                onChange={(e) => setOwnerAvailability(e.target.value === "available")}
              >
                <option value="available">Available for booking</option>
                <option value="not_available">Not available</option>
              </select>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="owner-bio">About your service</Label>
            <Input id="owner-bio" value={ownerBio} onChange={(e) => setOwnerBio(e.target.value)} placeholder="Service area, operator details, support info..." />
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 p-4 text-xs text-emerald-900/80 space-y-1 shadow-sm">
            <p><span className="font-semibold text-emerald-900">Name:</span> {profile.fullName}</p>
            <p><span className="font-semibold text-emerald-900">Phone:</span> {profile.phone}</p>
            <p><span className="font-semibold text-emerald-900">State:</span> {profile.state}</p>
            <p><span className="font-semibold text-emerald-900">District:</span> {profile.district}</p>
            <p><span className="font-semibold text-emerald-900">Block:</span> {profile.block}</p>
            <p><span className="font-semibold text-emerald-900">Village:</span> {profile.village || "-"}</p>
            <p><span className="font-semibold text-emerald-900">Pincode:</span> {profile.pincode}</p>
            <p><span className="font-semibold text-emerald-900">Gender:</span> {ownerGender.replaceAll("_", " ")}</p>
          </div>
          <div className="mt-4">
            <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 font-bold uppercase tracking-widest text-xs shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]" disabled={ownerProfileSaving} onClick={saveOwnerProfile}>
              {ownerProfileSaving ? "Saving..." : ownerProfile ? "Update profile" : "Create profile"}
            </Button>
          </div>
        </section>

        <section id="owner-add-listing" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black text-emerald-900">{editingItemId ? "Edit listing" : "Add listing"}</h2>
            <Button variant="outline" className="text-xs uppercase tracking-widest font-bold" onClick={startAdd}>
              New listing
            </Button>
          </div>
          {!itemDraft ? null : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-title">Title</Label>
                  <Input id="item-title" value={itemDraft.title} onChange={(e) => setItemDraft((v) => (v ? { ...v, title: e.target.value } : v))} placeholder="e.g. Tractor with rotavator" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-use-case">Use case</Label>
                  <select
                    id="item-use-case"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={itemDraft.useCaseLabel}
                    onChange={(e) =>
                      setItemDraft((v) => {
                        if (!v) return v;
                        const nextUseCase = e.target.value;
                        const autoKind: ListingKind =
                          nextUseCase.toLowerCase().includes("service") ? "service" :
                          nextUseCase.toLowerCase().includes("equipment") ? "equipment" : v.listingKind;
                        return { ...v, useCaseLabel: nextUseCase, listingKind: autoKind };
                      })
                    }
                  >
                    <option value="">Select use case</option>
                    {USE_CASE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-kind">Type</Label>
                  <select
                    id="item-kind"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={itemDraft.listingKind}
                    onChange={(e) => setItemDraft((v) => (v ? { ...v, listingKind: e.target.value as ListingKind } : v))}
                  >
                    <option value="vehicle">Vehicle</option>
                    <option value="equipment">Equipment</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-billing">Rate basis</Label>
                  <select
                    id="item-billing"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={itemDraft.billingUnit}
                    onChange={(e) => setItemDraft((v) => (v ? { ...v, billingUnit: e.target.value as BillingUnit } : v))}
                  >
                    <option value="minute">Per minute</option>
                    <option value="hour">Per hour</option>
                    <option value="day">Per day</option>
                    <option value="acre">Per acre</option>
                    <option value="km">Per km</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-rate">Rate amount (INR)</Label>
                  <Input
                    id="item-rate"
                    inputMode="decimal"
                    value={toDisplayValue(itemDraft.rateAmount)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                        setItemDraft((v) => (v ? { ...v, rateAmount: raw === "" ? 0 : Number(raw) } : v));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-age">Item age (years)</Label>
                  <Input
                    id="item-age"
                    inputMode="numeric"
                    value={toDisplayValue(itemDraft.ageYears)}
                    onChange={(e) =>
                      setItemDraft((v) => (v ? { ...v, ageYears: /^\d*$/.test(e.target.value) ? toOptionalNumber(e.target.value) : v.ageYears } : v))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-working">Working condition (%)</Label>
                  <Input
                    id="item-working"
                    inputMode="numeric"
                    value={toDisplayValue(itemDraft.workingPercent)}
                    onChange={(e) =>
                      setItemDraft((v) => (v ? { ...v, workingPercent: /^\d*$/.test(e.target.value) ? toOptionalNumber(e.target.value) : v.workingPercent } : v))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-rent-days">Max rent days</Label>
                  <Input
                    id="item-rent-days"
                    inputMode="numeric"
                    value={toDisplayValue(itemDraft.maxRentDays)}
                    onChange={(e) =>
                      setItemDraft((v) => (v ? { ...v, maxRentDays: /^\d*$/.test(e.target.value) ? toOptionalNumber(e.target.value) : v.maxRentDays } : v))
                    }
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="item-image">Image URL</Label>
                  <Input id="item-image" value={itemDraft.imageUrl} onChange={(e) => setItemDraft((v) => (v ? { ...v, imageUrl: e.target.value } : v))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-image-upload">Upload photo</Label>
                  <Input id="item-image-upload" type="file" accept="image/*" onChange={onUploadPhoto} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-availability">Listing availability</Label>
                  <select
                    id="item-availability"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={itemDraft.isAvailable ? "available" : "not_available"}
                    onChange={(e) => setItemDraft((v) => (v ? { ...v, isAvailable: e.target.value === "available" } : v))}
                  >
                    <option value="available">Available</option>
                    <option value="not_available">Not available</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <textarea
                  id="item-description"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={itemDraft.description}
                  onChange={(e) => setItemDraft((v) => (v ? { ...v, description: e.target.value } : v))}
                  placeholder="Mention features, operator included or not, fuel terms, etc."
                />
              </div>
              <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 font-bold uppercase tracking-widest text-xs shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]" disabled={itemSaving} onClick={saveItem}>
                {itemSaving ? "Saving..." : editingItemId ? "Update listing" : "Add listing"}
              </Button>
            </>
          )}
        </section>

        <section id="owner-my-listings" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">My listings</h2>
          {itemsLoading ? (
            <p className="text-sm text-secondary/60 font-medium">Loading listings...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-secondary/65 font-medium">No listings yet. Add your first vehicle, equipment, or service listing.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-emerald-100 p-4 bg-gradient-to-b from-white to-emerald-50/45 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/75 hover:-translate-y-0.5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-emerald-900">{item.title}</p>
                      <p className="text-xs text-emerald-900/70 mt-1">
                        {item.listingKind.toUpperCase()} · ₹{item.rateAmount}/{item.billingUnit} · {item.isAvailable ? "Available" : "Not available"}
                      </p>
                      {item.useCaseLabel ? <p className="text-xs text-emerald-900/70 mt-1">Use case: {item.useCaseLabel}</p> : null}
                    </div>
                    <p className="text-xs text-emerald-900/65">{item.block}, {item.district} · PIN {item.pincode}</p>
                  </div>
                  <p className="text-xs text-emerald-900/65 mt-2">
                    Age: {item.ageYears ?? "-"} years · Working: {item.workingPercent ?? "-"}% · Max rent: {item.maxRentDays ?? "-"} days
                  </p>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="mt-2 h-28 w-full object-cover rounded-xl border border-primary/10" /> : null}
                  {item.description ? <p className="text-xs text-emerald-900/70 mt-2">{item.description}</p> : null}
                  <p className="text-xs text-emerald-900/60 mt-2">
                    Farmer rating: {ratingSummary[item.id]?.avgRating ?? 0} / 5 ({ratingSummary[item.id]?.ratingCount ?? 0} ratings)
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button variant="outline" className="text-xs font-bold uppercase tracking-widest" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      variant={item.isAvailable ? "secondary" : "default"}
                      className="text-xs font-bold uppercase tracking-widest"
                      onClick={() => void toggleAvailability(item)}
                    >
                      {item.isAvailable ? "Set unavailable" : "Set available"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
