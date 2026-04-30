import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
import { FARM_JOBS_TABLE, listAllRecentJobs, listJobsWithFilters, type JobPost } from "@/lib/jobPosts";
import { getWorkerProfileByUserId, upsertWorkerProfile, type WorkerGender } from "@/lib/workerProfiles";
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
  const { user } = useUser();
  const supabase = useMemo(() => createAnonymousSupabaseClient(), []);

  const defaultFilters = useMemo<JobFilterForm>(
    () => ({
      pincode: "",
      district: "",
      block: "",
      minWage: "",
    }),
    [],
  );

  const [draftFilters, setDraftFilters] = useState<JobFilterForm>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<JobFilterForm>(defaultFilters);

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [detailJob, setDetailJob] = useState<JobPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [workerProfileExists, setWorkerProfileExists] = useState(false);
  const [editingWorkerProfile, setEditingWorkerProfile] = useState(true);
  const [workerSkillsInput, setWorkerSkillsInput] = useState("");
  const [workerForm, setWorkerForm] = useState({
    minCostPerDay: "500",
    age: "",
    gender: "male" as WorkerGender,
    availableFrom: "",
    availableTo: "",
    isOnline: true,
    skills: [] as string[],
    bio: "",
  });

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
      setJobsError("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, run supabase/production_schema.sql, then restart/reload.");
      setJobs([]);
      setJobsLoading(false);
      return;
    }

    const pincodeInput = appliedFilters.pincode.trim();
    const districtInput = appliedFilters.district.trim();
    const pincodeArg = pincodeInput || undefined;
    const districtArg = districtInput || undefined;
    const blockArg = appliedFilters.block.trim() || undefined;
    const minParsed = parseInt(appliedFilters.minWage.trim(), 10);
    const minWageArg =
      appliedFilters.minWage.trim() !== "" && Number.isFinite(minParsed) && minParsed > 0 ? minParsed : undefined;

    setJobsLoading(true);
    setJobsError(null);
    const hasAnyFilter = Boolean(pincodeArg || districtArg || blockArg || minWageArg);
    const { data, error } = hasAnyFilter
      ? await listJobsWithFilters(supabase, {
          pincode: pincodeArg,
          district: districtArg,
          block: blockArg,
          minWagePerDay: minWageArg,
        })
      : await listAllRecentJobs(supabase);
    setJobsLoading(false);
    if (error) {
      setJobsError(error.message);
      setJobs([]);
      return;
    }
    setJobs(data ?? []);
  }, [supabase, appliedFilters]);

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

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured() || !user?.id) return;
    void (async () => {
      const { data, error } = await getWorkerProfileByUserId(supabase, user.id);
      if (error || !data) return;
      setWorkerProfileExists(true);
      setEditingWorkerProfile(false);
      setWorkerForm({
        minCostPerDay: String(data.minCostPerDay),
        age: data.age ? String(data.age) : "",
        gender: data.gender,
        availableFrom: data.availableFrom ?? "",
        availableTo: data.availableTo ?? "",
        isOnline: data.isOnline,
        skills: data.skills,
        bio: data.bio,
      });
    })();
  }, [supabase, user?.id]);

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

  const addSkill = () => {
    const v = workerSkillsInput.trim();
    if (!v) return;
    if (workerForm.skills.includes(v)) {
      setWorkerSkillsInput("");
      return;
    }
    setWorkerForm((f) => ({ ...f, skills: [...f.skills, v] }));
    setWorkerSkillsInput("");
  };

  const saveWorkerProfile = async () => {
    if (!supabase || !user?.id) {
      toast.error("Worker profile save failed: Supabase or user missing.");
      return;
    }
    const minCost = parseInt(workerForm.minCostPerDay, 10);
    const age = workerForm.age.trim() ? parseInt(workerForm.age, 10) : null;
    if (!Number.isFinite(minCost) || minCost < 1) {
      toast.error("Enter valid minimum cost per day.");
      return;
    }
    if (age != null && (!Number.isFinite(age) || age < 18 || age > 100)) {
      toast.error("Age must be between 18 and 100.");
      return;
    }
    if (!workerForm.availableFrom || !workerForm.availableTo) {
      toast.error("Select availability date range.");
      return;
    }
    if (workerForm.availableFrom > workerForm.availableTo) {
      toast.error("Available from date must be before available to date.");
      return;
    }
    if (workerForm.skills.length === 0) {
      toast.error("Add at least one skill.");
      return;
    }

    setProfileSaving(true);
    const { error } = await upsertWorkerProfile(supabase, {
      userId: user.id,
      fullName: profile.fullName,
      phone: profile.phone,
      state: profile.state,
      district: profile.district,
      block: profile.block,
      pincode: profile.pincode,
      skills: workerForm.skills,
      minCostPerDay: minCost,
      age,
      gender: workerForm.gender,
      availableFrom: workerForm.availableFrom,
      availableTo: workerForm.availableTo,
      isOnline: workerForm.isOnline,
      bio: workerForm.bio,
    });
    setProfileSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setWorkerProfileExists(true);
    setEditingWorkerProfile(false);
    toast.success("Worker profile updated.");
  };

  const toggleWorkerOnlineStatus = async () => {
    if (!supabase || !user?.id) return;
    const nextOnline = !workerForm.isOnline;
    const minCost = parseInt(workerForm.minCostPerDay, 10);
    const age = workerForm.age.trim() ? parseInt(workerForm.age, 10) : null;
    if (!Number.isFinite(minCost) || minCost < 1) {
      toast.error("Set a valid minimum cost before changing status.");
      return;
    }

    setProfileSaving(true);
    const { error } = await upsertWorkerProfile(supabase, {
      userId: user.id,
      fullName: profile.fullName,
      phone: profile.phone,
      state: profile.state,
      district: profile.district,
      block: profile.block,
      pincode: profile.pincode,
      skills: workerForm.skills,
      minCostPerDay: minCost,
      age,
      gender: workerForm.gender,
      availableFrom: workerForm.availableFrom || null,
      availableTo: workerForm.availableTo || null,
      isOnline: nextOnline,
      bio: workerForm.bio,
    });
    setProfileSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setWorkerForm((f) => ({ ...f, isOnline: nextOnline }));
    toast.success(nextOnline ? "You are now online for farmers." : "You are now offline.");
  };

  useEffect(() => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, [defaultFilters]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-lime-50/40">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-5 sm:p-7 shadow-[0_18px_48px_-18px_rgba(16,185,129,0.35)] transition-all duration-300 hover:shadow-[0_24px_56px_-18px_rgba(16,185,129,0.42)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-lime-200/35 blur-3xl" />
          <div className="relative inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS.worker} dashboard
          </div>
          <h1 className="relative font-display text-3xl sm:text-5xl lg:text-6xl text-emerald-900 font-black tracking-tight">Hello, {name}</h1>
          <p className="relative text-sm sm:text-base text-emerald-900/70 mt-3 leading-relaxed">
            Default area: <span className="font-semibold text-emerald-900">{profile.block}</span>,{" "}
            <span className="font-semibold text-emerald-900">{profile.district}</span> · PIN{" "}
            <span className="font-semibold text-emerald-900">{profile.pincode}</span>
          </p>
          <p className="text-xs font-semibold text-emerald-900/55 mt-3">
            Jobs load from Supabase <code className="text-[10px]">farm_jobs</code> using the filters below. Realtime refresh listens to all
            job changes (refetch applies your current filters).
          </p>
        </section>

        <section className="sticky top-16 z-20 rounded-2xl border border-emerald-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-3 py-3 shadow-[0_10px_26px_-18px_rgba(16,185,129,0.45)]">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            <a href="#worker-profile" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Profile</a>
            <a href="#worker-jobs" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Find Jobs</a>
            <a href="#worker-weather" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Weather</a>
            <a href="#worker-ai-check" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">AI Check</a>
          </div>
        </section>

        <section id="worker-profile" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-1">My worker profile</h2>
          <p className="text-sm text-emerald-900/65 mb-4">
            Farmers discover you from this profile. Switch online to appear in farmer dashboard.
          </p>
          {workerProfileExists && !editingWorkerProfile ? (
            <div className="space-y-4">
              <div
                className={`rounded-2xl border p-4 transition-colors ${
                  workerForm.isOnline
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-emerald-100 bg-emerald-50/40"
                }`}
              >
                <div className="mb-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      workerForm.isOnline
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {workerForm.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="font-semibold text-emerald-900">{profile.fullName}</p>
                <p className="text-xs text-emerald-900/70 mt-1">
                  {workerForm.gender.toUpperCase()} · {workerForm.age ? `${workerForm.age} years` : "Age not set"} · ₹
                  {workerForm.minCostPerDay}/day
                </p>
                <p className="text-xs text-emerald-900/70 mt-1">
                  Availability: {workerForm.availableFrom || "-"} to {workerForm.availableTo || "-"}
                </p>
                <p className="text-xs text-emerald-900/70 mt-1">Skills: {workerForm.skills.join(", ") || "Not set"}</p>
                {workerForm.bio ? <p className="text-xs text-emerald-900/70 mt-1">Bio: {workerForm.bio}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={workerForm.isOnline ? "default" : "outline"}
                  className={`font-bold uppercase tracking-widest text-xs shadow-sm ${
                    workerForm.isOnline ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                  }`}
                  disabled={profileSaving}
                  onClick={() => void toggleWorkerOnlineStatus()}
                >
                  {workerForm.isOnline ? "Online" : "Offline"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="font-bold uppercase tracking-widest text-xs border border-emerald-200"
                  onClick={() => setEditingWorkerProfile(true)}
                >
                  Update Profile
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="worker-min-cost">Minimum cost (₹ / day)</Label>
              <Input
                id="worker-min-cost"
                inputMode="numeric"
                value={workerForm.minCostPerDay}
                onChange={(e) => setWorkerForm((f) => ({ ...f, minCostPerDay: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-age">Age</Label>
              <Input
                id="worker-age"
                inputMode="numeric"
                value={workerForm.age}
                onChange={(e) => setWorkerForm((f) => ({ ...f, age: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-gender">Gender</Label>
              <select
                id="worker-gender"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={workerForm.gender}
                onChange={(e) => setWorkerForm((f) => ({ ...f, gender: e.target.value as WorkerGender }))}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-online">Visibility</Label>
              <select
                id="worker-online"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={workerForm.isOnline ? "online" : "offline"}
                onChange={(e) => setWorkerForm((f) => ({ ...f, isOnline: e.target.value === "online" }))}
              >
                <option value="online">Online (show to farmers)</option>
                <option value="offline">Offline (hide from farmers)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="worker-available-from">Available from</Label>
              <Input
                id="worker-available-from"
                type="date"
                value={workerForm.availableFrom}
                onChange={(e) => setWorkerForm((f) => ({ ...f, availableFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-available-to">Available to</Label>
              <Input
                id="worker-available-to"
                type="date"
                value={workerForm.availableTo}
                onChange={(e) => setWorkerForm((f) => ({ ...f, availableTo: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="worker-skill-input">Skills</Label>
            <div className="flex gap-2">
              <Input
                id="worker-skill-input"
                placeholder="e.g. Harvesting"
                value={workerSkillsInput}
                onChange={(e) => setWorkerSkillsInput(e.target.value)}
              />
                <Button type="button" variant="secondary" className="border border-emerald-200" onClick={addSkill}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {workerForm.skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="rounded-full border border-emerald-300/60 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                  onClick={() => setWorkerForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }))}
                >
                  {skill} ✕
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="worker-bio">Short bio</Label>
            <Input
              id="worker-bio"
              placeholder="Experience, preferred work, timings..."
              value={workerForm.bio}
              onChange={(e) => setWorkerForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <div className="mt-4">
            <Button type="button" className="bg-gradient-to-r from-emerald-600 to-emerald-500 font-bold uppercase tracking-widest text-xs shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]" disabled={profileSaving} onClick={saveWorkerProfile}>
              {profileSaving ? "Saving..." : "Save worker profile"}
            </Button>
          </div>
            </>
          )}
        </section>

        <section id="worker-jobs" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-1">Find jobs</h2>
          <p className="text-sm text-emerald-900/65 mb-4">
            All live jobs are shown by default. Use filters to narrow by location and minimum daily wage.
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
            <Button type="button" className="bg-gradient-to-r from-emerald-600 to-emerald-500 font-bold uppercase tracking-widest text-xs shadow-[0_10px_22px_-10px_rgba(5,150,105,0.8)]" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" className="font-bold uppercase tracking-widest text-xs" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>

          <div className="mt-8 border-t border-emerald-200/70 pt-6">
            <h3 className="font-display text-lg font-black text-emerald-900 mb-3">Results</h3>
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
                    className="w-full text-left rounded-2xl border border-emerald-100 p-4 sm:p-5 bg-gradient-to-b from-white to-emerald-50/45 transition hover:border-emerald-400 hover:bg-emerald-50/75 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-black text-emerald-900">
                          {job.jobRole}
                          {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
                        </p>
                        <p className="text-sm text-emerald-900/75 mt-1">
                          {job.farmingType}
                          {job.farmingTypeOther ? ` (${job.farmingTypeOther})` : ""} · {job.workersNeeded} workers · from ₹
                          {job.minWagePerDay}/day
                        </p>
                      </div>
                      <p className="text-xs font-bold text-primary whitespace-nowrap">{formatWhen(job.createdAt)}</p>
                    </div>
                    <p className="text-xs text-emerald-900/60 mt-1">
                      {job.block}, {job.district} · PIN {job.pincode}
                    </p>
                    <p className="text-sm text-emerald-900/80 mt-2 line-clamp-2">📍 {job.location}</p>
                    <p className="text-xs font-semibold text-emerald-900/55 mt-2">Posted by {job.farmerName}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">Tap for full details →</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="worker-weather" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="font-display text-2xl font-black text-emerald-900">Work weather &amp; safety</h2>
            <span className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider">
              {profile.pincode}
              {!weatherApiConfigured ? " · Add VITE_WEATHERAPI_KEY for live forecast" : ""}
            </span>
          </div>
          <p className="text-sm text-emerald-900/70 mb-4">
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
              {selectedDay?.day} — {selectedDay?.temp}°C · {selectedDay?.text}
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-emerald-900/70">
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
            <div className="mt-3 rounded-xl bg-emerald-100/70 border border-emerald-200 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Is it OK to go to work? · Precautions
              </p>
              <div className="space-y-1.5">
                {workerWeatherTips.map((tip, idx) => (
                  <p key={`${tip}-${idx}`} className="text-sm font-medium text-emerald-900/85">
                    {idx + 1}. {tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="worker-ai-check" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 overflow-hidden shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_48px_-20px_rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
            <div className="p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-3 border border-emerald-200">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                AI Check
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-emerald-900 mb-2">
                AI Crop &amp; Soil <span className="text-primary">Assistant</span>
              </h2>
              <p className="text-sm sm:text-base text-emerald-900/70 mb-4">
                Same tool as the farmer dashboard — snap crop or soil photos for disease hints and simple next steps.
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
