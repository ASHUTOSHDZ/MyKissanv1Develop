import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Image as ImageIcon, Send, Sparkles, ArrowLeft, Loader2, X, Leaf, Crown, RefreshCw, Circle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "@/hooks/use-toast";
import { PlanGate } from "@/components/ai/PlanGate";
import {
  choosePlan,
  getPlan,
  incrementPhotoUsage,
  isOverLimit,
  loadPlanState,
  remainingPhotos,
  type PlanId,
  type PlanState,
} from "@/lib/aiPlans";

// TODO: paste your n8n production webhook URL here when ready
const N8N_WEBHOOK_URL = "";

type ChatMsg = {
  id: string;
  role: "user" | "ai";
  text?: string;
  imageUrl?: string;
};

const SUGGESTIONS = [
  "Check my wheat leaf health",
  "Is my soil good for paddy?",
  "Why are my tomato leaves yellow?",
  "Best fertilizer for this crop?",
];

const AiScan = () => {
  const [planState, setPlanState] = useState<PlanState | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    setPlanState(loadPlanState());
  }, []);

  const currentPlan = useMemo(
    () => (planState ? getPlan(planState.planId) : null),
    [planState],
  );

  const handleSelectPlan = (id: PlanId) => {
    const next = choosePlan(id);
    setPlanState(next);
    setShowPlans(false);
    const p = getPlan(id);
    toast({
      title: `${p.name} activated 🎉`,
      description:
        p.photoLimit === -1
          ? "Enjoy unlimited AI scans."
          : `You have ${p.photoLimit} photo scans available.`,
    });
  };

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "ai",
      text:
        "Namaste 🙏 I'm your Kissan AI helper. Click a photo of your crop, leaf or soil and tell me what you want to check. I'll reply with what's wrong and how to improve it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    // Browser security: must be called inside the user gesture, before any awaits if possible.
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Camera not supported",
        description: "Your browser doesn't support live camera. Use the gallery button.",
        variant: "destructive",
      });
      // Fallback to native file input
      cameraRef.current?.click();
      return;
    }
    setCameraOpen(true);
    setCameraLoading(true);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraOpen(false);
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast({
          title: "Camera blocked",
          description: "Allow camera access in your browser settings, then tap the camera again.",
          variant: "destructive",
        });
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast({ title: "No camera found on this device", variant: "destructive" });
      } else if (name === "NotReadableError") {
        toast({
          title: "Camera busy",
          description: "Another app is using the camera. Close it and try again.",
          variant: "destructive",
        });
      } else {
        // Last-resort fallback to native picker
        cameraRef.current?.click();
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast({ title: "Camera not ready yet", variant: "destructive" });
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" });
        handleFile(file);
        closeCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  // Cleanup on unmount
  useEffect(() => () => stopStream(), []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image too large (max 10MB)", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setPendingImage({ file, url });
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !pendingImage) {
      toast({ title: "Add a photo or a message" });
      return;
    }

    // Plan limit check (only photos count toward usage)
    if (pendingImage && planState && isOverLimit(planState)) {
      toast({
        title: "Photo limit reached",
        description: "Upgrade your plan to keep scanning.",
        variant: "destructive",
      });
      setShowPlans(true);
      return;
    }

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: text || undefined,
      imageUrl: pendingImage?.url,
    };
    setMessages((m) => [...m, userMsg]);
    const imageToSend = pendingImage?.file;
    setInput("");
    setPendingImage(null);
    setSending(true);

    if (imageToSend) {
      const updated = incrementPhotoUsage();
      if (updated) setPlanState(updated);
    }

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);

    try {
      let aiText = "";

      if (!N8N_WEBHOOK_URL) {
        // Webhook not configured yet
        aiText =
          "⚙️ AI webhook is not connected yet. Once your n8n workflow webhook is added, your photo and question will be sent there and the AI's reply will appear here in plain text.";
      } else {
        const fd = new FormData();
        fd.append("message", text);
        fd.append("source", "mykissan-web");
        fd.append("timestamp", new Date().toISOString());
        if (imageToSend) fd.append("image", imageToSend, imageToSend.name);

        const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Webhook error ${res.status}`);

        // Accept either plain text or JSON { reply | message | text }
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          aiText =
            data.reply ||
            data.message ||
            data.text ||
            data.output ||
            JSON.stringify(data);
        } else {
          aiText = await res.text();
        }
        if (!aiText?.trim()) aiText = "✅ Received, but the AI returned an empty reply.";
      }

      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "ai", text: aiText }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "ai",
          text: "❌ Could not reach the AI right now. Please check your internet and try again.",
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      {/* Plan gate: shown when no plan picked yet, or when user opens it to upgrade */}
      {(!planState || showPlans) && (
        <main className="flex-1 overflow-y-auto">
          {showPlans && planState && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
              <button
                onClick={() => setShowPlans(false)}
                className="text-xs font-bold text-secondary/70 hover:text-primary inline-flex items-center gap-1"
              >
                <ArrowLeft className="size-3.5" /> Back to chat
              </button>
            </div>
          )}
          <PlanGate onSelect={handleSelectPlan} currentPlan={planState?.planId} />
        </main>
      )}

      {planState && !showPlans && (
      <>
      {/* Header */}
      <header className="border-b border-primary/10 bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="size-9 rounded-xl bg-muted flex items-center justify-center text-secondary hover:bg-primary/10 hover:text-primary transition"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-base sm:text-lg leading-tight text-secondary">
              Kissan AI — Crop & Soil Check
            </h1>
            <p className="text-[11px] sm:text-xs text-secondary/60 font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              Online · Reply in your language
            </p>
          </div>
          {currentPlan && (
            <button
              onClick={() => setShowPlans(true)}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide bg-primary/10 text-primary hover:bg-primary/15 px-2.5 py-1.5 rounded-full transition"
              title="Change plan"
            >
              {currentPlan.id === "unlimited" ? <Crown className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {currentPlan.name}
              {currentPlan.photoLimit !== -1 && (
                <span className="text-secondary/70">
                  · {Math.max(0, currentPlan.photoLimit - planState.photosUsed)}/{currentPlan.photoLimit}
                </span>
              )}
            </button>
          )}
        </div>
        {currentPlan && currentPlan.photoLimit !== -1 && (
          <div className="sm:hidden max-w-3xl mx-auto px-4 pb-2">
            <button
              onClick={() => setShowPlans(true)}
              className="w-full flex items-center justify-between text-[11px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full"
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> {currentPlan.name}
              </span>
              <span>
                {Math.max(0, currentPlan.photoLimit - planState.photosUsed)} / {currentPlan.photoLimit} photos left
              </span>
            </button>
          </div>
        )}
      </header>

      {/* Chat area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              {m.role === "ai" && (
                <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center mr-2 shrink-0 mt-0.5">
                  <Leaf className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm border ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground border-primary-deep rounded-br-md"
                    : "bg-card text-secondary border-primary/10 rounded-bl-md"
                }`}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt="Uploaded crop or soil"
                    className="rounded-xl mb-2 max-h-60 w-full object-cover border border-white/30"
                  />
                )}
                {m.text && (
                  <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start animate-fade-in">
              <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center mr-2 shrink-0">
                <Leaf className="size-4" />
              </div>
              <div className="bg-card border border-primary/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 shadow-sm">
                <Loader2 className="size-4 text-primary animate-spin" />
                <span className="text-sm font-medium text-secondary/70">AI is checking…</span>
              </div>
            </div>
          )}

          {messages.length <= 1 && (
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-secondary/50 mb-2 px-1">
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs sm:text-sm font-semibold bg-card border border-primary/15 hover:border-primary hover:bg-primary/5 text-secondary px-3 py-2 rounded-full transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-primary/10 bg-card/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          {pendingImage && (
            <div className="mb-3 inline-flex items-center gap-3 bg-muted rounded-xl p-2 pr-3 border border-primary/15">
              <img
                src={pendingImage.url}
                alt="Selected"
                className="size-12 rounded-lg object-cover"
              />
              <span className="text-xs font-semibold text-secondary/80 truncate max-w-[160px]">
                {pendingImage.file.name}
              </span>
              <button
                onClick={() => setPendingImage(null)}
                className="size-7 rounded-full bg-card border border-primary/15 flex items-center justify-center text-secondary/70 hover:text-destructive"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <button
              onClick={() => startCamera()}
              className="size-11 sm:size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition shrink-0"
              aria-label="Open live camera"
              title="Open camera"
            >
              <Camera className="size-5" />
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="size-11 sm:size-12 rounded-xl bg-muted text-secondary border border-primary/15 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition shrink-0"
              aria-label="Pick from gallery"
              title="Upload photo"
            >
              <ImageIcon className="size-5" />
            </button>

            <div className="flex-1 bg-muted rounded-xl border border-primary/15 focus-within:border-primary transition">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Describe the problem… (e.g. yellow spots on leaves)"
                rows={1}
                className="w-full bg-transparent resize-none px-3 py-3 text-sm font-medium text-secondary placeholder:text-secondary/40 focus:outline-none max-h-32"
              />
            </div>

            <button
              onClick={send}
              disabled={sending || (!input.trim() && !pendingImage)}
              className="size-11 sm:size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              aria-label="Send"
            >
              {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </div>
          <p className="text-[10px] text-secondary/50 font-semibold text-center mt-2">
            📷 Tap camera to scan crop / soil · Powered by Kissan AI
          </p>
        </div>
      </div>
      </>
      )}

      {/* Live camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <button
              onClick={closeCamera}
              className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Close camera"
            >
              <X className="size-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              Live Crop Scan
            </span>
            <button
              onClick={flipCamera}
              className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Switch camera"
              title="Switch camera"
            >
              <RefreshCw className="size-5" />
            </button>
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {cameraLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex items-center gap-2 text-white text-sm font-semibold bg-black/60 px-4 py-2 rounded-full">
                  <Loader2 className="size-4 animate-spin" /> Starting camera…
                </div>
              </div>
            )}
            {/* Framing guide */}
            <div className="pointer-events-none absolute inset-6 sm:inset-12 border-2 border-white/40 rounded-3xl" />
          </div>

          <div className="px-4 py-6 flex items-center justify-center gap-6 bg-black">
            <div className="size-12" />
            <button
              onClick={capturePhoto}
              disabled={cameraLoading}
              className="size-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition disabled:opacity-50"
              aria-label="Capture photo"
            >
              <span className="size-16 rounded-full border-4 border-black flex items-center justify-center">
                <Circle className="size-12 fill-black text-black" />
              </span>
            </button>
            <button
              onClick={() => {
                closeCamera();
                galleryRef.current?.click();
              }}
              className="size-12 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              aria-label="Pick from gallery"
              title="Gallery"
            >
              <ImageIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiScan;
