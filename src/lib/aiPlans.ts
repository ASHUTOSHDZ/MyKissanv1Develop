// AI Scan plans configuration.
// ⚙️ ADMIN: change prices, photo limits, names or features here anytime.
// Later this can be moved to a database / remote config without changing UI code.

export type PlanId = "free" | "pro" | "unlimited";

export interface AiPlan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // INR per month, 0 = free
  currency: string;
  durationDays: number; // billing cycle length
  photoLimit: number; // -1 = unlimited
  badge?: string;
  highlight?: boolean;
  features: string[];
}

export const AI_PLANS: AiPlan[] = [
  {
    id: "free",
    name: "Free Trial",
    tagline: "Try Kissan AI",
    price: 0,
    currency: "₹",
    durationDays: 30,
    photoLimit: 6,
    features: [
      "6 photo scans (one-time)",
      "Basic crop & soil check",
      "Reply in your language",
      "No payment needed",
    ],
  },
  {
    id: "pro",
    name: "Pro Farmer",
    tagline: "Most chosen by farmers",
    price: 299,
    currency: "₹",
    durationDays: 30,
    photoLimit: 30,
    badge: "Popular",
    highlight: true,
    features: [
      "30 photo scans / month",
      "Better optimized AI assistant",
      "Detailed disease & soil report",
      "Improvement steps in simple language",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited Pro",
    tagline: "For serious growers",
    price: 999,
    currency: "₹",
    durationDays: 30,
    photoLimit: -1,
    badge: "Best",
    features: [
      "Unlimited photo scans",
      "Advanced AI research mode",
      "Smart product & fertilizer suggestions",
      "Priority faster replies",
    ],
  },
];

export const getPlan = (id: PlanId): AiPlan =>
  AI_PLANS.find((p) => p.id === id) ?? AI_PLANS[0];

// ---- Local persistence (replace with backend later) ----
const KEY = "mykissan.aiPlan.v1";

export interface PlanState {
  planId: PlanId;
  startedAt: string; // ISO
  photosUsed: number;
}

export const loadPlanState = (): PlanState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlanState;
  } catch {
    return null;
  }
};

export const savePlanState = (s: PlanState) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};

export const clearPlanState = () => localStorage.removeItem(KEY);

export const choosePlan = (planId: PlanId): PlanState => {
  const existing = loadPlanState();
  // Keep photo count when upgrading mid-cycle so people don't lose history,
  // but reset when switching back to free.
  const photosUsed =
    existing && planId !== "free" ? existing.photosUsed : 0;
  const next: PlanState = {
    planId,
    startedAt: new Date().toISOString(),
    photosUsed,
  };
  savePlanState(next);
  return next;
};

export const incrementPhotoUsage = (): PlanState | null => {
  const s = loadPlanState();
  if (!s) return null;
  const next = { ...s, photosUsed: s.photosUsed + 1 };
  savePlanState(next);
  return next;
};

export const remainingPhotos = (s: PlanState): number => {
  const plan = getPlan(s.planId);
  if (plan.photoLimit === -1) return Infinity;
  return Math.max(0, plan.photoLimit - s.photosUsed);
};

export const isOverLimit = (s: PlanState): boolean => {
  const plan = getPlan(s.planId);
  if (plan.photoLimit === -1) return false;
  return s.photosUsed >= plan.photoLimit;
};