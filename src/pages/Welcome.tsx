import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { getProfile, ROLE_LABELS } from "@/lib/onboarding";
import aiScanCrop from "@/assets/ai-scan-crop.jpg";

type ForecastDay = {
  day: string;
  date: string;
  temp: string;
  text: string;
  humidity: string;
  wind: string;
  rainChance: string;
  tip: string;
};

type WeatherApiForecastDay = {
  date: string;
  day?: {
    avgtemp_c?: number;
    avghumidity?: number;
    maxwind_kph?: number;
    daily_chance_of_rain?: string | number;
    condition?: {
      text?: string;
    };
  };
};

type WeatherApiResponse = {
  forecast?: {
    forecastday?: WeatherApiForecastDay[];
  };
};

const Welcome = () => {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedForecastDay, setSelectedForecastDay] = useState(0);
  const [forecast, setForecast] = useState<ForecastDay[]>([
    { day: "Today", date: "Now", temp: "32°C", text: "Sunny", humidity: "48%", wind: "12 km/h", rainChance: "10%", tip: "Good window for harvesting and drying crops." },
    { day: "Fri", date: "Tomorrow", temp: "31°C", text: "Partly cloudy", humidity: "55%", wind: "14 km/h", rainChance: "20%", tip: "Field work is safe. Keep irrigation moderate." },
    { day: "Sat", date: "Day 3", temp: "29°C", text: "Rain chance", humidity: "68%", wind: "18 km/h", rainChance: "45%", tip: "Keep drainage channels open before evening." },
    { day: "Sun", date: "Day 4", temp: "30°C", text: "Light showers", humidity: "72%", wind: "16 km/h", rainChance: "55%", tip: "Avoid pesticide spraying during afternoon." },
    { day: "Mon", date: "Day 5", temp: "33°C", text: "Sunny", humidity: "46%", wind: "10 km/h", rainChance: "8%", tip: "Best day for post-rain field inspection." },
  ]);
  const weatherApiKey = import.meta.env.VITE_WEATHERAPI_KEY as string | undefined;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) {
        if (mounted) setLoadingProfile(false);
        return;
      }
      const p = await getProfile(user.id);
      if (!mounted) return;
      setProfile(p);
      setLoadingProfile(false);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!profile?.pincode || !weatherApiKey) return;
      try {
        const requestForecast = async (query: string): Promise<WeatherApiResponse | null> => {
          const q = encodeURIComponent(query);
          const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${q}&days=5&aqi=no&alerts=no`,
          );
          if (!res.ok) return null;
          return (await res.json()) as WeatherApiResponse;
        };

        let data = await requestForecast(`${profile.pincode},IN`);
        const resolvedCountry = (data as { location?: { country?: string } } | null)?.location?.country;

        // If pincode resolves outside India, retry with district/state context.
        if (
          (!data || resolvedCountry !== "India") &&
          profile.district &&
          profile.state
        ) {
          data = await requestForecast(`${profile.district}, ${profile.state}, India`);
        }

        if (!data) return;
        const mapped: ForecastDay[] = (data.forecast?.forecastday ?? []).map((item, idx: number) => ({
          day:
            idx === 0
              ? "Today"
              : new Date(item.date).toLocaleDateString("en-IN", { weekday: "short" }),
          date: new Date(item.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
          temp: `${Math.round(item.day?.avgtemp_c ?? 0)}°C`,
          text: item.day?.condition?.text ?? "Weather update",
          humidity: `${Math.round(item.day?.avghumidity ?? 0)}%`,
          wind: `${Math.round(item.day?.maxwind_kph ?? 0)} km/h`,
          rainChance: `${item.day?.daily_chance_of_rain ?? 0}%`,
          tip:
            Number(item.day?.daily_chance_of_rain ?? 0) > 40
              ? "Rain likely. Plan harvest and spraying carefully."
              : "Weather is relatively stable for routine farm work.",
        }));
        if (mounted && mapped.length > 0) {
          setForecast(mapped);
          setSelectedForecastDay(0);
        }
      } catch {
        // Keep fallback data
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [profile?.pincode, weatherApiKey]);

  if (!isLoaded) return null;
  if (!user) return <Navigate to="/" replace />;
  if (loadingProfile) return <div className="min-h-screen bg-background"><Navbar /><main className="max-w-4xl mx-auto px-6 py-20 text-secondary/60">Loading profile...</main></div>;
  if (!profile?.role) return <Navigate to="/role" replace />;
  if (!profile.fullName || !profile.state || !profile.district || !profile.block || !profile.pincode) return <Navigate to="/onboarding" replace />;
  if (profile.role !== "farmer") return <Navigate to="/" replace />;

  const name = profile.fullName.split(" ")[0];
  const crops = profile.crops?.length ? profile.crops : ["Rice", "Vegetables"];
  const jobs = [
    { title: "Need 3 workers for rice harvesting", pay: "₹400/day", date: "2 June" },
  ];
  const workers = [
    { name: "Suresh", pay: "₹350/day", status: "Available" },
    { name: "Raju", pay: "₹400/day", status: "Offline" },
  ];

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
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="btn-3d bg-primary text-primary-foreground border-2 border-primary-deep rounded-xl py-4 px-5 text-base font-bold text-left">
              ➕ Post Job
            </button>
            <button className="btn-3d bg-secondary text-secondary-foreground rounded-xl py-4 px-5 text-base font-bold text-left">
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
                <p className="font-display text-xl font-black mt-1">{f.temp}</p>
                <p className="text-xs font-semibold mt-1 truncate">{f.text}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-background p-4">
            <p className="font-display text-xl font-black text-secondary">
              {forecast[selectedForecastDay]?.day} Details - {forecast[selectedForecastDay]?.temp}
            </p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-secondary/70">
              <p>Condition: {forecast[selectedForecastDay]?.text}</p>
              <p>Humidity: {forecast[selectedForecastDay]?.humidity}</p>
              <p>Wind: {forecast[selectedForecastDay]?.wind}</p>
              <p>Rain chance: {forecast[selectedForecastDay]?.rainChance}</p>
            </div>
            <p className="mt-2 text-sm font-medium text-primary">{forecast[selectedForecastDay]?.tip}</p>
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
          <h2 className="font-display text-2xl font-black text-secondary mb-4">Nearby Workers (Same Pincode)</h2>
          <div className="space-y-3">
            {workers.map((w) => (
              <div key={w.name} className="rounded-2xl border border-primary/10 p-4 bg-muted/50 flex items-center justify-between transition hover:border-primary/40 hover:bg-primary/5">
                <p className="font-semibold text-secondary">{w.name} - {w.pay}</p>
                <p className={`text-xs font-bold ${w.status === "Available" ? "text-primary" : "text-secondary/50"}`}>{w.status}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-secondary/50 mt-3">Realtime worker data will be connected from worker role profiles.</p>
        </section>

        <section className="rounded-3xl border border-primary/10 bg-card p-5 sm:p-6 shadow-card hover:shadow-soft transition-all duration-300">
          <h2 className="font-display text-2xl font-black text-secondary mb-4">My Job Postings</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.title} className="rounded-2xl border border-primary/10 p-4 bg-muted/50 transition hover:border-primary/40 hover:bg-primary/5">
                <p className="font-semibold text-secondary">{job.title}</p>
                <p className="text-sm text-secondary/70 mt-1">{job.pay} | {job.date}</p>
                <div className="mt-2 flex gap-4 text-xs font-bold text-primary">
                  <button>Edit</button>
                  <button>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-secondary/50 mt-3">Job list will be fetched from farmer job posts table.</p>
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
    </div>
  );
};

export default Welcome;
