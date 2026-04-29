import { Sprout, Briefcase, Tractor, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { saveRole, getProfile, isOnboardingComplete, UserRole } from "@/lib/onboarding";
import { RoleDetailsDialog, RoleId } from "@/components/RoleDetailsDialog";

const ROLES: { id: UserRole; title: string; desc: string; icon: React.ReactNode }[] = [
  { id: "farmer", title: "Farmer", desc: "Post jobs, rent vehicles, find vendors.", icon: <Sprout className="size-7" /> },
  { id: "worker", title: "Worker", desc: "Find jobs in your block, set your wage.", icon: <Briefcase className="size-7" /> },
  { id: "vehicle_owner", title: "Vehicle Owner", desc: "Rent your tractor or harvester.", icon: <Tractor className="size-7" /> },
  { id: "vendor", title: "Vendor", desc: "Sell seeds, fertilizers, supplies.", icon: <ShoppingBag className="size-7" /> },
];

const RoleSelect = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [openRole, setOpenRole] = useState<RoleId | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) {
        if (mounted) setChecking(false);
        return;
      }
      const existing = await getProfile(user.id);
      if (mounted && isOnboardingComplete(existing)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (mounted) setChecking(false);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const confirmPick = async (role: UserRole) => {
    if (!user) return;
    await saveRole(user.id, role);
    navigate("/onboarding");
  };

  if (!user) return <Navigate to="/" replace />;
  if (checking) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-secondary/60">Loading...</main></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-primary mb-3">
            Step 1 of 2
          </p>
          <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-secondary mb-4">
            Welcome, <span className="text-primary">{user?.firstName ?? "friend"}</span>.
          </h1>
          <p className="text-base sm:text-lg text-secondary/60 max-w-xl mx-auto">
            How will you use MyKissan? Pick your role to continue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenRole(r.id as RoleId)}
              className="card-3d group text-left p-5 sm:p-7 bg-card rounded-2xl sm:rounded-3xl border border-primary/10 hover:border-primary/40"
            >
              <div className="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 sm:mb-5 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6 group-hover:scale-110">
                {r.icon}
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-secondary mb-1">{r.title}</h3>
              <p className="text-sm text-secondary/60">{r.desc}</p>
            </button>
          ))}
        </div>
      </main>
      <RoleDetailsDialog
        roleId={openRole}
        onClose={() => setOpenRole(null)}
        onContinue={(id) => {
          setOpenRole(null);
          confirmPick(id as UserRole);
        }}
      />
    </div>
  );
};

export default RoleSelect;
