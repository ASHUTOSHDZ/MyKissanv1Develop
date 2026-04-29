import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sprout,
  Briefcase,
  Tractor,
  ShoppingBag,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type RoleId = "farmer" | "worker" | "vehicle_owner" | "vendor";

interface RoleConfig {
  title: string;
  tagline: string;
  description: string;
  icon: ReactNode;
  benefits: string[];
  stats: { label: string; value: string }[];
  chartLabel: string;
  chartUnit: string;
  chartData: { name: string; value: number }[];
  ctaLabel: string;
}

export const ROLE_CONFIGS: Record<RoleId, RoleConfig> = {
  farmer: {
    title: "Farmer",
    tagline: "Grow smarter, sell better.",
    description:
      "Get everything you need to run your farm — hire workers, rent tractors, check the weather, and sell your harvest at the best mandi price, all from your phone.",
    icon: <Sprout className="size-6" />,
    benefits: [
      "Post a job and hire local workers in minutes",
      "Rent tractors & harvesters from owners nearby",
      "See live mandi prices for your crop, every day",
      "Get 7-day weather alerts for your village",
      "Buy seeds & fertilizer from trusted vendors",
    ],
    stats: [
      { label: "Avg. monthly income lift", value: "+₹8,400" },
      { label: "Time saved per week", value: "12 hrs" },
      { label: "Trusted vendors near you", value: "240+" },
    ],
    chartLabel: "Wheat mandi price (₹/qtl)",
    chartUnit: "₹",
    chartData: [
      { name: "Jan", value: 2180 },
      { name: "Feb", value: 2240 },
      { name: "Mar", value: 2310 },
      { name: "Apr", value: 2380 },
      { name: "May", value: 2425 },
      { name: "Jun", value: 2470 },
    ],
    ctaLabel: "Continue as Farmer",
  },
  worker: {
    title: "Worker",
    tagline: "Find work near home.",
    description:
      "Stop waiting at the chowk for a job. Get notified when farmers in your block need workers — set your own daily wage, accept what fits, and skip the rest.",
    icon: <Briefcase className="size-6" />,
    benefits: [
      "Daily job alerts from farms in your block",
      "Set your own wage — no middleman cut",
      "See farm location, crop, and duration up front",
      "Build a verified work history & rating",
      "Get paid digitally to your UPI",
    ],
    stats: [
      { label: "Avg. daily wage", value: "₹520" },
      { label: "Active jobs in your block", value: "38" },
      { label: "Workers earning weekly", value: "5,200+" },
    ],
    chartLabel: "Daily wages earned this week (₹)",
    chartUnit: "₹",
    chartData: [
      { name: "Mon", value: 480 },
      { name: "Tue", value: 520 },
      { name: "Wed", value: 0 },
      { name: "Thu", value: 560 },
      { name: "Fri", value: 540 },
      { name: "Sat", value: 600 },
      { name: "Sun", value: 500 },
    ],
    ctaLabel: "Continue as Worker",
  },
  vehicle_owner: {
    title: "Vehicle Owner",
    tagline: "Your tractor, working full-time.",
    description:
      "Turn your idle tractor or harvester into daily income. List your vehicle, set your hourly rate, and get rental requests from farmers in your district.",
    icon: <Tractor className="size-6" />,
    benefits: [
      "List tractors, harvesters, tillers in 2 minutes",
      "Set your own hourly or per-acre rate",
      "Get booking requests from verified farmers",
      "Track bookings & payments in one place",
      "Boost utilization during peak season",
    ],
    stats: [
      { label: "Avg. monthly bookings", value: "42" },
      { label: "Earnings per active vehicle", value: "₹38k" },
      { label: "Active farmers nearby", value: "1,800+" },
    ],
    chartLabel: "Bookings per month",
    chartUnit: "",
    chartData: [
      { name: "Jan", value: 18 },
      { name: "Feb", value: 24 },
      { name: "Mar", value: 32 },
      { name: "Apr", value: 41 },
      { name: "May", value: 48 },
      { name: "Jun", value: 42 },
    ],
    ctaLabel: "Continue as Vehicle Owner",
  },
  vendor: {
    title: "Vendor",
    tagline: "Sell to thousands of farmers.",
    description:
      "Showcase your seeds, fertilizers, and supplies to farmers in your district. Reach more buyers, grow your store, and never lose a customer to distance again.",
    icon: <ShoppingBag className="size-6" />,
    benefits: [
      "Create a digital storefront in minutes",
      "Reach farmers in 50+ km radius",
      "Promote seasonal offers and bundles",
      "Chat with buyers and confirm orders",
      "Build a loyal repeat customer base",
    ],
    stats: [
      { label: "Avg. monthly enquiries", value: "180+" },
      { label: "Avg. order value", value: "₹2,100" },
      { label: "Active farmers in your district", value: "12k+" },
    ],
    chartLabel: "Orders per month",
    chartUnit: "",
    chartData: [
      { name: "Jan", value: 64 },
      { name: "Feb", value: 78 },
      { name: "Mar", value: 95 },
      { name: "Apr", value: 120 },
      { name: "May", value: 142 },
      { name: "Jun", value: 168 },
    ],
    ctaLabel: "Continue as Vendor",
  },
};

interface Props {
  roleId: RoleId | null;
  onClose: () => void;
  onContinue?: (roleId: RoleId) => void;
}

export const RoleDetailsDialog = ({ roleId, onClose, onContinue }: Props) => {
  const open = roleId !== null;
  const config = roleId ? ROLE_CONFIGS[roleId] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl border-2 border-primary/20">
        {config && (
          <>
            {/* Header */}
            <div className="bg-gradient-marigold text-primary-foreground p-6 sm:p-8 rounded-t-3xl">
              <DialogHeader className="text-left space-y-3">
                <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground">
                  {config.icon}
                </div>
                <DialogTitle className="font-display font-black text-3xl sm:text-4xl tracking-tight">
                  {config.title}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/90 text-base sm:text-lg font-semibold">
                  {config.tagline}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Description */}
              <p className="text-sm sm:text-base text-secondary/80 font-medium leading-relaxed">
                {config.description}
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {config.stats.map((s) => (
                  <div
                    key={s.label}
                    className="bg-muted rounded-2xl p-3 sm:p-4 text-center border border-primary/10"
                  >
                    <p className="font-display font-black text-lg sm:text-2xl text-primary leading-tight">
                      {s.value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-secondary/60 font-semibold mt-1 leading-tight">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-card rounded-2xl border border-primary/10 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm font-bold text-secondary uppercase tracking-wider">
                    {config.chartLabel}
                  </p>
                  <div className="flex items-center gap-1 text-primary text-xs font-bold">
                    <TrendingUp className="size-3.5" />
                    Trending
                  </div>
                </div>
                <div className="h-40 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={config.chartData}
                      margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                        formatter={(v: number) => [`${config.chartUnit}${v}`, config.title]}
                      />
                      <Bar
                        dataKey="value"
                        fill="hsl(var(--primary))"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Benefits checklist */}
              <div>
                <p className="text-xs sm:text-sm font-bold text-secondary uppercase tracking-wider mb-3">
                  How MyKissan helps you
                </p>
                <ul className="space-y-2">
                  {config.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-secondary/80 font-medium">
                      <span className="mt-0.5 shrink-0 size-5 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {onContinue && (
              <DialogFooter className="p-6 sm:p-8 pt-0">
                <button
                  onClick={() => roleId && onContinue(roleId)}
                  className="btn-3d w-full bg-primary text-primary-foreground border-2 border-primary-deep font-bold py-4 rounded-xl"
                >
                  {config.ctaLabel}
                </button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};