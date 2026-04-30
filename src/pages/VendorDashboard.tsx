import { Navbar } from "@/components/Navbar";
import { type OnboardingProfile, ROLE_LABELS } from "@/lib/onboarding";

type VendorDashboardProps = {
  profile: OnboardingProfile;
};

export const VendorDashboard = ({ profile }: VendorDashboardProps) => {
  const name = profile.fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-lime-50/40">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-5 sm:p-8 shadow-[0_18px_48px_-18px_rgba(16,185,129,0.35)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-lime-200/35 blur-3xl" />
          <div className="relative inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" /> {ROLE_LABELS.vendor} dashboard
          </div>
          <h1 className="relative font-display text-3xl sm:text-5xl lg:text-6xl text-emerald-900 font-black tracking-tight">Welcome, {name}</h1>
          <p className="relative text-sm sm:text-base text-emerald-900/70 mt-3 leading-relaxed">
            Vendor dashboard UI is ready with the same premium farm-tech experience. Product, stock and order modules can be connected next.
          </p>
        </section>

        <section className="sticky top-16 z-20 rounded-2xl border border-emerald-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-3 py-3 shadow-[0_10px_26px_-18px_rgba(16,185,129,0.45)]">
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
            <a href="#vendor-products" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Products</a>
            <a href="#vendor-stores" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Store Info</a>
            <a href="#vendor-orders" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Orders</a>
          </div>
        </section>

        <section id="vendor-products" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)]">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-2">Products</h2>
          <p className="text-sm text-emerald-900/65">Seeds, fertilizers, pesticide and equipment catalog UI section.</p>
        </section>

        <section id="vendor-stores" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)]">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-2">Store Information</h2>
          <p className="text-sm text-emerald-900/65">Business profile, service locations, timings and availability UI section.</p>
        </section>

        <section id="vendor-orders" className="scroll-mt-32 rounded-[26px] border border-emerald-200/70 bg-white/95 p-5 sm:p-6 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.35)]">
          <h2 className="font-display text-2xl font-black text-emerald-900 mb-2">Orders</h2>
          <p className="text-sm text-emerald-900/65">Incoming requests, order status and delivery tracking UI section.</p>
        </section>
      </main>
    </div>
  );
};
