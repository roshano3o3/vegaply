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
  background: "#1c1c22", border: "1px solid #2a2a32", borderRadius: 10,
  padding: "10px 14px", color: "#f5f5f7", fontSize: 14,
  fontFamily: "Inter, sans-serif", outline: "none",
  width: "100%", boxSizing: "border-box"
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, color: "#a1a1aa", fontFamily: "Inter, sans-serif", marginBottom: 6
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0a0a0c", color: "#a1a1aa", fontFamily: "Inter, sans-serif" }}>
      Loading profile...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", padding: "48px 24px" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#141418", border: `1px solid ${toast.ok ? "#10b981" : "#ef4444"}`,
          borderRadius: 10, padding: "12px 20px",
          color: "#f5f5f7", fontSize: 14, fontFamily: "Inter, sans-serif"
        }}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 28,
            color: "#f5f5f7", fontWeight: 700, margin: 0 }}>
            Application Profile
          </h1>
          <p style={{ color: "#6b6b75", fontSize: 14, marginTop: 8, fontFamily: "Inter, sans-serif" }}>
            The Vegaply extension reads this to auto-fill job applications. Keep it complete.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          <ReadinessCard
            completed={completedCount}
            total={totalCount}
            pct={pct}
            missing={missing}
            isReady={isReady}
          />

          <Section title="Basic Info">
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
              hint="Used for job matching and assisted apply."
            />
          </Section>

          <Section title="Work Authorization">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Authorization Status</label>
              <select
                value={profile.work_authorization}
                onChange={e => set("work_authorization", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {WORK_AUTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <Toggle label="Authorized to work in the US?" hint="Default answer for this application question" value={profile.authorized_to_work} onChange={v => set("authorized_to_work", v)} />
            <Toggle label="Require visa sponsorship?" hint="Most F-1/OPT students: Yes" value={profile.requires_sponsorship} onChange={v => set("requires_sponsorship", v)} />
            <Toggle label="Willing to relocate?" value={profile.willing_to_relocate} onChange={v => set("willing_to_relocate", v)} />
          </Section>

          <Section title="Cover Letter Intro">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={labelStyle}>Default opening paragraph</label>
              <textarea
                value={profile.cover_letter_intro}
                placeholder="I'm a software engineer with 2 years of experience..."
                onChange={e => set("cover_letter_intro", e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <span style={{ fontSize: 12, color: "#6b6b75", marginTop: 6 }}>
                AI personalizes the rest based on each job.
              </span>
            </div>
          </Section>

          <Section title="Resume">
            {hasResume ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
                <div>
                  <div style={{ fontSize: 14, color: "#f5f5f7", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                    Resume on file
                  </div>
                  {resumeDisplayName && (
                    <div style={{ fontSize: 12, color: "#6b6b75", marginTop: 3, fontFamily: "Inter, sans-serif" }}>
                      {resumeDisplayName}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, color: "#a1a1aa", fontFamily: "Inter, sans-serif" }}>
                  No resume on file
                </div>
                <div style={{ fontSize: 12, color: "#6b6b75", marginTop: 6, fontFamily: "Inter, sans-serif" }}>
                  Upload your resume from the main dashboard so Vegaply can generate tailored applications.
                </div>
                <a
                  href="/home"
                  style={{
                    display: "inline-block", marginTop: 10,
                    fontSize: 13, color: "#f59e0b", fontFamily: "Inter, sans-serif",
                    textDecoration: "none", fontWeight: 500
                  }}
                >
                  Upload Resume →
                </a>
              </div>
            )}
          </Section>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#2a2a32" : "#f59e0b",
              color: saving ? "#6b6b75" : "#0a0a0c",
              border: "none", borderRadius: 10,
              padding: "14px 28px", fontSize: 15,
              fontFamily: "Sora, sans-serif", fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background 200ms"
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadinessCard({ completed, total, pct, missing, isReady }: {
  completed: number; total: number; pct: number; missing: string[]; isReady: boolean;
}) {
  const barColor = isReady ? "#10b981" : pct >= 60 ? "#f59e0b" : "#6b6b75";
  return (
    <div style={{
      background: "#141418", border: `1px solid ${isReady ? "#10b98130" : "#1c1c22"}`,
      borderRadius: 14, padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 16,
            color: "#f5f5f7", fontWeight: 600, margin: 0 }}>
            Application Profile Readiness
          </h2>
          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#a1a1aa", fontFamily: "Inter, sans-serif" }}>
              {completed} / {total} complete
            </span>
            <span style={{ fontSize: 12, color: barColor, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
              {pct}%
            </span>
          </div>
        </div>
        {isReady && (
          <span style={{ fontSize: 12, color: "#10b981", fontFamily: "Inter, sans-serif",
            fontWeight: 600, background: "#10b98115", padding: "4px 10px", borderRadius: 20 }}>
            ✓ Ready
          </span>
        )}
      </div>

      <div style={{ height: 6, borderRadius: 3, background: "#2a2a32", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${pct}%`,
          background: barColor,
          transition: "width 300ms ease, background 300ms ease"
        }} />
      </div>

      <div style={{ marginTop: 14 }}>
        {isReady ? (
          <p style={{ fontSize: 13, color: "#10b981", fontFamily: "Inter, sans-serif", margin: 0 }}>
            Ready for assisted apply checks.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#6b6b75", fontFamily: "Inter, sans-serif", margin: "0 0 10px" }}>
              Complete these fields to improve assisted apply readiness.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {missing.map(label => (
                <span key={label} style={{
                  fontSize: 12, color: "#a1a1aa", fontFamily: "Inter, sans-serif",
                  background: "#1c1c22", border: "1px solid #2a2a32",
                  borderRadius: 6, padding: "3px 9px"
                }}>
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#141418", border: "1px solid #1c1c22",
      borderRadius: 14, padding: 24,
      display: "flex", flexDirection: "column", gap: 16
    }}>
      <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 16,
        color: "#f5f5f7", fontWeight: 600, margin: 0 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

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
        style={inputStyle}
      />
      {hint && <span style={{ fontSize: 12, color: "#6b6b75", marginTop: 6, fontFamily: "Inter, sans-serif" }}>{hint}</span>}
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "#1c1c22", border: "1px solid #2a2a32", borderRadius: 10, padding: "12px 16px" }}>
      <div>
        <div style={{ fontSize: 14, color: "#f5f5f7", fontFamily: "Inter, sans-serif" }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "#6b6b75", marginTop: 2 }}>{hint}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: value ? "#f59e0b" : "#2a2a32",
        position: "relative", transition: "background 200ms", flexShrink: 0
      }}>
        <div style={{
          position: "absolute", top: 3,
          left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: "#f5f5f7", transition: "left 200ms"
        }} />
      </div>
    </div>
  );
}
