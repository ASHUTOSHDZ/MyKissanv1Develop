import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { getProfile, isOnboardingComplete, type OnboardingProfile } from "@/lib/onboarding";
import { FarmerDashboard } from "@/pages/FarmerDashboard";
import { WorkerDashboard } from "@/pages/WorkerDashboard";
import { VehicleOwnerDashboard } from "@/pages/VehicleOwnerDashboard";
import { VendorDashboard } from "@/pages/VendorDashboard";

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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

  if (!isLoaded) return null;
  if (!user) return <Navigate to="/" replace />;
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-20 text-secondary/60">Loading profile...</main>
      </div>
    );
  }
  if (!profile?.role) return <Navigate to="/role" replace />;
  if (!isOnboardingComplete(profile)) return <Navigate to="/onboarding" replace />;

  if (profile.role === "farmer") {
    return <FarmerDashboard profile={profile} userId={user.id} />;
  }
  if (profile.role === "worker") {
    return <WorkerDashboard profile={profile} />;
  }
  if (profile.role === "vehicle_owner") {
    return <VehicleOwnerDashboard profile={profile} />;
  }
  if (profile.role === "vendor") {
    return <VendorDashboard profile={profile} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-lime-50/40">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-20">
        <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50 p-8 sm:p-10 text-center space-y-4 shadow-[0_18px_48px_-18px_rgba(16,185,129,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-lime-200/35 blur-3xl" />
          <h1 className="relative font-display text-3xl sm:text-5xl font-black text-emerald-900 tracking-tight">Dashboard</h1>
          <p className="relative text-emerald-900/70 font-medium leading-relaxed">
          Your role ({profile.role}) does not have a full dashboard in this preview yet. Switch to Farmer or Worker in
          onboarding to try job posting and listings.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
