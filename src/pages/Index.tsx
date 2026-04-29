import { Cloud, Sprout, Tractor, Briefcase, Store, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Navigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import tractorField from "@/assets/tractor-field.jpg";
import farmerCrops from "@/assets/farmer-crops.jpg";
import aiScanCrop from "@/assets/ai-scan-crop.jpg";
import { RoleDetailsDialog, RoleId } from "@/components/RoleDetailsDialog";
import { ServiceDetailsDialog, ServiceId } from "@/components/ServiceDetailsDialog";

const Index = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [openRole, setOpenRole] = useState<RoleId | null>(null);
  const [openService, setOpenService] = useState<ServiceId | null>(null);

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-32 sm:pb-40 grid grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="col-span-12 lg:col-span-6 animate-fade-in text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Rabi Season Live
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl leading-[0.95] text-secondary mb-6">
            Grow more.{" "}
            <span className="text-primary">Earn more.</span>{" "}
            Together.
          </h1>
          <p className="text-base sm:text-lg text-secondary/70 max-w-[50ch] mx-auto lg:mx-0 mb-8 font-medium">
            A digital home for every Indian farmer. Hire workers, rent tractors,
            sell produce, and check the weather — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-4 sm:gap-6">
            <GoogleSignInButton />
            <a
              href="#services"
              className="story-link text-sm font-bold uppercase tracking-widest text-secondary/70 hover:text-primary px-2 py-3 self-center"
            >
              Explore services →
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 sm:gap-8 border-t border-primary/10 pt-6 sm:pt-8">
            <div>
              <p className="font-display text-3xl sm:text-4xl text-primary leading-none font-black">1.2M+</p>
              <p className="text-[10px] sm:text-xs font-medium text-secondary/50 uppercase tracking-wider mt-1">
                Active Farmers
              </p>
            </div>
            <div className="w-px h-8 bg-primary/20" />
            <div>
              <p className="font-display text-3xl sm:text-4xl text-primary leading-none font-black">480</p>
              <p className="text-[10px] sm:text-xs font-medium text-secondary/50 uppercase tracking-wider mt-1">
                Registered Mandis
              </p>
            </div>
          </div>
        </div>

        {/* Two stacked hero images with floating badges */}
        <div className="col-span-12 lg:col-span-6 relative animate-scale-in min-h-[420px] sm:min-h-[520px] lg:min-h-[560px] mt-4 lg:mt-0">
          {/* Top image — tractor */}
          <div className="absolute top-0 right-0 w-[70%] sm:w-[68%] rounded-2xl sm:rounded-[1.75rem] overflow-hidden border-[3px] sm:border-4 border-primary-deep shadow-[0_20px_40px_-15px_hsl(142_72%_32%_/_0.5)] rotate-2 transition-transform duration-500 hover:rotate-0 hover:scale-105 z-10">
            <img
              src={tractorField}
              alt="Modern tractor working in a green Indian wheat field"
              width={1024}
              height={1024}
              className="w-full h-52 sm:h-64 lg:h-72 object-cover"
            />
            {/* Floating weather badge */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-card/95 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border border-primary/20 animate-float">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary">Today</p>
              <p className="font-display text-base sm:text-lg font-black text-secondary leading-none mt-0.5">28°C ☀</p>
            </div>
          </div>

          {/* Bottom image — farmer with crops */}
          <div className="absolute bottom-0 left-0 w-[66%] sm:w-[64%] rounded-2xl sm:rounded-[1.75rem] overflow-hidden border-[3px] sm:border-4 border-primary-deep shadow-[0_20px_40px_-15px_hsl(142_72%_32%_/_0.5)] -rotate-3 transition-transform duration-500 hover:rotate-0 hover:scale-105 z-20">
            <img
              src={farmerCrops}
              alt="Smiling Indian farmer holding a basket of fresh harvested vegetables and wheat"
              width={1024}
              height={1024}
              className="w-full h-56 sm:h-72 lg:h-80 object-cover"
            />
            {/* Floating price badge */}
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-primary text-primary-foreground rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border-2 border-primary-deep" style={{ animation: "float 6s ease-in-out infinite", animationDelay: "1.5s" }}>
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest opacity-80">Wheat / qtl</p>
              <p className="font-display text-base sm:text-lg font-black leading-none mt-0.5">₹ 2,425</p>
            </div>
          </div>

          {/* Glow */}
          <div className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full -z-10" />
        </div>

        {/* Grass SVG strip at bottom of hero */}
        <svg
          className="absolute bottom-0 left-0 w-full h-16 text-primary"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,60 L0,40 Q15,20 25,38 Q35,5 50,35 Q60,15 72,40 Q85,10 100,38 Q115,22 130,40 Q145,8 160,38 Q175,18 190,40 Q205,10 220,38 Q235,22 250,40 Q265,5 280,38 Q295,18 310,40 Q325,10 340,38 Q355,22 370,40 Q385,8 400,38 Q415,20 430,40 Q445,10 460,38 Q475,22 490,40 Q505,5 520,38 Q535,18 550,40 Q565,10 580,38 Q595,22 610,40 Q625,8 640,38 Q655,20 670,40 Q685,10 700,38 Q715,22 730,40 Q745,5 760,38 Q775,18 790,40 Q805,10 820,38 Q835,22 850,40 Q865,8 880,38 Q895,20 910,40 Q925,10 940,38 Q955,22 970,40 Q985,5 1000,38 Q1015,18 1030,40 Q1045,10 1060,38 Q1075,22 1090,40 Q1105,8 1120,38 Q1135,20 1150,40 Q1165,10 1180,38 Q1195,22 1200,40 L1200,60 Z"
          />
        </svg>
      </main>

      {/* AI-Enabled Farming — Coming Soon */}
      <section id="ai-farming" className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 sm:pt-8 sm:pb-16">
        <div className="relative bg-card rounded-[2rem] sm:rounded-[2.5rem] border border-primary/15 overflow-hidden card-3d">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
            {/* Image */}
            <div className="relative order-2 md:order-1 p-5 sm:p-8">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-[3px] sm:border-4 border-primary-deep shadow-[0_20px_40px_-15px_hsl(142_72%_32%_/_0.45)] -rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src={aiScanCrop}
                  alt="Indian farmer scanning a wheat crop with smartphone for AI quality check"
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="w-full h-56 sm:h-72 md:h-80 object-cover"
                />
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-card/95 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border border-primary/20 animate-float">
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary">AI Scan</p>
                  <p className="font-display text-sm sm:text-base font-black text-secondary leading-none mt-0.5">Healthy ✓</p>
                </div>
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-primary text-primary-foreground rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border-2 border-primary-deep" style={{ animation: "float 6s ease-in-out infinite", animationDelay: "1.2s" }}>
                  <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest opacity-80">Tip</p>
                  <p className="font-display text-sm sm:text-base font-black leading-none mt-0.5">+18% Yield</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 md:order-2 p-5 sm:p-8 md:p-10 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Coming Soon
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-secondary font-black leading-[1.05] mb-3 sm:mb-4">
                AI-Enabled <span className="text-primary">Farming</span>.
              </h2>
              <p className="text-sm sm:text-base text-secondary/70 font-medium mb-5 sm:mb-6 max-w-[48ch] mx-auto md:mx-0">
                Just click a photo of your crop, leaf, soil or any farm item — our AI
                will check the quality, spot diseases early, and tell you exactly how
                to improve yield in your own language.
              </p>
              <ul className="space-y-2 sm:space-y-3 mb-6 text-left max-w-md mx-auto md:mx-0">
                {[
                  "📷 Snap a photo of leaf, crop or field",
                  "🧠 AI detects disease, pest or nutrient issue",
                  "🌱 Get simple suggestions to improve quality",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 bg-muted/60 rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-primary/10">
                    <span className="font-display font-black text-sm sm:text-base text-secondary">{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/ai-scan"
                className="btn-3d inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest shadow-lg hover:scale-105 transition"
              >
                📷 Check Crop / Soil →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section id="services" className="bg-muted/60 border-y border-primary/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-12 text-center md:text-left">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-secondary font-black">
                Built for every <span className="text-primary">role</span>.
              </h2>
              <p className="text-sm sm:text-base text-secondary/60 mt-2 max-w-xl mx-auto md:mx-0 font-medium">
                Whether you grow it, harvest it, move it, or sell it — MyKissan
                connects you to the people you need.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                id: "farmer" as RoleId,
                icon: <Sprout className="size-6" />,
                title: "Farmers",
                desc: "Post jobs, hire workers, rent vehicles, sell produce, get weather alerts.",
              },
              {
                id: "worker" as RoleId,
                icon: <Briefcase className="size-6" />,
                title: "Workers",
                desc: "Find work in your block, set your daily wage, get notified instantly.",
              },
              {
                id: "vehicle_owner" as RoleId,
                icon: <Tractor className="size-6" />,
                title: "Vehicle Owners",
                desc: "List your tractors and equipment for rent to farmers nearby.",
              },
              {
                id: "vendor" as RoleId,
                icon: <ShoppingBag className="size-6" />,
                title: "Vendors",
                desc: "Showcase seeds, fertilizers, and supplies to farmers in your district.",
              },
            ].map((s, i) => (
              <button
                key={s.title}
                onClick={() => setOpenRole(s.id)}
                className="card-3d group p-6 sm:p-8 bg-card rounded-2xl sm:rounded-3xl border border-primary/10 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-5 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6 group-hover:scale-110">
                  {s.icon}
                </div>
                <h3 className="font-display font-black text-xl sm:text-2xl text-secondary mb-2 text-left">{s.title}</h3>
                <p className="text-sm text-secondary/60 font-medium text-left">{s.desc}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary text-left">View details →</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quick services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-secondary font-black text-center mb-8 sm:mb-12">
          Everything in <span className="text-primary">one app</span>.
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[
            { id: "marketplace" as ServiceId, icon: <Store className="size-7" />, title: "Marketplace", desc: "Daily mandi prices." },
            { id: "vehicles" as ServiceId, icon: <Tractor className="size-7" />, title: "Vehicles", desc: "Rent tractors nearby." },
            { id: "workers" as ServiceId, icon: <Briefcase className="size-7" />, title: "Workers", desc: "Verified labor." },
            { id: "weather" as ServiceId, icon: <Cloud className="size-7" />, title: "Weather", desc: "7-day forecast." },
          ].map((s, i) => (
            <button
              key={s.title}
              onClick={() => setOpenService(s.id)}
              className="card-3d group p-5 sm:p-7 bg-card rounded-2xl sm:rounded-3xl border border-primary/10 text-left animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                {s.icon}
              </div>
              <h3 className="font-display font-black text-lg sm:text-2xl text-secondary mb-1">{s.title}</h3>
              <p className="text-xs sm:text-sm text-secondary/60 font-medium">{s.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="how" className="relative max-w-7xl mx-4 sm:mx-auto my-10 sm:my-12 px-5 sm:px-6 py-14 sm:py-20 text-center bg-gradient-marigold rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative">
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl text-primary-foreground font-black mb-3 sm:mb-4">
            Join the collective.
          </h2>
          <p className="text-primary-foreground/90 max-w-xl mx-auto mb-6 sm:mb-8 font-medium text-sm sm:text-lg">
            Sign in with Google. Pick your role. Tell us where you farm. You're in.
          </p>
          <div className="flex justify-center">
            <GoogleSignInButton label="Get started with Google" />
          </div>
        </div>
      </section>

      <footer id="about" className="border-t border-primary/10 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <p className="text-[10px] sm:text-xs font-semibold text-secondary/40 uppercase tracking-widest text-center">
            © 2026 MyKissan Digital Collective
          </p>
          <div className="flex gap-8">
            <a href="#" className="story-link text-xs font-bold text-secondary/60 hover:text-primary uppercase tracking-widest">
              Terms
            </a>
            <a href="#" className="story-link text-xs font-bold text-secondary/60 hover:text-primary uppercase tracking-widest">
              Privacy
            </a>
          </div>
        </div>
      </footer>
      <RoleDetailsDialog roleId={openRole} onClose={() => setOpenRole(null)} />
      <ServiceDetailsDialog serviceId={openService} onClose={() => setOpenService(null)} />
    </div>
  );
};

export default Index;
