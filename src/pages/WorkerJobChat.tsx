import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { getProfile } from "@/lib/onboarding";
import { createAnonymousSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseBrowser";
import { getJobById, type JobPost } from "@/lib/jobPosts";

/**
 * Placeholder route for worker ↔ farmer messaging.
 * Implementation contract: subscribe using `jobId` (UUID) as the thread key; load job via {@link getJobById}.
 */
const WorkerJobChatPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user, isLoaded } = useUser();
  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [job, setJob] = useState<JobPost | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) {
        setRoleOk(false);
        return;
      }
      const p = await getProfile(user.id);
      if (cancelled) return;
      setRoleOk(p?.role === "worker");
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!jobId || !isSupabaseConfigured()) {
        setJob(null);
        setJobError(!jobId ? "Missing job id in URL." : "Supabase is not configured.");
        return;
      }
      const client = createAnonymousSupabaseClient();
      if (!client) {
        setJobError("Supabase client unavailable.");
        return;
      }
      const { data, error } = await getJobById(client, jobId);
      if (cancelled) return;
      if (error) {
        setJobError(error.message);
        setJob(null);
        return;
      }
      setJobError(null);
      setJob(data);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!isLoaded) return null;
  if (!user) return <Navigate to="/" replace />;
  if (roleOk === false) return <Navigate to="/dashboard" replace />;
  if (roleOk === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-xl mx-auto px-6 py-16 text-secondary/70">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <Link to="/dashboard" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="font-display text-3xl font-black text-secondary mt-3">Job chat</h1>
          <p className="text-sm text-secondary/70 mt-2">
            Thread key: <code className="text-xs font-semibold">{jobId}</code>
          </p>
        </div>

        {jobError ? (
          <p className="text-sm font-medium text-destructive">{jobError}</p>
        ) : !job ? (
          <p className="text-sm text-secondary/65">Loading job…</p>
        ) : (
          <section className="rounded-2xl border border-primary/15 bg-card p-5 space-y-2">
            <p className="font-display text-lg font-black text-secondary">
              {job.jobRole}
              {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
            </p>
            <p className="text-sm text-secondary/75">
              {job.farmingType} · ₹{job.minWagePerDay}/day · {job.workersNeeded} workers
            </p>
            <p className="text-sm text-secondary/80">📍 {job.location}</p>
            <p className="text-xs text-secondary/55 mt-3">
              Mount your chat UI below. Use <code className="text-[10px]">getJobById</code> for header context and{" "}
              <code className="text-[10px]">{`workerJobChatPath('${job.id}')`}</code> for deep links.
            </p>
          </section>
        )}

        <div className="rounded-xl border border-dashed border-primary/25 bg-muted/30 p-4 text-xs text-secondary/70 font-medium leading-relaxed">
          Next implementation steps: create a `job_messages` table (or use Stream channel id = job id), add RLS or Edge
          Function with service role, and render a message list + composer in this route only.
        </div>
      </main>
    </div>
  );
};

export default WorkerJobChatPage;
