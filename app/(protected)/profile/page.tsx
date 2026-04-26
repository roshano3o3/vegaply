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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("application_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({ ...EMPTY, ...data, years_experience: data.years_experience ?? "" });
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
    setSaving(false);
    if (error) { console.error(error); showToast("Save failed — check console", false); }
    else showToast("Profile saved", true);
  };

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

function Field({ label, value, onChange, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
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
