import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { UserRole, getProfile, isOnboardingComplete, saveProfile } from "@/lib/onboarding";
import { getIndiaDistricts, getIndiaStates } from "@/lib/indiaLocation";
import { toast } from "sonner";

const basicSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

const locationSchema = z.object({
  state: z.string().trim().min(2, "State is required").max(60),
  district: z.string().trim().min(2, "District is required").max(60),
  block: z.string().trim().min(2, "Block is required").max(60),
  village: z.string().trim().max(80).optional().or(z.literal("")),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
});

const PRESET_CROPS = [
  "Rice", "Wheat", "Maize", "Pulses", "Millets",
  "Sugarcane", "Cotton", "Oilseeds", "Vegetables", "Tea / Coffee / Coconut",
] as const;

const MAX_CROPS = 15;

type OnboardingForm = {
  fullName: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  village: string;
  pincode: string;
  crops: string[];
  farmSize: string;
  mainCrop: string;
};

type OnboardingFieldName = Exclude<keyof OnboardingForm, "crops">;

const Field = ({
  name,
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: {
  name: OnboardingFieldName;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (name: OnboardingFieldName, value: string) => void;
  error?: string;
  type?: string;
}) => (
  <label className="block">
    <span className="text-sm font-semibold text-secondary mb-1.5 block">{label}</span>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
    />
    {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
  </label>
);

const Onboarding = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [customCrop, setCustomCrop] = useState("");
  const [form, setForm] = useState<OnboardingForm>({
    fullName: "",
    phone: "",
    state: "",
    district: "",
    block: "",
    village: "",
    pincode: "",
    crops: [] as string[],
    farmSize: "",
    mainCrop: "",
  });
  const states = getIndiaStates();
  const selectedStateCode = states.find((s) => s.name === form.state)?.code ?? "";
  const districts = selectedStateCode ? getIndiaDistricts(selectedStateCode) : [];

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      const existing = await getProfile(user.id);
      if (!mounted) return;
      if (!existing?.role) {
        navigate("/role", { replace: true });
        return;
      }
      setRole(existing.role);
      if (isOnboardingComplete(existing)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setForm({
        fullName: existing?.fullName ?? "",
        phone: existing?.phone ?? "",
        state: existing?.state ?? "",
        district: existing?.district ?? "",
        block: existing?.block ?? "",
        village: existing?.village ?? "",
        pincode: existing?.pincode ?? "",
        crops: existing?.crops ?? [],
        farmSize: existing?.farmSize ?? "",
        mainCrop: existing?.mainCrop ?? "",
      });
      setLoading(false);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const isFarmer = role === "farmer";
  const onboardingTitle = isFarmer ? "Farmer onboarding" : "Profile onboarding";
  const totalSteps = isFarmer ? 4 : 2;

  const setField = (key: OnboardingFieldName, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setState = (stateName: string) => {
    setForm((prev) => ({
      ...prev,
      state: stateName,
      district: "",
      block: "",
    }));
  };

  const toggleCrop = (crop: string) => {
    setForm((prev) => {
      const has = prev.crops.includes(crop);
      if (has) return { ...prev, crops: prev.crops.filter((c) => c !== crop) };
      if (prev.crops.length >= MAX_CROPS) return prev;
      return { ...prev, crops: [...prev.crops, crop] };
    });
  };

  const addCustomCrop = () => {
    const crop = customCrop.trim();
    if (!crop) return;
    if (form.crops.includes(crop)) {
      setCustomCrop("");
      return;
    }
    if (form.crops.length >= MAX_CROPS) {
      toast.error("You can select up to 15 crops.");
      return;
    }
    setForm((prev) => ({ ...prev, crops: [...prev.crops, crop] }));
    setCustomCrop("");
  };

  const nextStep = () => {
    setErrors({});
    if (step === 1) {
      const result = basicSchema.safeParse({ fullName: form.fullName, phone: form.phone });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
        setErrors(fieldErrors);
        return;
      }
    }
    if (step === 2) {
      const result = locationSchema.safeParse({
        state: form.state,
        district: form.district,
        block: form.block,
        village: form.village,
        pincode: form.pincode,
      });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
        setErrors(fieldErrors);
        return;
      }
    }
    if (isFarmer && step === 3 && form.crops.length === 0) {
      setErrors({ crops: "Select at least one crop." });
      return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const existing = await getProfile(user.id);
    if (!existing?.role) return;
    await saveProfile(user.id, {
      role: existing.role,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      state: form.state.trim(),
      district: form.district.trim(),
      block: form.block.trim(),
      village: form.village.trim() || undefined,
      pincode: form.pincode.trim(),
      crops: isFarmer ? form.crops : undefined,
      farmSize: form.farmSize.trim() || undefined,
      mainCrop: form.mainCrop.trim() || undefined,
    });
    setSaving(false);
    toast.success("Profile saved!");
    navigate("/dashboard");
  };

  if (!user) return <Navigate to="/" replace />;
  if (loading) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 text-secondary/60">Loading...</main></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-primary mb-3">
            Step {step} of {totalSteps}
          </p>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-secondary mb-3">{onboardingTitle}</h1>
          <p className="text-sm sm:text-base text-secondary/60">
            One-time setup. Keep it short and practical.
          </p>
        </div>

        <div className="bg-card rounded-2xl sm:rounded-3xl border border-primary/10 shadow-card p-5 sm:p-8 space-y-5">
          {step === 1 && (
            <>
              <h2 className="font-display text-2xl text-secondary font-black">Screen 1: Basic Info</h2>
              <Field name="fullName" label="Full name" placeholder="Ramesh Kumar" value={form.fullName} onChange={setField} error={errors.fullName} />
              <Field name="phone" label="Phone number" placeholder="9876543210" type="tel" value={form.phone} onChange={setField} error={errors.phone} />
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-2xl text-secondary font-black">Screen 2: Location</h2>
              <p className="text-xs font-semibold text-secondary/60">Powers job matching, worker discovery and local network.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-sm font-semibold text-secondary mb-1.5 block">State</span>
                  <select
                    value={form.state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {errors.state && <span className="text-xs text-destructive mt-1 block">{errors.state}</span>}
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-secondary mb-1.5 block">District</span>
                  <select
                    value={form.district}
                    onChange={(e) => setField("district", e.target.value)}
                    disabled={!selectedStateCode}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors disabled:opacity-50"
                  >
                    <option value="">{selectedStateCode ? "Select district" : "Select state first"}</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district && <span className="text-xs text-destructive mt-1 block">{errors.district}</span>}
                </label>
                <Field name="block" label="Block" placeholder="Sinnar" value={form.block} onChange={setField} error={errors.block} />
                <Field name="village" label="Village (optional)" placeholder="Mohadi" value={form.village} onChange={setField} error={errors.village} />
              </div>
              <Field name="pincode" label="Pincode" placeholder="422103" value={form.pincode} onChange={setField} error={errors.pincode} />
            </>
          )}

          {isFarmer && step === 3 && (
            <>
              <h2 className="font-display text-2xl text-secondary font-black">Screen 3: Crop Selection</h2>
              <p className="text-xs font-semibold text-secondary/60">Max 15 crops. Multi-select + custom crop supported.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_CROPS.map((crop) => {
                  const selected = form.crops.includes(crop);
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => toggleCrop(crop)}
                      className={`text-left rounded-xl px-4 py-3 border text-sm font-semibold transition ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input text-secondary hover:border-primary/40"
                      }`}
                    >
                      {selected ? "[✔] " : "[ ] "} {crop}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={customCrop}
                  onChange={(e) => setCustomCrop(e.target.value)}
                  placeholder="Add your crop"
                  className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" onClick={addCustomCrop} className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.crops.map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => toggleCrop(crop)}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  >
                    {crop} ✕
                  </button>
                ))}
              </div>
              {errors.crops && <p className="text-xs text-destructive">{errors.crops}</p>}
            </>
          )}

          {isFarmer && step === 4 && (
            <>
              <h2 className="font-display text-2xl text-secondary font-black">Screen 4: Optional</h2>
              <Field name="farmSize" label="Farm size (optional)" placeholder="3 acres" value={form.farmSize} onChange={setField} />
              <Field name="mainCrop" label="Main crop (optional)" placeholder="Rice" value={form.mainCrop} onChange={setField} />
            </>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl border border-input text-secondary font-semibold disabled:opacity-40"
              disabled={step === 1}
            >
              Back
            </button>
            {step < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-3d bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl border-2 border-primary-deep"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="btn-3d bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl border-2 border-primary-deep disabled:opacity-50"
              >
                {saving ? "Saving..." : "Finish setup"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
