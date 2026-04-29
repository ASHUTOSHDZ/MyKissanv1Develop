import { Check, Sparkles, Crown, Leaf } from "lucide-react";
import { AI_PLANS, type PlanId } from "@/lib/aiPlans";

interface Props {
  onSelect: (planId: PlanId) => void;
  currentPlan?: PlanId;
}

const ICONS: Record<PlanId, JSX.Element> = {
  free: <Leaf className="size-5" />,
  pro: <Sparkles className="size-5" />,
  unlimited: <Crown className="size-5" />,
};

export const PlanGate = ({ onSelect, currentPlan }: Props) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-10">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-full">
          <Sparkles className="size-3.5" /> Choose your plan
        </span>
        <h1 className="font-display font-black text-2xl sm:text-4xl text-secondary mt-3 leading-tight">
          Pick a plan to start <span className="text-primary">Kissan AI</span>
        </h1>
        <p className="text-sm sm:text-base text-secondary/70 font-medium mt-2 max-w-xl mx-auto">
          Try free with 6 photos. Upgrade anytime for more scans and smarter AI.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {AI_PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={`relative rounded-3xl border-2 p-5 sm:p-6 flex flex-col bg-card transition shadow-sm hover:shadow-lg ${
                p.highlight
                  ? "border-primary shadow-md md:scale-[1.02]"
                  : "border-primary/15"
              }`}
            >
              {p.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow ${
                    p.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {p.badge}
                </span>
              )}

              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center ${
                    p.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {ICONS[p.id]}
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-secondary leading-tight">
                    {p.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-secondary/60 uppercase tracking-wide">
                    {p.tagline}
                  </p>
                </div>
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-3xl sm:text-4xl text-secondary">
                    {p.currency}
                    {p.price}
                  </span>
                  {p.price > 0 && (
                    <span className="text-xs font-bold text-secondary/60">
                      / month
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-primary mt-1">
                  {p.photoLimit === -1
                    ? "Unlimited photos"
                    : `${p.photoLimit} photo scans`}
                </p>
              </div>

              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-secondary/80 font-medium">
                    <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelect(p.id)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    : "bg-muted text-secondary border border-primary/15 hover:bg-primary/5 hover:border-primary"
                } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                {isCurrent
                  ? "Continue with this plan"
                  : p.price === 0
                  ? "Start free"
                  : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] font-semibold text-secondary/50 mt-6">
        Payments are simulated for now. Real billing will be added soon.
      </p>
    </div>
  );
};