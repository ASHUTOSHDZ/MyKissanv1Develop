import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { Phone, MapPin, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { JobPost } from "@/lib/jobPosts";
import { fetchFarmerProfilePublic, type FarmerProfilePublic } from "@/lib/farmerContact";
import { workerJobChatPath } from "@/lib/workerJobChat";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  job: JobPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supabase: SupabaseClient | null;
};

const formatPosted = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const telHref = (raw: string): string | undefined => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  if (digits.startsWith("91") && digits.length >= 12) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+91${digits}`;
  return `tel:+${digits}`;
};

export const WorkerJobDetailSheet = ({ job, open, onOpenChange, supabase }: Props) => {
  const [contactOpen, setContactOpen] = useState(false);
  const [profileFromDb, setProfileFromDb] = useState<FarmerProfilePublic | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!open || !job) {
      setContactOpen(false);
      setProfileFromDb(null);
      return;
    }
    setContactOpen(false);
    setProfileFromDb(null);
  }, [open, job?.id]);

  const loadProfileFallback = async () => {
    if (!supabase || !job) {
      toast.error("Supabase client not ready.");
      return;
    }
    setProfileLoading(true);
    const { data, error } = await fetchFarmerProfilePublic(supabase, job.farmerUserId);
    setProfileLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.message("No profile row found for this farmer in Supabase.");
      return;
    }
    setProfileFromDb(data);
  };

  const displayPhone = (job?.farmerPhone?.trim() || profileFromDb?.phone || "").trim();
  const displayName = job?.farmerName || profileFromDb?.fullName || "Farmer";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto border-primary/15">
        {!job ? null : (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-left text-xl pr-8">
                {job.jobRole}
                {job.jobRoleOther ? ` — ${job.jobRoleOther}` : ""}
              </SheetTitle>
              <SheetDescription className="text-left">
                Posted {formatPosted(job.createdAt)} · Job id <code className="text-xs">{job.id}</code>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Crop / farm</p>
                <p className="font-medium text-secondary mt-1">
                  {job.farmingType}
                  {job.farmingTypeOther ? ` (${job.farmingTypeOther})` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Workers & pay</p>
                <p className="font-medium text-secondary mt-1">
                  {job.workersNeeded} workers · minimum ₹{job.minWagePerDay}/day
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Duration</p>
                <p className="font-medium text-secondary mt-1">
                  {job.duration}
                  {job.durationOther ? ` — ${job.durationOther}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Field / site location</p>
                <p className="font-medium text-secondary mt-1 flex items-start gap-2">
                  <MapPin className="size-4 shrink-0 text-primary mt-0.5" aria-hidden />
                  <span>{job.location}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Farmer area (profile pincode)</p>
                <p className="font-medium text-secondary mt-1">
                  {job.block}, {job.district}, {job.state} — PIN {job.pincode}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Facilities</p>
                <p className="font-medium text-secondary mt-1">
                  Meals: {job.foodProvided ? "Provided" : "Not provided"} · Transport:{" "}
                  {job.transportProvided ? "Farmer can help with pickup" : "Worker arranges travel"}
                </p>
              </div>
              {job.extraRequirements ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Requirements</p>
                  <p className="mt-1 whitespace-pre-wrap text-secondary/85 rounded-lg border border-primary/10 bg-muted/40 p-3">
                    {job.extraRequirements}
                  </p>
                </div>
              ) : null}
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-bold"
                onClick={() => setContactOpen((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <Phone className="size-4" />
                  View contact
                </span>
                {contactOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>

              {contactOpen ? (
                <div className="rounded-xl border border-primary/15 bg-muted/40 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary/60">Farmer name</p>
                    <p className="font-semibold text-secondary">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary/60">Phone</p>
                    {displayPhone ? (
                      <a
                        href={telHref(displayPhone)}
                        className="font-display text-lg font-black text-primary hover:underline break-all"
                      >
                        {displayPhone}
                      </a>
                    ) : (
                      <p className="text-sm text-secondary/70">
                        Not stored on this job. Use “Sync phone from profile” if the farmer has `profiles.phone` in
                        Supabase.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary/60">Work site & region</p>
                    <p className="text-sm text-secondary/85 whitespace-pre-wrap">{job.location}</p>
                    <p className="text-sm text-secondary/70 mt-1">
                      {job.block}, {job.district}, {job.state} — PIN {job.pincode}
                    </p>
                    {profileFromDb?.village ? (
                      <p className="text-xs text-secondary/60 mt-1">Village (profile): {profileFromDb.village}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={profileLoading || !supabase}
                    onClick={() => void loadProfileFallback()}
                  >
                    {profileLoading ? "Loading profile…" : "Sync phone from profile"}
                  </Button>
                </div>
              ) : null}

              <Button type="button" variant="default" className="w-full font-bold gap-2" asChild>
                <Link to={workerJobChatPath(job.id)}>
                  <MessageSquare className="size-4" />
                  Chat
                </Link>
              </Button>
              <p className="text-[11px] text-secondary/55 leading-snug">
                Chat opens the worker job thread route. Wire Supabase Realtime, Stream, or your vendor there — the route
                and job id are stable API surface for that integration.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
