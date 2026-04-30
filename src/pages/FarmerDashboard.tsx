import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { ROLE_LABELS, type OnboardingProfile } from "@/lib/onboarding";
import { createAnonymousSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseBrowser";
import { useFarmWeatherForecast } from "@/hooks/useFarmWeatherForecast";
import { deleteJob, FARM_JOBS_TABLE, listJobsForFarmer, type JobPost } from "@/lib/jobPosts";
import { JobPostDialog } from "@/components/jobs/JobPostDialog";
import { listWorkersForFarmer, type WorkerProfile } from "@/lib/workerProfiles";
import {
  type BillingUnit,
  type ListingKind,
  listAvailableItemsForFarmer,
  listRatingSummaryForItems,
  upsertVehicleItemRating,
  VEHICLE_ITEM_RATINGS_TABLE,
  VEHICLE_RENTAL_ITEMS_TABLE,
  type VehicleRentalItem,
} from "@/lib/vehicleOwnerCatalog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import aiScanCrop from "@/assets/ai-scan-crop.jpg";

type FarmerDashboardProps = {
  profile: OnboardingProfile;
  userId: string;
};

export const FarmerDashboard = ({ profile, userId }: FarmerDashboardProps) => {
  const supabase = useMemo(() => createAnonymousSupabaseClient(), []);

  const { forecast, selectedForecastDay, setSelectedForecastDay } = useFarmWeatherForecast({
    pincode: profile.pincode,
    district: profile.district,
    state: profile.state,
  });

  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [jobToDelete, setJobToDelete] = useState<JobPost | null>(null);
  const [selectedMyJob, setSelectedMyJob] = useState<JobPost | null>(null);
  const [myJobs, setMyJobs] = useState<JobPost[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerSkillFilter, setWorkerSkillFilter] = useState("");
  const [workerPincodeFilter, setWorkerPincodeFilter] = useState(profile.pincode);
  const [workerMaxCostFilter, setWorkerMaxCostFilter] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [vehicleItems, setVehicleItems] = useState<VehicleRentalItem[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [vehicleRatingSummary, setVehicleRatingSummary] = useState<Record<string, { avgRating: number; ratingCount: number }>>({});
  const [vehicleRatingsDraft, setVehicleRatingsDraft] = useState<Record<string, { rating: number; review: string }>>({});
  const [vehicleKindFilter, setVehicleKindFilter] = useState<ListingKind | "all">("all");
  const [vehicleBillingFilter, setVehicleBillingFilter] = useState<BillingUnit | "all">("all");
  const [vehicleTextFilter, setVehicleTextFilter] = useState("");
  const [vehicleNameFilter, setVehicleNameFilter] = useState("");
  const [vehiclePincodeFilter, setVehiclePincodeFilter] = useState(profile.pincode);
  const [vehicleDistrictFilter, setVehicleDistrictFilter] = useState("");
  const [vehicleLowPriceFirst, setVehicleLowPriceFirst] = useState(false);
  const [selectedVehicleItem, setSelectedVehicleItem] = useState<VehicleRentalItem | null>(null);

  const loadMyJobs = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setJobsError("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, run supabase/production_schema.sql, then restart/reload.");
      setMyJobs([]);
      setJobsLoading(false);
      return;
    }
    setJobsLoading(true);
    setJobsError(null);
    const { data, error } = await listJobsForFarmer(supabase, userId, profile.pincode);
    setJobsLoading(false);
    if (error) {
      setJobsError(error.message);
      setMyJobs([]);
      return;
    }
    setMyJobs(data ?? []);
  }, [supabase, userId, profile.pincode]);

  useEffect(() => {
    void loadMyJobs();
  }, [loadMyJobs]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`farm_jobs_farmer:${profile.pincode}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: FARM_JOBS_TABLE,
          filter: `pincode=eq.${profile.pincode}`,
        },
        () => void loadMyJobs(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, profile.pincode, userId, loadMyJobs]);

  const loadWorkers = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setWorkers([]);
      setWorkerLoading(false);
      setWorkerError("Supabase not configured.");
      return;
    }
    setWorkerLoading(true);
    setWorkerError(null);
    const maxCost = parseInt(workerMaxCostFilter, 10);
    const { data, error } = await listWorkersForFarmer(supabase, {
      pincode: workerPincodeFilter.trim() || undefined,
      skill: workerSkillFilter.trim() || undefined,
      maxCostPerDay: Number.isFinite(maxCost) && maxCost > 0 ? maxCost : undefined,
      onlyOnline: true,
    });
    setWorkerLoading(false);
    if (error) {
      setWorkerError(error.message);
      setWorkers([]);
      return;
    }
    setWorkers(data ?? []);
  }, [supabase, workerMaxCostFilter, workerPincodeFilter, workerSkillFilter]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`worker_profiles_farmer:${workerPincodeFilter || "all"}:${workerSkillFilter || "all"}:${workerMaxCostFilter || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_profiles",
        },
        () => void loadWorkers(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadWorkers, workerPincodeFilter, workerSkillFilter, workerMaxCostFilter]);

  const loadVehicleItems = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setVehicleItems([]);
      setVehicleLoading(false);
      setVehicleError("Supabase not configured.");
      return;
    }
    setVehicleLoading(true);
    setVehicleError(null);
    const { data, error } = await listAvailableItemsForFarmer(supabase);
    setVehicleLoading(false);
    if (error) {
      setVehicleError(error.message);
      setVehicleItems([]);
      return;
    }
    setVehicleItems(data ?? []);
  }, [supabase]);

  const loadVehicleRatingSummary = useCallback(async (itemIds: string[]) => {
    if (!supabase || !isSupabaseConfigured()) return;
    const { data, error } = await listRatingSummaryForItems(supabase, itemIds);
    if (error) return;
    const next: Record<string, { avgRating: number; ratingCount: number }> = {};
    for (const row of data) {
      next[row.itemId] = { avgRating: row.avgRating, ratingCount: row.ratingCount };
    }
    setVehicleRatingSummary(next);
  }, [supabase]);

  useEffect(() => {
    void loadVehicleItems();
  }, [loadVehicleItems]);

  useEffect(() => {
    void loadVehicleRatingSummary(vehicleItems.map((item) => item.id));
  }, [vehicleItems, loadVehicleRatingSummary]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;
    const channel = supabase
      .channel(`vehicle_items_farmer:${profile.pincode}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: VEHICLE_RENTAL_ITEMS_TABLE,
          filter: `pincode=eq.${profile.pincode}`,
        },
        () => void loadVehicleItems(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: VEHICLE_ITEM_RATINGS_TABLE,
        },
        () => void loadVehicleRatingSummary(vehicleItems.map((item) => item.id)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, profile.pincode, userId, loadVehicleItems, loadVehicleRatingSummary, vehicleItems]);

  const submitVehicleRating = async (item: VehicleRentalItem) => {
    if (!supabase || !isSupabaseConfigured()) return;
    const draft = vehicleRatingsDraft[item.id] ?? { rating: 5, review: "" };
    if (draft.rating < 1 || draft.rating > 5) {
      toast.error("Rating should be between 1 and 5.");
      return;
    }
    const { error } = await upsertVehicleItemRating(supabase, {
      itemId: item.id,
      farmerUserId: userId,
      farmerName: profile.fullName,
      rating: draft.rating,
      review: draft.review,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rating submitted.");
    await loadVehicleRatingSummary(vehicleItems.map((row) => row.id));
  };

  const resetVehicleFilters = () => {
    setVehicleKindFilter("all");
    setVehicleBillingFilter("all");
    setVehicleTextFilter("");
    setVehicleNameFilter("");
    setVehiclePincodeFilter(profile.pincode);
    setVehicleDistrictFilter("");
    setVehicleLowPriceFirst(false);
  };

  const filteredVehicleItems = vehicleItems.filter((item) => {
    if (vehicleKindFilter !== "all" && item.listingKind !== vehicleKindFilter) return false;
    if (vehicleBillingFilter !== "all" && item.billingUnit !== vehicleBillingFilter) return false;
    if (vehiclePincodeFilter.trim() && item.pincode !== vehiclePincodeFilter.trim()) return false;
    if (vehicleDistrictFilter.trim() && item.district.toLowerCase() !== vehicleDistrictFilter.trim().toLowerCase()) return false;
    if (vehicleNameFilter.trim() && !item.title.toLowerCase().includes(vehicleNameFilter.trim().toLowerCase())) return false;
    const search = vehicleTextFilter.trim().toLowerCase();
    if (!search) return true;
    return (
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.useCaseLabel.toLowerCase().includes(search)
    );
  }).sort((a, b) => {
    if (!vehicleLowPriceFirst) return 0;
    return a.rateAmount - b.rateAmount;
  });

  const name = profile.fullName.split(" ")[0];
  const crops = profile.crops?.length ? profile.crops : ["Rice", "Vegetables"];
  const formatJobWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-lime-50/40">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-5 sm:p-8 shadow-[0_18px_48px_-18px_rgba(16,185,129,0.35)] transition-all duration-300 hover:shadow-[0_24px_56px_-18px_rgba(16,185,129,0.42)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-lime-200/35 blur-3xl" />
          <div className="relative inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS[profile.role]} Dashboard
          </div>
          <h1 className="relative font-display text-3xl sm:text-5xl lg:text-6xl text-emerald-900 font-black tracking-tight">Hello, {name}</h1>
          <p className="relative text-sm sm:text-base text-emerald-900/70 mt-3 leading-relaxed">Pincode: {profile.pincode} · Crops: {crops.join(", ")}</p>
          {!isSupabaseConfigured() || !supabase ? (
            <p className="mt-4 text-sm font-medium text-destructive/90 rounded-2xl border border-destructive/25 bg-destructive/5 p-3.5 shadow-sm">
              Job posting needs Supabase env vars. Run{" "}
              <code className="text-xs font-bold">supabase/production_schema.sql</code> in Supabase SQL editor, then reload.
            </p>
          ) : null}
          <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              disabled={!supabase || !isSupabaseConfigured()}
              className="btn-3d bg-gradient-to-r from-emerald-600 to-emerald-500 text-primary-foreground border-2 border-emerald-700 rounded-2xl py-4 px-5 text-base font-bold text-left disabled:opacity-50 disabled:pointer-events-none shadow-[0_10px_24px_-10px_rgba(5,150,105,0.75)] hover:translate-y-[-1px] transition-all"
              onClick={() => {
                setEditingJob(null);
                setJobDialogOpen(true);
              }}
            >
              ➕ Post Job
            </button>
            <button
              type="button"
              className="btn-3d bg-white text-emerald-800 rounded-2xl py-4 px-5 text-base font-bold text-left border border-emerald-200 shadow-[0_10px_24px_-14px_rgba(16,185,129,0.5)] hover:bg-emerald-50 transition-all"
            >
              👷 Find Workers
            </button>
          </div>
        </div>

        <section className="sticky top-16 z-20 rounded-2xl border border-emerald-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-3 py-3 shadow-[0_10px_26px_-18px_rgba(16,185,129,0.45)]">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            <a href="#farmer-weather" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Weather</a>
            <a href="#farmer-ai-check" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">AI Check</a>
            <a href="#farmer-workers" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Workers</a>
            <a href="#farmer-jobs" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">My Jobs</a>
            <a href="#farmer-vehicles" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Vehicles</a>
            <a href="#farmer-vendors" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Vendors</a>
          </div>
        </section>

        <section id="farmer-weather" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black text-emerald-900">5-Day Weather Forecast</h2>
            <span className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">{profile.pincode}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            {forecast.map((f, idx) => (
              <button
                key={`${f.day}-${f.date}`}
                type="button"
                onClick={() => setSelectedForecastDay(idx)}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 ${
                  selectedForecastDay === idx
                    ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-primary-foreground border-emerald-700 shadow-lg -translate-y-0.5"
                    : "bg-emerald-50/50 text-emerald-900 border-emerald-100 hover:border-emerald-300 hover:-translate-y-0.5"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider">{f.day}</p>
                <p className="text-[11px] opacity-80">{f.date}</p>
                <p className="font-display text-xl font-black mt-1">{f.temp}°C</p>
                <p className="text-xs font-semibold mt-1 truncate">{f.text}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/40 p-4 shadow-sm">
            <p className="font-display text-xl font-black text-emerald-900">
              {forecast[selectedForecastDay]?.day} Details - {forecast[selectedForecastDay]?.temp}°C
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-emerald-900/70">
              <p>Condition: {forecast[selectedForecastDay]?.text}</p>
              <p>Humidity: {forecast[selectedForecastDay]?.humidity}</p>
              <p>Wind: {forecast[selectedForecastDay]?.wind}</p>
              <p>Rain chance: {forecast[selectedForecastDay]?.rainChance}</p>
            </div>
            <div className="mt-3 rounded-xl bg-emerald-100/70 border border-emerald-200 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Work + Precaution Suggestions
              </p>
              <div className="space-y-1.5">
                {(forecast[selectedForecastDay]?.tips ?? []).slice(0, 4).map((tip, idx) => (
                  <p key={`${tip}-${idx}`} className="text-sm font-medium text-emerald-900/85">
                    {idx + 1}. {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="farmer-ai-check" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 overflow-hidden shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
            <div className="p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-3 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                AI Check
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-emerald-900 mb-2">
                AI Crop & Soil <span className="text-primary">Assistant</span>
              </h2>
              <p className="text-sm sm:text-base text-emerald-900/70 mb-4 leading-relaxed">
                Upload crop or soil photo to get instant disease detection, quality check, and easy action tips in local language.
              </p>
              <Link
                to="/ai-scan"
                className="btn-3d inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-primary-foreground px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest border-2 border-emerald-700 shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]"
              >
                📷 Open AI Check
              </Link>
            </div>
            <div className="p-5 sm:p-7">
              <div className="rounded-3xl overflow-hidden border-4 border-emerald-700 shadow-[0_22px_42px_-15px_rgba(5,150,105,0.45)] transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src={aiScanCrop}
                  alt="Farmer scanning crop for AI check"
                  className="w-full h-56 sm:h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="farmer-workers" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">Workers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1">
              <Label htmlFor="worker-filter-pin">Pincode</Label>
              <Input id="worker-filter-pin" value={workerPincodeFilter} onChange={(e) => setWorkerPincodeFilter(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="worker-filter-skill">Skill</Label>
              <Input id="worker-filter-skill" value={workerSkillFilter} onChange={(e) => setWorkerSkillFilter(e.target.value)} placeholder="e.g. Harvesting" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="worker-filter-cost">Max cost/day</Label>
              <Input id="worker-filter-cost" value={workerMaxCostFilter} onChange={(e) => setWorkerMaxCostFilter(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="mb-4">
            <Button type="button" className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-xs font-bold uppercase tracking-widest shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]" onClick={() => void loadWorkers()}>
              Apply worker filters
            </Button>
          </div>
          {workerLoading ? (
            <p className="text-sm text-secondary/60 font-medium">Loading workers...</p>
          ) : workerError ? (
            <p className="text-sm font-medium text-destructive">{workerError}</p>
          ) : workers.length === 0 ? (
            <p className="text-sm text-secondary/65 font-medium">No online workers found for selected filters.</p>
          ) : (
            <div className="space-y-3">
              {workers.map((w) => (
                <button
                  key={w.userId}
                  type="button"
                  className={`w-full rounded-2xl border p-4 bg-gradient-to-b from-white to-emerald-50/45 text-left transition hover:border-emerald-400 hover:bg-emerald-50/75 hover:-translate-y-0.5 shadow-sm ${
                    w.gender === "female" ? "border-pink-300/60 bg-pink-50/40" : "border-emerald-100"
                  }`}
                  onClick={() => setSelectedWorker(w)}
                >
                  <p className="font-semibold text-emerald-900">{w.fullName}</p>
                  <p className="text-xs text-emerald-900/70 mt-1">
                    {w.gender.toUpperCase()} · {w.age ? `${w.age} yrs` : "Age N/A"} · ₹{w.minCostPerDay}/day
                  </p>
                  <p className="text-xs text-emerald-900/65 mt-1">{w.block}, {w.district} · PIN {w.pincode}</p>
                  <p className="text-xs text-emerald-900/70 mt-2">Skills: {w.skills.join(", ")}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section id="farmer-jobs" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">My Job Postings</h2>
          {jobsLoading ? (
            <p className="text-sm text-secondary/60 font-medium">Loading your job posts…</p>
          ) : jobsError ? (
            <p className="text-sm font-medium text-destructive">{jobsError}</p>
          ) : myJobs.length === 0 ? (
            <p className="text-sm text-secondary/65 font-medium">
              No jobs yet. Use <span className="text-primary font-bold">Post Job</span> to hire workers — listings sync to Supabase and appear on worker dashboards that share pincode{" "}
              {profile.pincode}.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {myJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedMyJob(job)}
                  className="min-w-[300px] max-w-[340px] snap-start text-left rounded-2xl border border-emerald-100 p-4 bg-gradient-to-b from-white to-emerald-50/45 transition hover:border-emerald-400 hover:bg-emerald-50/75 hover:-translate-y-0.5 shadow-sm"
                >
                  <p className="font-semibold text-emerald-900">
                    {job.jobRole}
                    {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
                  </p>
                  <p className="text-sm text-emerald-900/75 mt-1">
                    {job.farmingType}
                    {job.farmingTypeOther ? ` (${job.farmingTypeOther})` : ""} · {job.workersNeeded} workers · min ₹
                    {job.minWagePerDay}/day · {job.duration}
                    {job.durationOther ? ` — ${job.durationOther}` : ""}
                  </p>
                  <p className="text-xs text-emerald-900/65 mt-2">📍 {job.location}</p>
                  <p className="text-xs text-emerald-900/65 mt-1">
                    Meals: {job.foodProvided ? "Yes" : "No"} · Transport help: {job.transportProvided ? "Yes" : "No"}
                  </p>
                  {job.extraRequirements ? (
                    <p className="text-xs text-emerald-900/70 mt-2 whitespace-pre-wrap border-t border-emerald-200/70 pt-2">
                      {job.extraRequirements}
                    </p>
                  ) : null}
                  <p className="text-[10px] font-semibold text-emerald-900/45 uppercase tracking-wider mt-2">
                    Posted {formatJobWhen(job.createdAt)}
                    {job.updatedAt !== job.createdAt ? ` · Updated ${formatJobWhen(job.updatedAt)}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-primary">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMyJob(null);
                        setEditingJob(job);
                        setJobDialogOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="hover:underline text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMyJob(null);
                        setJobToDelete(job);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-secondary/50 mt-3">
            Jobs live in Supabase (<code className="text-[10px]">farm_jobs</code>) with anon-safe policies; use Edge Functions for strict ownership in production.
          </p>
        </section>

        <section className="space-y-4">
          <div id="farmer-vehicles" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
            <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">Nearby Vehicles & Equipment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="space-y-1">
                <Label htmlFor="vehicle-pin-filter">Pincode</Label>
                <Input
                  id="vehicle-pin-filter"
                  value={vehiclePincodeFilter}
                  onChange={(e) => setVehiclePincodeFilter(e.target.value)}
                  placeholder="e.g. 752001"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-district-filter">District</Label>
                <Input
                  id="vehicle-district-filter"
                  value={vehicleDistrictFilter}
                  onChange={(e) => setVehicleDistrictFilter(e.target.value)}
                  placeholder="e.g. Khordha"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-name-filter">Vehicle name</Label>
                <Input
                  id="vehicle-name-filter"
                  value={vehicleNameFilter}
                  onChange={(e) => setVehicleNameFilter(e.target.value)}
                  placeholder="search by vehicle name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-kind-filter">Type</Label>
                <select
                  id="vehicle-kind-filter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={vehicleKindFilter}
                  onChange={(e) => setVehicleKindFilter(e.target.value as ListingKind | "all")}
                >
                  <option value="all">All types</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="equipment">Equipment</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-billing-filter">Pricing model</Label>
                <select
                  id="vehicle-billing-filter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={vehicleBillingFilter}
                  onChange={(e) => setVehicleBillingFilter(e.target.value as BillingUnit | "all")}
                >
                  <option value="all">All models</option>
                  <option value="minute">Per minute</option>
                  <option value="hour">Per hour</option>
                  <option value="day">Per day</option>
                  <option value="acre">Per acre</option>
                  <option value="km">Per km</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-low-price-filter">Price sort</Label>
                <select
                  id="vehicle-low-price-filter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={vehicleLowPriceFirst ? "low" : "default"}
                  onChange={(e) => setVehicleLowPriceFirst(e.target.value === "low")}
                >
                  <option value="default">Default</option>
                  <option value="low">Low price first</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicle-text-filter">Search</Label>
                <Input
                  id="vehicle-text-filter"
                  value={vehicleTextFilter}
                  onChange={(e) => setVehicleTextFilter(e.target.value)}
                  placeholder="title, use case, or keyword"
                />
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-xs font-bold uppercase tracking-widest shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]"
                onClick={() => void loadVehicleItems()}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs font-bold uppercase tracking-widest"
                onClick={resetVehicleFilters}
              >
                Reset all
              </Button>
            </div>
            {vehicleLoading ? (
              <p className="text-sm text-secondary/60 font-medium">Loading owner listings...</p>
            ) : vehicleError ? (
              <p className="text-sm font-medium text-destructive">{vehicleError}</p>
            ) : filteredVehicleItems.length === 0 ? (
              <p className="text-sm text-secondary/65 font-medium">No available listings in your pincode right now.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
                {filteredVehicleItems.map((item) => {
                  const summary = vehicleRatingSummary[item.id] ?? { avgRating: 0, ratingCount: 0 };
                  const draft = vehicleRatingsDraft[item.id] ?? { rating: 5, review: "" };
                  return (
                    <div key={item.id} className="min-w-[320px] max-w-[360px] snap-start rounded-2xl border border-primary/10 p-4 bg-muted/50">
                      <p className="font-semibold text-emerald-900">{item.title}</p>
                      <p className="text-xs text-emerald-900/70 mt-1">
                        {item.listingKind.toUpperCase()} · ₹{item.rateAmount}/{item.billingUnit}
                      </p>
                      {item.useCaseLabel ? <p className="text-xs text-emerald-900/70 mt-1">Use case: {item.useCaseLabel}</p> : null}
                      <p className="text-xs text-emerald-900/70 mt-1">
                        Age: {item.ageYears ?? "-"} years · Working: {item.workingPercent ?? "-"}% · Max rent: {item.maxRentDays ?? "-"} days
                      </p>
                      <p className="text-xs text-emerald-900/70 mt-1">
                        Owner: {item.ownerName} · {item.ownerPhone}
                      </p>
                      <p className="text-xs text-emerald-900/70 mt-1">
                        Location: {item.block}, {item.district} · PIN {item.pincode}
                      </p>
                      {item.imageUrl ? (
                        <div className="mt-2 h-28 w-full rounded-xl border border-primary/10 bg-white/80 p-1.5 flex items-center justify-center overflow-hidden">
                          <img src={item.imageUrl} alt={item.title} className="max-h-full max-w-full object-contain rounded-lg" />
                        </div>
                      ) : null}
                      {item.description ? <p className="text-xs text-emerald-900/75 mt-2">{item.description}</p> : null}
                      <p className="text-xs text-emerald-900/60 mt-2">
                        Rating: {summary.avgRating} / 5 ({summary.ratingCount} ratings)
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={draft.rating}
                          onChange={(e) =>
                            setVehicleRatingsDraft((prev) => ({
                              ...prev,
                              [item.id]: { rating: Number(e.target.value), review: prev[item.id]?.review ?? "" },
                            }))
                          }
                        >
                          <option value={5}>5 - Excellent</option>
                          <option value={4}>4 - Good</option>
                          <option value={3}>3 - Average</option>
                          <option value={2}>2 - Poor</option>
                          <option value={1}>1 - Bad</option>
                        </select>
                        <Input
                          placeholder="Optional review"
                          value={draft.review}
                          onChange={(e) =>
                            setVehicleRatingsDraft((prev) => ({
                              ...prev,
                              [item.id]: { rating: prev[item.id]?.rating ?? 5, review: e.target.value },
                            }))
                          }
                        />
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-xs font-bold uppercase tracking-widest shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]"
                          onClick={() => void submitVehicleRating(item)}
                        >
                          Rate this item
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="text-xs font-bold uppercase tracking-widest"
                            onClick={() => toast.message("Chat will be integrated here soon.")}
                          >
                            Chat
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs font-bold uppercase tracking-widest"
                            onClick={() => setSelectedVehicleItem(item)}
                          >
                            Owner details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div id="farmer-vendors" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
            <h2 className="font-display text-2xl font-black text-emerald-900 mb-4">Find Vendors / Shop Owners</h2>
            <div className="space-y-3 text-sm text-emerald-900/80 font-medium">
              <p>🛒 Seeds Shop - 2km away</p>
              <p>🧪 Fertilizer Point - 3.5km away</p>
              <p>🔧 Farm Tools Store - 4km away</p>
            </div>
            <p className="text-xs font-semibold text-secondary/50 mt-3">Vendor role profiles will power this section later.</p>
          </div>
        </section>
      </main>

      <JobPostDialog
        open={jobDialogOpen}
        onOpenChange={setJobDialogOpen}
        supabase={supabase}
        profile={profile}
        userId={userId}
        jobToEdit={editingJob}
        onSaved={() => void loadMyJobs()}
      />

      <AlertDialog open={!!jobToDelete} onOpenChange={(o) => !o && setJobToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row from Supabase so workers lose visibility immediately (subject to their next refresh or realtime update).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!jobToDelete || !supabase) {
                  setJobToDelete(null);
                  return;
                }
                void (async () => {
                  const { error } = await deleteJob(supabase, userId, jobToDelete.id);
                  setJobToDelete(null);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  toast.success("Job deleted");
                  await loadMyJobs();
                })();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedMyJob} onOpenChange={(o) => !o && setSelectedMyJob(null)}>
        <AlertDialogContent className="rounded-2xl">
          {!selectedMyJob ? null : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {selectedMyJob.jobRole}
                  {selectedMyJob.jobRoleOther ? ` — ${selectedMyJob.jobRoleOther}` : ""}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedMyJob.farmingType}
                  {selectedMyJob.farmingTypeOther ? ` (${selectedMyJob.farmingTypeOther})` : ""} · {selectedMyJob.workersNeeded} workers · min ₹
                  {selectedMyJob.minWagePerDay}/day
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 text-sm text-secondary/85">
                <p>Location: {selectedMyJob.location}</p>
                <p>Area: {selectedMyJob.block}, {selectedMyJob.district}, {selectedMyJob.state} - {selectedMyJob.pincode}</p>
                <p>Duration: {selectedMyJob.duration}{selectedMyJob.durationOther ? ` — ${selectedMyJob.durationOther}` : ""}</p>
                <p>Food provided: {selectedMyJob.foodProvided ? "Yes" : "No"} · Transport: {selectedMyJob.transportProvided ? "Yes" : "No"}</p>
                {selectedMyJob.extraRequirements ? <p>Extra requirements: {selectedMyJob.extraRequirements}</p> : null}
                <p className="text-xs text-secondary/65">Posted: {formatJobWhen(selectedMyJob.createdAt)}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setSelectedMyJob(null);
                    setEditingJob(selectedMyJob);
                    setJobDialogOpen(true);
                  }}
                >
                  Edit
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedWorker} onOpenChange={(o) => !o && setSelectedWorker(null)}>
        <AlertDialogContent className="rounded-2xl">
          {!selectedWorker ? null : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{selectedWorker.fullName}</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedWorker.gender.toUpperCase()} · {selectedWorker.age ? `${selectedWorker.age} years` : "Age not shared"} · ₹
                  {selectedWorker.minCostPerDay}/day
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 text-sm text-secondary/85">
                <p>Phone: <span className="font-semibold">{selectedWorker.phone}</span></p>
                <p>Area: {selectedWorker.block}, {selectedWorker.district}, {selectedWorker.state} - {selectedWorker.pincode}</p>
                <p>Availability: {selectedWorker.availableFrom ?? "-"} to {selectedWorker.availableTo ?? "-"}</p>
                <p>Skills: {selectedWorker.skills.join(", ")}</p>
                {selectedWorker.bio ? <p>Bio: {selectedWorker.bio}</p> : null}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <a href={`tel:${selectedWorker.phone.replace(/\s+/g, "")}`}>Call</a>
                </AlertDialogAction>
                <AlertDialogAction onClick={() => toast.message("Chat module will be connected here soon.")}>
                  Chat (Soon)
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selectedVehicleItem} onOpenChange={(o) => !o && setSelectedVehicleItem(null)}>
        <AlertDialogContent className="rounded-2xl">
          {!selectedVehicleItem ? null : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{selectedVehicleItem.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedVehicleItem.listingKind.toUpperCase()} · ₹{selectedVehicleItem.rateAmount}/{selectedVehicleItem.billingUnit}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 text-sm text-secondary/85">
                <p>Owner: <span className="font-semibold">{selectedVehicleItem.ownerName}</span></p>
                <p>Phone: <span className="font-semibold">{selectedVehicleItem.ownerPhone}</span></p>
                <p>Location: {selectedVehicleItem.block}, {selectedVehicleItem.district}, {selectedVehicleItem.state} - {selectedVehicleItem.pincode}</p>
                <p>Village: {selectedVehicleItem.village || "-"}</p>
                <p>Condition: {selectedVehicleItem.workingPercent ?? "-"}% working · Age {selectedVehicleItem.ageYears ?? "-"} years</p>
                <p>Max rent days: {selectedVehicleItem.maxRentDays ?? "-"}</p>
                {selectedVehicleItem.description ? <p>Details: {selectedVehicleItem.description}</p> : null}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast.message("Chat integration coming soon.")}>
                  Chat
                </AlertDialogAction>
                <AlertDialogAction asChild>
                  <a href={`tel:${selectedVehicleItem.ownerPhone.replace(/\s+/g, "")}`}>Call owner</a>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
