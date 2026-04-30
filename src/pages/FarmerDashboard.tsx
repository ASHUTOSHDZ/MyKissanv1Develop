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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-7">
        <div className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-7 shadow-card hover:shadow-soft transition-all duration-300">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS[profile.role]} Dashboard
          </div>
          <h1 className="font-display text-3xl sm:text-5xl text-secondary font-black">Hello, {name}</h1>
          <p className="text-sm sm:text-base text-secondary/70 mt-2">Pincode: {profile.pincode} · Crops: {crops.join(", ")}</p>
          {!isSupabaseConfigured() || !supabase ? (
            <p className="mt-4 text-sm font-medium text-destructive/90 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
              Job posting needs Supabase env vars. Run{" "}
              <code className="text-xs font-bold">supabase/production_schema.sql</code> in Supabase SQL editor, then reload.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!supabase || !isSupabaseConfigured()}
              className="btn-3d bg-primary text-primary-foreground border-2 border-primary-deep rounded-xl py-4 px-5 text-base font-bold text-left disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => {
                setEditingJob(null);
                setJobDialogOpen(true);
              }}
            >
              ➕ Post Job
            </button>
            <button
              type="button"
              className="btn-3d bg-secondary text-secondary-foreground rounded-xl py-4 px-5 text-base font-bold text-left"
            >
              👷 Find Workers
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-black text-secondary">5-Day Weather Forecast</h2>
            <span className="text-xs font-bold text-secondary/60 uppercase tracking-wider">{profile.pincode}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            {forecast.map((f, idx) => (
              <button
                key={`${f.day}-${f.date}`}
                type="button"
                onClick={() => setSelectedForecastDay(idx)}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 ${
                  selectedForecastDay === idx
                    ? "bg-primary text-primary-foreground border-primary-deep shadow-lg -translate-y-0.5"
                    : "bg-muted/50 text-secondary border-primary/10 hover:border-primary/35 hover:-translate-y-0.5"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider">{f.day}</p>
                <p className="text-[11px] opacity-80">{f.date}</p>
                <p className="font-display text-xl font-black mt-1">{f.temp}°C</p>
                <p className="text-xs font-semibold mt-1 truncate">{f.text}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-background p-4">
            <p className="font-display text-xl font-black text-secondary">
              {forecast[selectedForecastDay]?.day} Details - {forecast[selectedForecastDay]?.temp}°C
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-secondary/70">
              <p>Condition: {forecast[selectedForecastDay]?.text}</p>
              <p>Humidity: {forecast[selectedForecastDay]?.humidity}</p>
              <p>Wind: {forecast[selectedForecastDay]?.wind}</p>
              <p>Rain chance: {forecast[selectedForecastDay]?.rainChance}</p>
            </div>
            <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Work + Precaution Suggestions
              </p>
              <div className="space-y-1.5">
                {(forecast[selectedForecastDay]?.tips ?? []).slice(0, 4).map((tip, idx) => (
                  <p key={`${tip}-${idx}`} className="text-sm font-medium text-secondary/85">
                    {idx + 1}. {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
            <div className="p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-3">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                AI Check
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-secondary mb-2">
                AI Crop & Soil <span className="text-primary">Assistant</span>
              </h2>
              <p className="text-sm sm:text-base text-secondary/70 mb-4">
                Upload crop or soil photo to get instant disease detection, quality check, and easy action tips in local language.
              </p>
              <Link
                to="/ai-scan"
                className="btn-3d inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest border-2 border-primary-deep"
              >
                📷 Open AI Check
              </Link>
            </div>
            <div className="p-5 sm:p-7">
              <div className="rounded-3xl overflow-hidden border-4 border-primary-deep shadow-[0_20px_40px_-15px_hsl(142_72%_32%_/_0.45)] transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src={aiScanCrop}
                  alt="Farmer scanning crop for AI check"
                  className="w-full h-56 sm:h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-secondary mb-4">Workers</h2>
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
            <Button type="button" className="bg-primary text-xs font-bold uppercase tracking-widest" onClick={() => void loadWorkers()}>
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
                  className={`w-full rounded-2xl border p-4 bg-muted/50 text-left transition hover:border-primary/40 hover:bg-primary/5 ${
                    w.gender === "female" ? "border-pink-300/60 bg-pink-50/40" : "border-primary/10"
                  }`}
                  onClick={() => setSelectedWorker(w)}
                >
                  <p className="font-semibold text-secondary">{w.fullName}</p>
                  <p className="text-xs text-secondary/70 mt-1">
                    {w.gender.toUpperCase()} · {w.age ? `${w.age} yrs` : "Age N/A"} · ₹{w.minCostPerDay}/day
                  </p>
                  <p className="text-xs text-secondary/65 mt-1">{w.block}, {w.district} · PIN {w.pincode}</p>
                  <p className="text-xs text-secondary/70 mt-2">Skills: {w.skills.join(", ")}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-secondary mb-4">My Job Postings</h2>
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
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-primary/10 p-4 bg-muted/50 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="font-semibold text-secondary">
                    {job.jobRole}
                    {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
                  </p>
                  <p className="text-sm text-secondary/75 mt-1">
                    {job.farmingType}
                    {job.farmingTypeOther ? ` (${job.farmingTypeOther})` : ""} · {job.workersNeeded} workers · min ₹
                    {job.minWagePerDay}/day · {job.duration}
                    {job.durationOther ? ` — ${job.durationOther}` : ""}
                  </p>
                  <p className="text-xs text-secondary/65 mt-2">📍 {job.location}</p>
                  <p className="text-xs text-secondary/65 mt-1">
                    Meals: {job.foodProvided ? "Yes" : "No"} · Transport help: {job.transportProvided ? "Yes" : "No"}
                  </p>
                  {job.extraRequirements ? (
                    <p className="text-xs text-secondary/70 mt-2 whitespace-pre-wrap border-t border-primary/10 pt-2">
                      {job.extraRequirements}
                    </p>
                  ) : null}
                  <p className="text-[10px] font-semibold text-secondary/45 uppercase tracking-wider mt-2">
                    Posted {formatJobWhen(job.createdAt)}
                    {job.updatedAt !== job.createdAt ? ` · Updated ${formatJobWhen(job.updatedAt)}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-primary">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => {
                        setEditingJob(job);
                        setJobDialogOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="hover:underline text-destructive" onClick={() => setJobToDelete(job)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-secondary/50 mt-3">
            Jobs live in Supabase (<code className="text-[10px]">farm_jobs</code>) with anon-safe policies; use Edge Functions for strict ownership in production.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
            <h2 className="font-display text-2xl font-black text-secondary mb-4">Find Nearby Vehicles</h2>
            <div className="space-y-3 text-sm text-secondary/80 font-medium">
              <p>🚜 Tractor - ₹800/day</p>
              <p>🚚 Mini Truck - ₹1,200/day</p>
              <p>🌾 Harvester - ₹2,500/day</p>
            </div>
            <p className="text-xs font-semibold text-secondary/50 mt-3">Vehicle owner role data will be connected here later.</p>
          </div>
          <div className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
            <h2 className="font-display text-2xl font-black text-secondary mb-4">Find Vendors / Shop Owners</h2>
            <div className="space-y-3 text-sm text-secondary/80 font-medium">
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
    </div>
  );
};
