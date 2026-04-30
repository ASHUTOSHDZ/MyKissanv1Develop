import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ROLE_LABELS, type OnboardingProfile } from "@/lib/onboarding";
import { createAnonymousSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseBrowser";
import { useFarmWeatherForecast } from "@/hooks/useFarmWeatherForecast";
import {
  buildWorkerOutdoorLaborTips,
  parseHumidityPercent,
  parsePercent,
  parseWindKph,
} from "@/lib/weatherFarmTips";
import { WorkerJobDetailSheet } from "@/components/jobs/WorkerJobDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FARM_JOBS_TABLE, listJobsWithFilters, type JobPost } from "@/lib/jobPosts";
import aiScanCrop from "@/assets/ai-scan-crop.jpg";

type WorkerDashboardProps = {
  profile: OnboardingProfile;
};

type JobFilterForm = {
  pincode: string;
  district: string;
  block: string;
  minWage: string;
};

export const WorkerDashboard = ({ profile }: WorkerDashboardProps) => {
  const supabase = useMemo(() => createAnonymousSupabaseClient(), []);

  const defaultFilters = useMemo<JobFilterForm>(
    () => ({
      pincode: profile.pincode,
      district: profile.district,
      block: profile.block,
      minWage: "",
    }),
    [profile.pincode, profile.district, profile.block],
  );

  const [draftFilters, setDraftFilters] = useState<JobFilterForm>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<JobFilterForm>(defaultFilters);

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [detailJob, setDetailJob] = useState<JobPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { forecast, selectedForecastDay, setSelectedForecastDay, weatherApiConfigured } = useFarmWeatherForecast({
    pincode: profile.pincode,
    district: profile.district,
    state: profile.state,
  });

  const selectedDay = forecast[selectedForecastDay];
  const workerWeatherTips = useMemo(() => {
    if (!selectedDay) return [];
    return buildWorkerOutdoorLaborTips(
      selectedDay.temp,
      parsePercent(selectedDay.rainChance),
      parseHumidityPercent(selectedDay.humidity),
      parseWindKph(selectedDay.wind),
      selectedDay.text,
    );
  }, [selectedDay]);

  const loadJobs = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setJobsError("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, run supabase/farm_jobs.sql, then reload.");
      setJobs([]);
      setJobsLoading(false);
      return;
    }

    const pincodeInput = appliedFilters.pincode.trim();
    const districtInput = appliedFilters.district.trim();
    const pincodeArg = pincodeInput || (districtInput ? undefined : profile.pincode);
    const districtArg = districtInput || undefined;
    const blockArg = appliedFilters.block.trim() || undefined;
    const minParsed = parseInt(appliedFilters.minWage.trim(), 10);
    const minWageArg =
      appliedFilters.minWage.trim() !== "" && Number.isFinite(minParsed) && minParsed > 0 ? minParsed : undefined;

    setJobsLoading(true);
    setJobsError(null);
    const { data, error } = await listJobsWithFilters(supabase, {
      pincode: pincodeArg,
      district: districtArg,
      block: blockArg,
      minWagePerDay: minWageArg,
    });
    setJobsLoading(false);
    if (error) {
      setJobsError(error.message);
      setJobs([]);
      return;
    }
    setJobs(data ?? []);
  }, [supabase, appliedFilters, profile.pincode]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel("farm_jobs_worker_all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: FARM_JOBS_TABLE,
        },
        () => void loadJobs(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, loadJobs]);

  const name = profile.fullName.split(" ")[0];

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  useEffect(() => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, [defaultFilters]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-7">
        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-7 shadow-card hover:shadow-soft transition-all duration-300">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS.worker} dashboard
          </div>
          <h1 className="font-display text-3xl sm:text-5xl text-secondary font-black">Hello, {name}</h1>
          <p className="text-sm sm:text-base text-secondary/70 mt-2">
            Default area: <span className="font-semibold text-secondary">{profile.block}</span>,{" "}
            <span className="font-semibold text-secondary">{profile.district}</span> · PIN{" "}
            <span className="font-semibold text-secondary">{profile.pincode}</span>
          </p>
          <p className="text-xs font-semibold text-secondary/50 mt-3">
            Jobs load from Supabase <code className="text-[10px]">farm_jobs</code> using the filters below. Realtime refresh listens to all
            job changes (refetch applies your current filters).
          </p>
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-secondary mb-1">Find jobs</h2>
          <p className="text-sm text-secondary/65 mb-4">
            Filter by location and minimum daily wage. At least one of <strong>pincode</strong> or <strong>district</strong> is required; empty pincode falls back to your profile pincode unless you search by district only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-pincode">Pincode</Label>
              <Input
                id="filter-pincode"
                inputMode="numeric"
                placeholder="e.g. 752001"
                value={draftFilters.pincode}
                onChange={(e) => setDraftFilters((f) => ({ ...f, pincode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-district">District</Label>
              <Input
                id="filter-district"
                placeholder="Partial match"
                value={draftFilters.district}
                onChange={(e) => setDraftFilters((f) => ({ ...f, district: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-block">Block</Label>
              <Input
                id="filter-block"
                placeholder="Partial match"
                value={draftFilters.block}
                onChange={(e) => setDraftFilters((f) => ({ ...f, block: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-minwage">Min salary (₹ / day)</Label>
              <Input
                id="filter-minwage"
                inputMode="numeric"
                placeholder="e.g. 400"
                value={draftFilters.minWage}
                onChange={(e) => setDraftFilters((f) => ({ ...f, minWage: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" className="bg-primary font-bold uppercase tracking-widest text-xs" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" className="font-bold uppercase tracking-widest text-xs" onClick={resetFilters}>
              Reset to my area
            </Button>
          </div>

          <div className="mt-8 border-t border-primary/10 pt-6">
            <h3 className="font-display text-lg font-black text-secondary mb-3">Results</h3>
            {jobsLoading ? (
              <p className="text-sm text-secondary/60 font-medium">Loading jobs…</p>
            ) : jobsError ? (
              <p className="text-sm font-medium text-destructive">{jobsError}</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-secondary/65 font-medium">
                No jobs match these filters. Widen district or lower minimum salary, or reset to your profile area.
              </p>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setDetailJob(job);
                      setDetailOpen(true);
                    }}
                    className="w-full text-left rounded-2xl border border-primary/10 p-4 sm:p-5 bg-muted/50 transition hover:border-primary/35 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-black text-secondary">
                          {job.jobRole}
                          {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
                        </p>
                        <p className="text-sm text-secondary/75 mt-1">
                          {job.farmingType}
                          {job.farmingTypeOther ? ` (${job.farmingTypeOther})` : ""} · {job.workersNeeded} workers · from ₹
                          {job.minWagePerDay}/day
                        </p>
                      </div>
                      <p className="text-xs font-bold text-primary whitespace-nowrap">{formatWhen(job.createdAt)}</p>
                    </div>
                    <p className="text-xs text-secondary/60 mt-1">
                      {job.block}, {job.district} · PIN {job.pincode}
                    </p>
                    <p className="text-sm text-secondary/80 mt-2 line-clamp-2">📍 {job.location}</p>
                    <p className="text-xs font-semibold text-secondary/55 mt-2">Posted by {job.farmerName}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">Tap for full details →</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="font-display text-2xl font-black text-secondary">Work weather &amp; safety</h2>
            <span className="text-xs font-bold text-secondary/60 uppercase tracking-wider">
              {profile.pincode}
              {!weatherApiConfigured ? " · Add VITE_WEATHERAPI_KEY for live forecast" : ""}
            </span>
          </div>
          <p className="text-sm text-secondary/70 mb-4">
            Check rain and heat before you travel. Tips below include what to carry (water bottle, rain cover) and whether the day looks reasonable for outdoor labor.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            {forecast.map((f, idx) => (
              <button
                key={`${f.day}-${f.date}-${idx}`}
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
              {selectedDay?.day} — {selectedDay?.temp}°C · {selectedDay?.text}
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-secondary/70">
              <p>Humidity: {selectedDay?.humidity}</p>
              <p>Wind: {selectedDay?.wind}</p>
              <p>Rain chance: {selectedDay?.rainChance}</p>
              <p>
                {parsePercent(selectedDay?.rainChance ?? "0") >= 50
                  ? "Likely wet — plan rain gear"
                  : parsePercent(selectedDay?.rainChance ?? "0") >= 25
                    ? "Some rain risk"
                    : "Mostly workable travel weather"}
              </p>
            </div>
            <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Is it OK to go to work? · Precautions
              </p>
              <div className="space-y-1.5">
                {workerWeatherTips.map((tip, idx) => (
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
                AI Crop &amp; Soil <span className="text-primary">Assistant</span>
              </h2>
              <p className="text-sm sm:text-base text-secondary/70 mb-4">
                Same tool as the farmer dashboard — snap crop or soil photos for disease hints and simple next steps.
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
                <img src={aiScanCrop} alt="Farmer scanning crop for AI check" className="w-full h-56 sm:h-64 object-cover" />
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-secondary/50">
          <Link to="/" className="font-bold uppercase tracking-widest text-primary hover:underline">
            ← Home
          </Link>
        </p>
      </main>

      <WorkerJobDetailSheet
        job={detailJob}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) setDetailJob(null);
        }}
        supabase={supabase}
      />
    </div>
  );
};
