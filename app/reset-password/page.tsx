"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleReset = async () => {
    setError("");
    if (!password || !confirm) { setError("Please fill in both fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/home");
    }
  };

  return (
    <>
      <style>{`
        :root {
          --bg-page:      #0a0a0c;
          --bg-surface:   #141418;
          --bg-elevated:  #1c1c22;
          --bg-input:     #1a1a1f;
          --bg-hover:     rgba(255,255,255,0.03);
          --text-primary:   #f5f5f7;
          --text-secondary: #a1a1aa;
          --text-tertiary:  #6b6b75;
          --border-subtle: rgba(255,255,255,0.06);
          --border-normal: rgba(255,255,255,0.10);
          --border-strong: rgba(255,255,255,0.18);
          --gold:         #f59e0b;
          --gold-hover:   #fbbf24;
          --gold-subtle:  rgba(245,158,11,0.12);
          --gold-glow:    rgba(245,158,11,0.25);
          --cyan:         #06b6d4;
          --cyan-hover:   #22d3ee;
          --cyan-subtle:  rgba(6,182,212,0.12);
          --cyan-glow:    rgba(6,182,212,0.25);
          --success: #10b981;
          --warning: #fbbf24;
          --danger:  #ef4444;
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
          --shadow-glow-gold: 0 0 24px rgba(245,158,11,0.20);
          --shadow-glow-cyan: 0 0 24px rgba(6,182,212,0.20);
          --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
          --dur-fast: 120ms;
          --dur-base: 200ms;
          --dur-slow: 400ms;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-root { min-height: 100vh; display: flex; background: var(--bg-page); font-family: 'DM Sans', sans-serif; overflow: hidden; }
        .auth-left { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 56px; background: var(--bg-page); overflow: hidden; }
        .auth-left::before { content: ''; position: absolute; top: -120px; left: -120px; width: 480px; height: 480px; background: radial-gradient(circle,var(--gold-glow),transparent 70%); pointer-events: none; animation: breathe 6s ease-in-out infinite; }
        .auth-left::after { content: ''; position: absolute; bottom: -80px; right: -60px; width: 360px; height: 360px; background: radial-gradient(circle,var(--cyan-glow),transparent 70%); pointer-events: none; animation: breathe 8s ease-in-out infinite reverse; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
        .auth-logo { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.5px; position: relative; z-index: 1; }
        .auth-logo span { background: linear-gradient(135deg,var(--gold),var(--cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-hero { position: relative; z-index: 1; }
        .auth-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: var(--gold-subtle); border: 1px solid rgba(245,158,11,.22); border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--gold); letter-spacing: 0.5px; margin-bottom: 28px; }
        .auth-eyebrow::before { content: ''; width: 6px; height: 6px; background: var(--gold); border-radius: 50%; animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        .auth-headline { font-family: 'Playfair Display', serif; font-size: clamp(42px, 4vw, 62px); font-weight: 900; color: var(--text-primary); line-height: 1.05; letter-spacing: -1.5px; margin-bottom: 20px; }
        .auth-headline em { font-style: italic; background: linear-gradient(135deg,var(--gold) 0%,var(--gold-hover) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-sub { font-size: 16px; color: var(--text-secondary); line-height: 1.7; font-weight: 300; max-width: 380px; margin-bottom: 48px; }
        .auth-stats { display: flex; gap: 40px; }
        .auth-stat-num { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: var(--text-primary); line-height: 1; margin-bottom: 4px; }
        .auth-stat-label { font-size: 12px; color: var(--text-tertiary); font-weight: 400; letter-spacing: 0.3px; }
        .auth-right { width: 480px; flex-shrink: 0; background: var(--bg-surface); border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: center; padding: 64px 48px; position: relative; }
        .auth-right::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--gold-glow), transparent); }
        .form-tag { font-size: 11px; font-weight: 500; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
        .form-title { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1.1; }
        .form-subtitle { font-size: 14px; color: var(--text-tertiary); margin-bottom: 40px; font-weight: 300; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
        .form-input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 18px; font-size: 15px; font-family: 'DM Sans', sans-serif; font-weight: 300; color: var(--text-primary); outline: none; transition: all 0.2s; }
        .form-input::placeholder { color: var(--text-tertiary); }
        .form-input:focus { border-color: var(--gold); background: var(--bg-input); box-shadow: 0 0 0 3px var(--gold-subtle); }
        .form-error { background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: var(--error); margin-bottom: 20px; }
        .form-btn { width: 100%; background: var(--gold); color: #1a1a1f; border: none; border-radius: var(--radius-md); padding: 15px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all var(--dur-base) var(--ease-out); margin-top: 8px; letter-spacing: 0.3px; }
        .form-btn:hover { background: var(--gold-hover); box-shadow: var(--shadow-glow-gold); transform: translateY(-1px); }
        .form-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .form-loading { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .form-spinner { width: 16px; height: 16px; border: 2px solid var(--text-tertiary); border-top-color: var(--text-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-footer { text-align: center; font-size: 14px; color: var(--text-tertiary); margin-top: 28px; font-weight: 300; }
        .form-footer a { color: var(--gold); text-decoration: none; font-weight: 500; }
        .form-footer a:hover { color: var(--gold-hover); }
        .form-enter { animation: formFadeIn 0.5s ease forwards; }
        @keyframes formFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) { .auth-left { display: none; } .auth-right { width: 100%; border-left: none; padding: 48px 32px; } }
      `}</style>

      <div className="auth-root">
        <div className="auth-left">
          <div className="auth-logo">Vega<span>ply</span></div>
          <div className="auth-hero">
            <div className="auth-eyebrow">AI-Powered Job Search</div>
            <h1 className="auth-headline">Land your<br />dream job <em>faster</em><br />than anyone else.</h1>
            <p className="auth-sub">Vegaply finds freshly posted roles before the crowd arrives — then tailors your resume, preps your interview, and tracks every application automatically.</p>
            <div className="auth-stats">
              <div><div className="auth-stat-num">⚡ 6h</div><div className="auth-stat-label">Early bird advantage</div></div>
              <div><div className="auth-stat-num">3×</div><div className="auth-stat-label">More interviews</div></div>
              <div><div className="auth-stat-num">AI</div><div className="auth-stat-label">Resume matching</div></div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <div className="form-enter">
            <div className="form-tag">Account security</div>
            <h2 className="form-title">Set new password</h2>
            <p className="form-subtitle">Choose a strong password for your account.</p>
            {error && <div className="form-error">⚠ {error}</div>}
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type={showNewPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReset()} style={{ paddingRight: 44 }}/>
                <button type="button" onClick={() => setShowNewPassword(p => !p)} aria-label={showNewPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, display: "flex", alignItems: "center" }}>
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input className="form-input" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReset()} style={{ paddingRight: 44 }}/>
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, display: "flex", alignItems: "center" }}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="form-btn" onClick={handleReset} disabled={loading}>
              {loading ? <span className="form-loading"><span className="form-spinner"/> Updating…</span> : "Update Password →"}
            </button>
            <div className="form-footer"><a href="/login">← Back to login</a></div>
          </div>
        </div>
      </div>
    </>
  );
}
