import { ReactNode } from "react";
import { Cloud, Store, Tractor, Briefcase, TrendingUp, MapPin, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ServiceId = "marketplace" | "vehicles" | "workers" | "weather";

interface ServiceConfig {
  title: string;
  subtitle: string;
  icon: ReactNode;
  highlights: string[];
  stats: { label: string; value: string }[];
}

const SERVICE_CONFIGS: Record<ServiceId, ServiceConfig> = {
  marketplace: {
    title: "Marketplace",
    subtitle: "Live mandi prices and demand signals.",
    icon: <Store className="size-5" />,
    highlights: [
      "Daily mandi rates for wheat, paddy, onion, and cotton",
      "Best nearby mandi suggestions based on price trend",
      "Price movement alerts before harvest day",
    ],
    stats: [
      { label: "Top wheat rate today", value: "₹2,425 / qtl" },
      { label: "Nearby mandis tracked", value: "38" },
      { label: "7-day price trend", value: "+4.2%" },
    ],
  },
  vehicles: {
    title: "Vehicles",
    subtitle: "Book tractors and farm machines near you.",
    icon: <Tractor className="size-5" />,
    highlights: [
      "Filter by tractor HP, implements, and hourly rate",
      "See owner rating and distance from your village",
      "Track booking slot and estimated arrival time",
    ],
    stats: [
      { label: "Available tractors", value: "124" },
      { label: "Avg. rent / hour", value: "₹650" },
      { label: "Average arrival", value: "42 min" },
    ],
  },
  workers: {
    title: "Workers",
    subtitle: "Find verified labor with transparent wage info.",
    icon: <Briefcase className="size-5" />,
    highlights: [
      "Search by skill: sowing, harvesting, spraying, packing",
      "See worker rating, experience, and previous farm jobs",
      "Book single day or multi-day labor teams",
    ],
    stats: [
      { label: "Verified workers", value: "2,340" },
      { label: "Avg. daily wage", value: "₹520" },
      { label: "Same-day availability", value: "68%" },
    ],
  },
  weather: {
    title: "Weather",
    subtitle: "7-day forecast with crop-specific advice.",
    icon: <Cloud className="size-5" />,
    highlights: [
      "Hyperlocal forecast by village and pincode",
      "Rain, wind, humidity and spray safety alerts",
      "Action tips for irrigation and harvest planning",
    ],
    stats: [
      { label: "Rain chance (next 48h)", value: "65%" },
      { label: "Max temp tomorrow", value: "33°C" },
      { label: "Wind advisory", value: "Moderate" },
    ],
  },
};

interface Props {
  serviceId: ServiceId | null;
  onClose: () => void;
}

export const ServiceDetailsDialog = ({ serviceId, onClose }: Props) => {
  const config = serviceId ? SERVICE_CONFIGS[serviceId] : null;

  return (
    <Dialog open={serviceId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl border-2 border-primary/20 p-0 overflow-hidden">
        {config && (
          <>
            <div className="bg-gradient-marigold text-primary-foreground p-6 sm:p-8">
              <DialogHeader className="text-left space-y-3">
                <div className="inline-flex size-11 items-center justify-center rounded-xl bg-white/20">
                  {config.icon}
                </div>
                <DialogTitle className="font-display text-3xl sm:text-4xl font-black">
                  {config.title}
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/90 text-sm sm:text-base font-semibold">
                  {config.subtitle}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {config.stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-primary/10 bg-muted p-4">
                    <p className="font-display text-2xl font-black text-primary leading-none">{stat.value}</p>
                    <p className="text-xs font-semibold text-secondary/60 mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {config.highlights.map((item) => (
                  <p key={item} className="text-sm sm:text-base font-medium text-secondary/80">
                    • {item}
                  </p>
                ))}
              </div>

              <div className="rounded-2xl border border-primary/10 bg-card p-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-secondary/60">
                <span className="inline-flex items-center gap-1.5"><TrendingUp className="size-3.5 text-primary" /> Live updates</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" /> District level</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-primary" /> Weekly insights</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
