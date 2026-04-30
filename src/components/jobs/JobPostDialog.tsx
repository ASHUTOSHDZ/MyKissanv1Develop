import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { OnboardingProfile } from "@/lib/onboarding";
import { addJob, updateJob, type JobPost } from "@/lib/jobPosts";
import { getSmartJobHints } from "@/lib/jobAiHints";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FARMING_TYPES = [
  "Rice (Paddy)",
  "Wheat",
  "Cotton",
  "Sugarcane",
  "Maize",
  "Pulses",
  "Oilseeds",
  "Vegetables",
  "Fruits",
  "Other (specify)",
] as const;

const JOB_ROLES = [
  "General labor",
  "Land preparation / ploughing support",
  "Transplanting / sowing",
  "Weeding",
  "Watering / irrigation",
  "Fertilizer application",
  "Pesticide / spraying support",
  "Harvesting",
  "Picking / loading",
  "Threshing / winnowing support",
  "Other (specify)",
] as const;

const DURATIONS = [
  "1 day",
  "2–3 days",
  "About 1 week",
  "2+ weeks",
  "Season-long",
  "Other (describe in notes)",
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseClient | null;
  profile: OnboardingProfile;
  userId: string;
  jobToEdit: JobPost | null;
  onSaved: () => void;
};

const emptyForm = () => ({
  farmingType: "" as string,
  farmingTypeOther: "",
  jobRole: "" as string,
  jobRoleOther: "",
  workersNeeded: "1",
  location: "",
  duration: "" as string,
  durationOther: "",
  minWagePerDay: "",
  foodProvided: "yes" as "yes" | "no",
  transportProvided: "no" as "yes" | "no",
  extraRequirements: "",
  aiQuery: "",
});

