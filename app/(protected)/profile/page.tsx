"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const WORK_AUTH_OPTIONS = [
  "US Citizen", "Green Card", "F1-OPT", "F1-CPT", "H1B", "Other"
];

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  work_authorization: string;
  requires_sponsorship: boolean;
  willing_to_relocate: boolean;
  authorized_to_work: boolean;
  years_experience: string;
  cover_letter_intro: string;
}

const EMPTY: Profile = {
  first_name: "", last_name: "", phone: "", linkedin_url: "",
  github_url: "", portfolio_url: "", work_authorization: "F1-OPT",
  requires_sponsorship: true, willing_to_relocate: false,
  authorized_to_work: true, years_experience: "", cover_letter_intro: ""
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#f5f5f7",
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "rgba(255,255,255,0.45)",
  fontFamily: "Inter, sans-serif",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [location, setLocation] = useState("");
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: appProfile }, { data: profileData }, { data: resumeRow }] = await Promise.all([
        supabase.from("application_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("location, resume_text").eq("id", user.id).maybeSingle(),
        supabase.from("resumes").select("file_name, resume_text").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (appProfile) setProfile({ ...EMPTY, ...appProfile, years_experience: appProfile.years_experience ?? "" });
      if (profileData) {
        setLocation(profileData.location ?? "");
        setResumeText(profileData.resume_text ?? null);
      }
      if (resumeRow) {
        setResumeFileName(resumeRow.file_name ?? null);
        if (!profileData?.resume_text && resumeRow.resume_text) setResumeText(resumeRow.resume_text);
      }

      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key: keyof Profile, val: string | boolean) =>
    setProfile(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("application_profiles")
      .upsert({
        ...profile,
        user_id: user.id,
        years_experience: profile.years_experience === "" ? null : Number(profile.years_experience),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (error) {
      setSaving(false);
      console.error(error);
      showToast("Save failed — check console", false);
      return;
    }

    const { error: locError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, location, onboarded: true }, { onConflict: "id" });

    setSaving(false);
    if (locError) {
      console.error(locError);
      showToast("Profile saved but location failed to save", false);
    } else {
      showToast("Profile saved", true);
    }
  };

  const hasResume = !!resumeText || !!resumeFileName;
  const resumeDisplayName = resumeFileName ?? (resumeText ? "Resume text saved" : null);

  const readinessChecks = [
    { label: "First name",         done: profile.first_name.trim() !== "" },
    { label: "Last name",          done: profile.last_name.trim() !== "" },
    { label: "Phone",              done: profile.phone.trim() !== "" },
    { label: "LinkedIn URL",       done: profile.linkedin_url.trim() !== "" },
    { label: "Location",           done: location.trim() !== "" },
    { label: "Work authorization", done: profile.work_authorization !== "" },
    { label: "Work eligibility",   done: true },
    { label: "Sponsorship status", done: true },
    { label: "Resume on file",     done: hasResume },
  ];
  const completedCount = readinessChecks.filter(c => c.done).length;
  const totalCount = readinessChecks.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const missing = readinessChecks.filter(c => !c.done).map(c => c.label);
  const isReady = missing.length === 0;

  if (loading) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0a0a0c", gap: 14,
    }}>
      <div style={{ width: 20, height: 20, border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.32)", fontFamily: "Inter, sans-serif" }}>
        Loading your profile…
      </span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", padding: "48px 24px 80px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .prof-input:focus {
          border-color: rgba(245,158,11,0.45) !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.08) !important;
        }
        .prof-select:focus {
          border-color: rgba(245,158,11,0.45) !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.08) !important;
          outline: none;
        }
        .save-btn:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(245,158,11,0.30) !important;
          transform: translateY(-1px);
        }
        .save-btn:active:not(:disabled) { transform: translateY(0); }
        .upload-cta:hover { background: rgba(245,158,11,0.22) !important; }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#141418",
          border: `1px solid ${toast.ok ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"}`,
          borderRadius: 12, padding: "12px 20px",
          color: "#f5f5f7", fontSize: 14, fontFamily: "Inter, sans-serif",
          boxShadow: `0 4px 24px ${toast.ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"}`,
          animation: "cardFadeUp 250ms ease both",
        }}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 36, animation: "pageFadeIn 500ms ease both" }}>
          <h1 style={{
            fontFamily: "Sora, sans-serif", fontSize: 30, fontWeight: 800,
            letterSpacing: "-0.6px", color: "#f5f5f7", margin: "0 0 10px",
          }}>
            Application Readiness Center
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.40)", fontSize: 14, margin: "0 0 14px",
            fontFamily: "Inter, sans-serif", lineHeight: 1.65,
          }}>
            Complete your profile so Vegaply can prepare accurate daily application packs.
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 12px", borderRadius: 100,
            fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.26)",
            color: "#f59e0b",
          }}>
            Free users receive 5 daily packs · Pro users receive 20
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Readiness card ─────────────────────────────────────── */}
          <ReadinessCard
            completed={completedCount}
            total={totalCount}
            pct={pct}
            missing={missing}
            isReady={isReady}
          />

          {/* ── Basic Info ─────────────────────────────────────────── */}
          <Section title="Basic Info" icon="👤" delay={1}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="First Name" value={profile.first_name} onChange={v => set("first_name", v)} placeholder="Roshan" />
              <Field label="Last Name" value={profile.last_name} onChange={v => set("last_name", v)} placeholder="Pellati" />
            </div>
            <Field label="Phone" value={profile.phone} onChange={v => set("phone", v)} placeholder="+1 (713) 555-0000" type="tel" />
            <Field label="LinkedIn URL" value={profile.linkedin_url} onChange={v => set("linkedin_url", v)} placeholder="https://linkedin.com/in/yourname" />
            <Field label="GitHub URL (optional)" value={profile.github_url} onChange={v => set("github_url", v)} placeholder="https://github.com/yourname" />
            <Field label="Portfolio URL (optional)" value={profile.portfolio_url} onChange={v => set("portfolio_url", v)} placeholder="https://yoursite.com" />
            <Field label="Years of Experience" value={profile.years_experience} onChange={v => set("years_experience", v)} placeholder="2" type="number" />
            <Field
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="New York, NY"
              hint="Used for matching jobs and preparing application packs."
            />
          </Section>

          {/* ── Work Authorization ─────────────────────────────────── */}
          <Section title="Work Authorization" icon="🌐" delay={2}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Authorization Status</label>
              <select
                value={profile.work_authorization}
                onChange={e => set("work_authorization", e.target.value)}
                className="prof-select"
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {WORK_AUTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <Toggle label="Authorized to work in the US?" hint="Default answer for this application question" value={profile.authorized_to_work} onChange={v => set("authorized_to_work", v)} />
            <Toggle label="Require visa sponsorship?" hint="Most F-1/OPT students: Yes" value={profile.requires_sponsorship} onChange={v => set("requires_sponsorship", v)} />
            <Toggle label="Willing to relocate?" value={profile.willing_to_relocate} onChange={v => set("willing_to_relocate", v)} />
          </Section>

          {/* ── Cover Letter Intro ─────────────────────────────────── */}
          <Section title="Cover Letter Intro" icon="✍️" delay={3}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Default opening paragraph</label>
              <textarea
                value={profile.cover_letter_intro}
                placeholder="I'm a software engineer with 2 years of experience..."
                onChange={e => set("cover_letter_intro", e.target.value)}
                rows={4}
                className="prof-input"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 6, fontFamily: "Inter, sans-serif" }}>
                AI personalizes the rest based on each job.
              </span>
            </div>
          </Section>

          {/* ── Resume ─────────────────────────────────────────────── */}
          <Section title="Resume" icon="📄" delay={4}>
            {hasResume ? (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "16px 18px",
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.24)",
                borderRadius: 12,
              }}>
                <div style={{
                  width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(16,185,129,0.13)", border: "1px solid rgba(16,185,129,0.28)",
                  borderRadius: 10, flexShrink: 0, fontSize: 18,
                }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, color: "#f5f5f7", fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: 3 }}>
                    Resume on file
                  </div>
                  {resumeDisplayName && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 4, fontFamily: "Inter, sans-serif" }}>
                      {resumeDisplayName}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "rgba(16,185,129,0.70)", fontFamily: "Inter, sans-serif" }}>
                    Used for AI tailoring and application packs.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "20px 20px",
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.18)",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 14, color: "#a1a1aa", fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: 6 }}>
                  No resume on file
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 14, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
                  Upload your resume from the dashboard to unlock daily packs.
                </div>
                <a
                  href="/home"
                  className="upload-cta"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "8px 18px", borderRadius: 8,
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    color: "#f59e0b", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                    textDecoration: "none", transition: "background 150ms ease",
                  }}
                >
                  Upload Resume →
                </a>
              </div>
            )}
          </Section>

          {/* ── Save ───────────────────────────────────────────────── */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="save-btn"
            style={{
              background: saving ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#f59e0b,#fbbf24)",
              color: saving ? "rgba(255,255,255,0.28)" : "#0a0a0c",
              border: "none", borderRadius: 12,
              padding: "14px 32px", fontSize: 15,
              fontFamily: "Sora, sans-serif", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 200ms ease",
              boxShadow: saving ? "none" : "0 2px 14px rgba(245,158,11,0.22)",
              letterSpacing: "-0.2px",
              alignSelf: "flex-start",
            }}
          >
            {saving ? "Saving profile…" : "Save Application Profile"}
          </button>

        </div>
      </div>
    </div>
  );
}

