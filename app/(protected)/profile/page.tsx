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
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  color: "var(--text-primary)",
  fontSize: 14,
  fontFamily: "var(--font-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  fontFamily: "var(--font-primary)",
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
        if (!profileData?.resume_text && resumeRow.resume_text) {
          setResumeText(resumeRow.resume_text);
          // Backfill profiles.resume_text so the daily queue can find it
          supabase.from("profiles").upsert({ id: user.id, resume_text: resumeRow.resume_text }, { onConflict: "id" });
        }
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
      showToast("Something went wrong — please try again", false);
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
      showToast("Profile saved — changes apply to your next daily queue", true);
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
      minHeight: "calc(100vh - 56px)", gap: 14,
    }}>
      <div style={{ width: 20, height: 20, border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-primary)" }}>
        Loading your profile…
      </span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "28px 24px 80px" }}>
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
          background: "var(--bg-card)",
          border: `1px solid ${toast.ok ? "var(--success-border)" : "var(--error-border)"}`,
          borderRadius: 12, padding: "12px 20px",
          color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-primary)",
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
            fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800,
            letterSpacing: "-0.6px", color: "var(--text-primary)", margin: "0 0 10px",
          }}>
            Application Readiness Center
          </h1>
          <p style={{
            color: "var(--text-muted)", fontSize: 14, margin: "0 0 14px",
            fontFamily: "var(--font-primary)", lineHeight: 1.65,
          }}>
            Complete your profile so Vegaply can prepare accurate daily application packs.
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 12px", borderRadius: 100,
            fontFamily: "var(--font-primary)", fontSize: 11, fontWeight: 600,
            background: "var(--primary-subtle)",
            border: "1px solid var(--gold-border)",
            color: "var(--primary)",
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
            <Field label="LinkedIn URL *" value={profile.linkedin_url} onChange={v => set("linkedin_url", v)} placeholder="https://linkedin.com/in/yourname" />
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
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, fontFamily: "var(--font-primary)" }}>
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
                background: "var(--success-bg)",
                border: "1px solid var(--success-border)",
                borderRadius: 12,
              }}>
                <div style={{
                  width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(16,185,129,0.12)", border: "1px solid var(--success-border)",
                  borderRadius: 10, flexShrink: 0, fontSize: 18,
                }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-primary)", fontWeight: 600, marginBottom: 3 }}>
                    Resume on file
                  </div>
                  {resumeDisplayName && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, fontFamily: "var(--font-primary)" }}>
                      {resumeDisplayName}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--success)", fontFamily: "var(--font-primary)", opacity: 0.80 }}>
                    Used for AI tailoring and application packs.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "20px 20px",
                background: "var(--gold-bg)",
                border: "1px solid var(--gold-border)",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", fontFamily: "var(--font-primary)", fontWeight: 600, marginBottom: 6 }}>
                  No resume on file
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, fontFamily: "var(--font-primary)", lineHeight: 1.6 }}>
                  Upload your resume from the dashboard — look for the Resume panel on the right sidebar.
                </div>
                <a
                  href="/home"
                  className="upload-cta"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "8px 18px", borderRadius: 8,
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    color: "var(--primary)", fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 600,
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
              background: saving ? "var(--surface-hover)" : "var(--grad-1)",
              color: saving ? "var(--text-muted)" : "#0a0a0c",
              border: "none", borderRadius: 12,
              padding: "14px 32px", fontSize: 15,
              fontFamily: "var(--font-display)", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 200ms ease",
              boxShadow: saving ? "none" : "var(--shadow-amber)",
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
  const barColor = isReady ? "var(--success)" : pct >= 60 ? "var(--primary)" : "#6b7280";
  const barGrad  = isReady
    ? "linear-gradient(90deg, var(--success), #34d399)"
    : pct >= 60
    ? "linear-gradient(90deg, var(--primary), var(--primary-light))"
    : "linear-gradient(90deg, #52525b, #71717a)";

  return (
    <div style={{
      background: isReady
        ? "linear-gradient(145deg, rgba(16,185,129,0.07), rgba(52,211,153,0.04))"
        : `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-card-end) 100%)`,
      border: `1px solid ${isReady ? "var(--success-border)" : "var(--border)"}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: isReady ? "0 4px 32px rgba(16,185,129,0.09)" : "var(--shadow-card)",
      animation: "cardFadeUp 500ms ease both",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--text-primary)", fontWeight: 700, margin: "0 0 6px" }}>
            Application Readiness
          </h2>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-primary)" }}>
            {completed} of {total} fields complete
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800,
            color: barColor, lineHeight: 1, letterSpacing: "-2px",
          }}>
            {pct}
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}>%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 99, background: "var(--border-subtle)", overflow: "hidden", marginBottom: 16 }}>
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
            background: "rgba(16,185,129,0.15)", border: "1px solid var(--success-border)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
          }}>✓</div>
          <p style={{ fontSize: 13, color: "var(--success)", fontFamily: "var(--font-primary)", margin: 0, fontWeight: 500 }}>
            Profile complete — Vegaply can now build your daily packs.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-primary)", margin: "0 0 12px" }}>
            Complete these fields to unlock your daily packs.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {missing.map(label => (
              <span key={label} style={{
                fontSize: 11, fontWeight: 600, color: "var(--primary)",
                fontFamily: "var(--font-primary)",
                background: "var(--gold-bg)",
                border: "1px solid var(--gold-border)",
                borderRadius: "var(--radius-sm)", padding: "3px 10px",
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
      background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-card-end) 100%)`,
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
      boxShadow: "var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.03)",
      animation: "cardFadeUp 500ms ease both",
      animationDelay: `${delay * 55}ms`,
    }}>
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: 15,
        color: "var(--text-primary)", fontWeight: 700, margin: 0,
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
          fontSize: 11, color: "var(--text-tertiary)", marginTop: 5,
          fontFamily: "var(--font-primary)", lineHeight: 1.5,
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
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: "13px 16px",
    }}>
      <div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-primary)", fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-primary)" }}>{hint}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: "pointer",
          background: value ? "var(--primary)" : "rgba(255,255,255,0.10)",
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