export const JobPostDialog = ({ open, onOpenChange, supabase, profile, userId, jobToEdit, onSaved }: Props) => {
  const [form, setForm] = useState(emptyForm);
  const [hints, setHints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setHints([]);
    if (jobToEdit) {
      setForm({
        farmingType: jobToEdit.farmingType,
        farmingTypeOther: jobToEdit.farmingTypeOther,
        jobRole: jobToEdit.jobRole,
        jobRoleOther: jobToEdit.jobRoleOther,
        workersNeeded: String(jobToEdit.workersNeeded),
        location: jobToEdit.location,
        duration: jobToEdit.duration,
        durationOther: jobToEdit.durationOther,
        minWagePerDay: String(jobToEdit.minWagePerDay),
        foodProvided: jobToEdit.foodProvided ? "yes" : "no",
        transportProvided: jobToEdit.transportProvided ? "yes" : "no",
        extraRequirements: jobToEdit.extraRequirements,
        aiQuery: "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, jobToEdit]);

  const applyHintsToNotes = () => {
    if (hints.length === 0) return;
    const block = hints.map((h) => `• ${h}`).join("\n");
    setForm((f) => ({
      ...f,
      extraRequirements: f.extraRequirements.trim()
        ? `${f.extraRequirements.trim()}\n\n${block}`
        : block,
    }));
  };

  const runSmartHints = () => {
    const q = form.aiQuery.trim() || `${form.farmingType} ${form.jobRole} ${form.extraRequirements}`;
    setHints(getSmartJobHints(q));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      const msg = "Supabase client not ready. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const workersNeeded = Math.max(1, parseInt(form.workersNeeded, 10) || 0);
    const minWage = parseInt(form.minWagePerDay, 10);
    if (!form.farmingType) {
      setError("Select farming type.");
      return;
    }
    if (form.farmingType === "Other (specify)" && !form.farmingTypeOther.trim()) {
      setError("Describe the farming type.");
      return;
    }
    if (!form.jobRole) {
      setError("Select why workers are required.");
      return;
    }
    if (form.jobRole === "Other (specify)" && !form.jobRoleOther.trim()) {
      setError("Describe the job role.");
      return;
    }
    if (!form.location.trim()) {
      setError("Enter work location (village / field / landmark).");
      return;
    }
    if (!form.duration) {
      setError("Select work duration.");
      return;
    }
    if (!Number.isFinite(minWage) || minWage < 1) {
      setError("Enter a valid minimum wage per day (₹).");
      return;
    }

    const payload = {
      farmerUserId: userId,
      farmerName: profile.fullName,
      farmerPhone: profile.phone?.trim() ?? "",
      pincode: profile.pincode,
      district: profile.district,
      state: profile.state,
      block: profile.block,
      farmingType: form.farmingType,
      farmingTypeOther: form.farmingType === "Other (specify)" ? form.farmingTypeOther.trim() : "",
      jobRole: form.jobRole,
      jobRoleOther: form.jobRole === "Other (specify)" ? form.jobRoleOther.trim() : "",
      workersNeeded,
      location: form.location.trim(),
      duration: form.duration,
      durationOther: form.duration.includes("Other") ? form.durationOther.trim() : "",
      minWagePerDay: minWage,
      foodProvided: form.foodProvided === "yes",
      transportProvided: form.transportProvided === "yes",
      extraRequirements: form.extraRequirements.trim(),
    };

    setSaving(true);
    try {
      if (jobToEdit) {
        const { farmerUserId: _omit, ...patch } = payload;
        const { error: saveErr } = await updateJob(supabase, userId, jobToEdit.id, patch);
        if (saveErr) {
          setError(saveErr.message);
          toast.error(saveErr.message);
          return;
        }
        toast.success("Job updated");
      } else {
        const { error: saveErr } = await addJob(supabase, payload);
        if (saveErr) {
          setError(saveErr.message);
          toast.error(saveErr.message);
          return;
        }
        toast.success("Job published");
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-primary/15 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl sm:text-2xl">
            {jobToEdit ? "Update job posting" : "Post a farm job"}
          </DialogTitle>
          <DialogDescription>
            Saved to Supabase table <code className="text-xs">farm_jobs</code> using the project anon key. Workers see jobs for the same pincode via filtered queries.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Farming type</Label>
              <Select
                value={form.farmingType || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, farmingType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select crop / activity" />
                </SelectTrigger>
                <SelectContent>
                  {FARMING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.farmingType === "Other (specify)" && (
                <Input
                  placeholder="e.g. Mushroom, Dairy support"
                  value={form.farmingTypeOther}
                  onChange={(e) => setForm((f) => ({ ...f, farmingTypeOther: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Why workers are needed</Label>
              <Select
                value={form.jobRole || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, jobRole: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job role" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_ROLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.jobRole === "Other (specify)" && (
                <Input
                  placeholder="Describe the work"
                  value={form.jobRoleOther}
                  onChange={(e) => setForm((f) => ({ ...f, jobRoleOther: e.target.value }))}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workers-needed">Workers needed</Label>
              <Input
                id="workers-needed"
                type="number"
                min={1}
                value={form.workersNeeded}
                onChange={(e) => setForm((f) => ({ ...f, workersNeeded: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-wage">Minimum wage (₹ / day)</Label>
              <Input
                id="min-wage"
                type="number"
                min={1}
                placeholder="e.g. 400"
                value={form.minWagePerDay}
                onChange={(e) => setForm((f) => ({ ...f, minWagePerDay: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Work location</Label>
            <Input
              id="location"
              placeholder="Village, block, field landmark, distance from road"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={form.duration || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meals provided?</Label>
              <Select
                value={form.foodProvided}
                onValueChange={(v) => setForm((f) => ({ ...f, foodProvided: v as "yes" | "no" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — lunch / tea</SelectItem>
                  <SelectItem value="no">No — workers arrange food</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.duration.includes("Other") && (
            <div className="space-y-2">
              <Label htmlFor="duration-other">Duration details</Label>
              <Input
                id="duration-other"
                placeholder="e.g. Until harvest finishes (about 10 days)"
                value={form.durationOther}
                onChange={(e) => setForm((f) => ({ ...f, durationOther: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Pickup / transport support?</Label>
            <Select
              value={form.transportProvided}
              onValueChange={(v) => setForm((f) => ({ ...f, transportProvided: v as "yes" | "no" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — from nearby point</SelectItem>
                <SelectItem value="no">No — worker reaches field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-primary/15 bg-muted/40 p-3 space-y-2">
            <Label htmlFor="ai-query">Smart suggestions (keyword helper)</Label>
            <p className="text-xs text-secondary/65">
              Type what you need in your own words. We suggest extra lines you can add to the job — no account or API
              required.
            </p>
            <Input
              id="ai-query"
              placeholder="e.g. Need 5 people for paddy transplant near canal"
              value={form.aiQuery}
              onChange={(e) => setForm((f) => ({ ...f, aiQuery: e.target.value }))}
            />
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={runSmartHints}>
              Get suggestions
            </Button>
            {hints.length > 0 && (
              <div className="mt-2 space-y-2">
                <ul className="text-sm list-disc pl-5 space-y-1 text-secondary/85">
                  {hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                <Button type="button" variant="outline" size="sm" onClick={applyHintsToNotes}>
                  Add suggestions to requirements
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra">Other requirements</Label>
            <Textarea
              id="extra"
              rows={4}
              placeholder="Start time, tools, safety, language preference, payment terms..."
              value={form.extraRequirements}
              onChange={(e) => setForm((f) => ({ ...f, extraRequirements: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary" disabled={saving}>
              {saving ? "Saving…" : jobToEdit ? "Save changes" : "Publish job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
