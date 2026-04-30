import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { getProfile, isOnboardingComplete, type OnboardingProfile } from "@/lib/onboarding";
import { FarmerDashboard } from "@/pages/FarmerDashboard";
import { WorkerDashboard } from "@/pages/WorkerDashboard";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-black text-secondary">Dashboard</h1>
        <p className="text-secondary/70 font-medium">
          Your role ({profile.role}) does not have a full dashboard in this preview yet. Switch to Farmer or Worker in
          onboarding to try job posting and listings.
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