// ── ReadinessCard ─────────────────────────────────────────────────────────────

function ReadinessCard({ completed, total, pct, missing, isReady }: {
  completed: number; total: number; pct: number; missing: string[]; isReady: boolean;
}) {
  const barColor = isReady ? "#10b981" : pct >= 60 ? "#f59e0b" : "#6b7280";
  const barGrad  = isReady
    ? "linear-gradient(90deg,#10b981,#34d399)"
    : pct >= 60
    ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
    : "linear-gradient(90deg,#52525b,#71717a)";

  return (
    <div style={{
      background: isReady
        ? "linear-gradient(145deg,rgba(16,185,129,0.07),rgba(52,211,153,0.04))"
        : "linear-gradient(145deg,#141418,#111116)",
      border: `1px solid ${isReady ? "rgba(16,185,129,0.30)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: isReady ? "0 4px 32px rgba(16,185,129,0.09)" : "0 2px 12px rgba(0,0,0,0.40)",
      animation: "cardFadeUp 500ms ease both",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 15, color: "#f5f5f7", fontWeight: 700, margin: "0 0 6px" }}>
            Application Readiness
          </h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>
            {completed} of {total} fields complete
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "Sora, sans-serif", fontSize: 42, fontWeight: 800,
            color: barColor, lineHeight: 1, letterSpacing: "-2px",
          }}>
            {pct}
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: barGrad,
          transition: "width 500ms cubic-bezier(0.4,0,0.2,1), background 400ms ease",
          boxShadow: isReady ? "0 0 8px rgba(16,185,129,0.40)" : pct >= 60 ? "0 0 8px rgba(245,158,11,0.30)" : "none",
        }} />
      </div>

      {/* Status message + chips */}
      {isReady ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
          }}>✓</div>
          <p style={{ fontSize: 13, color: "#10b981", fontFamily: "Inter, sans-serif", margin: 0, fontWeight: 500 }}>
            Ready for assisted apply checks.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", margin: "0 0 12px" }}>
            Complete these fields to unlock better daily packs.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {missing.map(label => (
              <span key={label} style={{
                fontSize: 11, fontWeight: 600, color: "rgba(245,158,11,0.82)",
                fontFamily: "Inter, sans-serif",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.24)",
                borderRadius: 6, padding: "3px 10px",
              }}>
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children, icon, delay = 0 }: {
  title: string; children: React.ReactNode; icon?: string; delay?: number;
}) {
  return (
    <div style={{
      background: "linear-gradient(145deg,#141418 0%,#111116 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      boxShadow: "0 2px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.03)",
      animation: "cardFadeUp 500ms ease both",
      animationDelay: `${delay * 55}ms`,
    }}>
      <h2 style={{
        fontFamily: "Sora, sans-serif", fontSize: 15,
        color: "#f5f5f7", fontWeight: 700, margin: 0,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder = "", type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="prof-input"
        style={inputStyle}
      />
      {hint && (
        <span style={{
          fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 5,
          fontFamily: "Inter, sans-serif", lineHeight: 1.5,
        }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ label, value, onChange, hint }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "13px 16px",
    }}>
      <div>
        <div style={{ fontSize: 14, color: "#f5f5f7", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2, fontFamily: "Inter, sans-serif" }}>{hint}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: value ? "#f59e0b" : "rgba(255,255,255,0.10)",
          position: "relative", transition: "background 200ms ease", flexShrink: 0,
          boxShadow: value ? "0 0 10px rgba(245,158,11,0.28)" : "none",
        }}
      >
        <div style={{
          position: "absolute", top: 3,
          left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: "#f5f5f7", transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }} />
      </div>
    </div>
  );
}
