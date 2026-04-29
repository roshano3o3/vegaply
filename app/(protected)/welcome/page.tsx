"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";

const ROLES = [
  "Software Engineer", "Senior Software Engineer", "Frontend Engineer", "Backend Engineer",
  "Full Stack Engineer", "Data Analyst", "Data Scientist", "Data Engineer",
  "Machine Learning Engineer", "AI Engineer", "Product Manager", "Senior Product Manager",
  "Project Manager", "Program Manager", "UX Designer", "UI Designer", "Product Designer",
  "Graphic Designer", "DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer",
  "Business Analyst", "Financial Analyst", "Marketing Manager", "Sales Manager",
  "Account Executive", "Customer Success Manager", "HR Manager", "Operations Manager", "QA Engineer",
];

const LOCATIONS = [
  "Remote", "United States", "Dallas, TX", "Houston, TX", "Austin, TX",
  "San Francisco, CA", "Los Angeles, CA", "San Diego, CA", "Seattle, WA",
  "New York, NY", "Boston, MA", "Chicago, IL", "Atlanta, GA", "Miami, FL",
  "Denver, CO", "Washington, DC", "Phoenix, AZ", "Philadelphia, PA",
  "Toronto", "London, UK", "Bangalore", "Hyderabad", "Mumbai", "Singapore", "Berlin",
];

const FEATURES = [
  { icon: "⚡", title: "Early Bird", desc: "Catch jobs in the first 6 hours before everyone else", accent: "#fbbf24" },
  { icon: "🤖", title: "AI Resume Match", desc: "Every job scored against your resume in seconds", accent: "#a5b4fc" },
  { icon: "✨", title: "Auto Apply", desc: "One-click applications with tailored resumes", accent: "#34d399" },
];

const LIVE_TICKER = [
  "Senior UX Designer at Figma — 2m ago",
  "Data Analyst role at Stripe — 11m ago",
  "PM opening at OpenAI — 34m ago",
  "ML Engineer at Anthropic — 47m ago",
  "Software Engineer at Notion — 1h ago",
];

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("there");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [featureIdx, setFeatureIdx] = useState(0);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [resumeStatus, setResumeStatus] = useState<"idle" | "parsing" | "saving" | "saved" | "error">("idle");
  const [resumeFileName, setResumeFileName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, full_name")
        .eq("id", user.id)
        .single();
      setName(profile?.first_name || profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there");
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setFeatureIdx((i) => (i + 1) % FEATURES.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % LIVE_TICKER.length), 2400);
    return () => clearInterval(t);
  }, []);

  const handleFind = () => {
    if (!role.trim() || !location.trim()) return;
    localStorage.setItem("vegaply_last_role", role);
    localStorage.setItem("vegaply_last_location", location);
    router.push(`/home?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`);
  };

  const handleSkip = () => {
    const lastRole = localStorage.getItem("vegaply_last_role") || "";
    const lastLoc = localStorage.getItem("vegaply_last_location") || "";
    if (lastRole && lastLoc) {
      router.push(`/home?role=${encodeURIComponent(lastRole)}&location=${encodeURIComponent(lastLoc)}`);
    } else {
      router.push("/home");
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!file || !userId) return;
    if (file.type !== "application/pdf") {
      setResumeStatus("error");
      return;
    }
    setResumeStatus("parsing");
    setResumeFileName(file.name);

    try {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          s.onload = () => res();
          s.onerror = () => rej();
          document.head.appendChild(s);
        });
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      const ab = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => it.str).join(" ") + "\n";
      }

      if (!text.trim()) { setResumeStatus("error"); return; }

      setResumeStatus("saving");
      localStorage.setItem("applysmart_resume", text);
      localStorage.setItem("applysmart_resume_name", file.name);

      await supabase.from("resumes").insert([{
        user_id: userId, title: "Welcome Upload", file_name: file.name, resume_text: text,
      }]);

      setResumeStatus("saved");

      setTimeout(() => {
        const lastRole = localStorage.getItem("vegaply_last_role") || role || "";
        const lastLoc = localStorage.getItem("vegaply_last_location") || location || "";
        if (lastRole && lastLoc) {
          router.push(`/home?role=${encodeURIComponent(lastRole)}&location=${encodeURIComponent(lastLoc)}`);
        } else {
          router.push("/home");
        }
      }, 1200);
    } catch {
      setResumeStatus("error");
    }
  };

  const f = FEATURES[featureIdx];

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative">
      <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="lg:col-span-3 flex flex-col gap-7"
        >
          <div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#fbbf24" }}
            >
              ✨ Welcome back
            </motion.div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight"
              style={{
                background: "linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #fbbf24 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              Hey {name},
            </h1>
            <p className="text-2xl mt-3" style={{ color: "rgba(255,255,255,0.55)" }}>
              What are you looking for today?
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SearchableSelect value={role} onChange={setRole} options={ROLES} placeholder="Job role" />
              <SearchableSelect value={location} onChange={setLocation} options={LOCATIONS} placeholder="Location" />
            </div>

            <button
              onClick={handleFind}
              disabled={!role.trim() || !location.trim()}
              className="px-6 py-4 rounded-xl font-semibold text-base transition-all"
              style={{
                background: !role.trim() || !location.trim() ? "rgba(251,191,36,0.2)" : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                color: !role.trim() || !location.trim() ? "rgba(255,255,255,0.3)" : "#0a0a0c",
                cursor: !role.trim() || !location.trim() ? "not-allowed" : "pointer",
                boxShadow: !role.trim() || !location.trim() ? "none" : "0 8px 24px rgba(251,191,36,0.25)",
              }}
            >
              Find Jobs →
            </button>

            <input
              ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={resumeStatus === "parsing" || resumeStatus === "saving"}
              className="px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                background: resumeStatus === "saved" ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${resumeStatus === "saved" ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: resumeStatus === "saved" ? "#34d399" : "rgba(255,255,255,0.7)",
              }}
            >
              {resumeStatus === "idle" && <>📄 Upload Resume (recommended)</>}
              {resumeStatus === "parsing" && <>⏳ Reading {resumeFileName}...</>}
              {resumeStatus === "saving" && <>💾 Saving...</>}
              {resumeStatus === "saved" && <>✓ Resume loaded — taking you to jobs</>}
              {resumeStatus === "error" && <>❌ Upload failed — try again</>}
            </button>

            <button
              onClick={handleSkip}
              className="text-sm py-2 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
            >
              Skip for now →
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span style={{ color: "#34d399" }}>●</span>
            <span className="uppercase tracking-wider font-semibold">Live</span>
            <AnimatePresence mode="wait">
              <motion.span key={tickerIdx} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.3 }}>
                {LIVE_TICKER[tickerIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-2 hidden lg:block"
        >
          <div className="relative h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={featureIdx}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-3xl p-8 flex flex-col justify-between"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="text-7xl">{f.icon}</div>
                <div>
                  <div className="text-3xl font-bold mb-3" style={{ color: f.accent }}>{f.title}</div>
                  <div className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{f.desc}</div>
                </div>
                <div className="flex gap-2">
                  {FEATURES.map((_, i) => (
                    <div key={i} className="h-1 rounded-full transition-all duration-300"
                      style={{ width: i === featureIdx ? 32 : 8, background: i === featureIdx ? f.accent : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
