"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [envMissing, setEnvMissing] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Debug logging for Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔍 [DEBUG] Supabase Configuration:');
    console.log('🔍 - URL:', supabaseUrl);
    console.log('🔍 - URL exists:', !!supabaseUrl);
    console.log('🔍 - Anon key exists:', !!supabaseAnonKey);
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [ERROR] Missing Supabase configuration');
      if (process.env.NODE_ENV === 'development') {
        setEnvMissing(true);
      }
    }
  }, []);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/home` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const checkOnboardingAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/home"); return; }
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();
    router.push("/home");  // /home decides setup vs dashboard internally based on profile.onboarded
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError("");
    setForgotMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: "https://vegaply.com/reset-password",
    });
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotMsg("Check your email for the reset link ✓");
    }
    setForgotLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check onboarding status before redirecting
      await checkOnboardingAndRedirect();
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
          --cyan:         #fbbf24;
          --cyan-hover:   #fde68a;
          --cyan-subtle:  rgba(251,191,36,0.12);
          --cyan-glow:    rgba(251,191,36,0.20);
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-root { min-height: 100vh; display: flex; background: var(--bg-page); font-family: Inter, system-ui, sans-serif; overflow: hidden; }
        .auth-left { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 56px; background: var(--bg-page); overflow: hidden; }
        .auth-left::before { content: ''; position: absolute; top: -120px; left: -120px; width: 480px; height: 480px; background: radial-gradient(circle, var(--gold-glow) 0%, transparent 70%); pointer-events: none; animation: breathe 6s ease-in-out infinite; }
        .auth-left::after { content: ''; position: absolute; bottom: -80px; right: -60px; width: 360px; height: 360px; background: radial-gradient(circle, var(--cyan-glow) 0%, transparent 70%); pointer-events: none; animation: breathe 8s ease-in-out infinite reverse; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
        .auth-logo { font-family: Inter, system-ui, sans-serif; font-size: 28px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.5px; position: relative; z-index: 1; }
        .auth-logo span { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-hero { position: relative; z-index: 1; }
        .auth-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: var(--gold-subtle); border: 1px solid rgba(245,158,11,.22); border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--gold); letter-spacing: 0.5px; margin-bottom: 28px; }
        .auth-eyebrow::before { content: ''; width: 6px; height: 6px; background: var(--gold); border-radius: 50%; animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        .auth-headline { font-family: Inter, system-ui, sans-serif; font-size: clamp(42px, 4vw, 62px); font-weight: 700; color: var(--text-primary); line-height: 1.05; letter-spacing: -0.04em; margin-bottom: 20px; }
        .auth-headline em { font-style: italic; font-family: Inter, system-ui, sans-serif; background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .auth-sub { font-size: 16px; color: var(--text-secondary); line-height: 1.7; font-weight: 300; max-width: 380px; margin-bottom: 48px; }
        .auth-stats { display: flex; gap: 40px; }
        .auth-stat-num { font-family: Inter, system-ui, sans-serif; font-size: 32px; font-weight: 700; color: var(--text-primary); line-height: 1; margin-bottom: 4px; }
        .auth-stat-label { font-size: 12px; color: var(--text-tertiary); font-weight: 400; letter-spacing: 0.3px; }
        .auth-ticker { position: relative; z-index: 1; }
        .ticker-title { font-size: 11px; color: var(--text-tertiary); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
        .ticker-cards { display: flex; flex-direction: column; gap: 10px; }
        .ticker-card { display: flex; align-items: center; gap: 12px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px 16px; animation: slideInLeft 0.6s ease forwards; opacity: 0; transform: translateX(-20px); }
        .ticker-card:nth-child(1) { animation-delay: 0.1s; }
        .ticker-card:nth-child(2) { animation-delay: 0.25s; }
        .ticker-card:nth-child(3) { animation-delay: 0.4s; }
        @keyframes slideInLeft { to { opacity: 1; transform: translateX(0); } }
        .ticker-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ticker-dot.green { background: var(--cyan); box-shadow: 0 0 8px var(--cyan-glow); }
        .ticker-dot.blue { background: var(--gold); box-shadow: 0 0 8px var(--gold-glow); }
        .ticker-dot.pink { background: var(--gold-hover); box-shadow: 0 0 8px var(--gold-glow); }
        .ticker-text { font-size: 13px; color: var(--text-secondary); flex: 1; }
        .ticker-time { font-size: 11px; color: var(--text-tertiary); }
        .auth-right { width: 480px; flex-shrink: 0; background: var(--bg-surface); border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: center; padding: 64px 48px; position: relative; }
        .auth-right::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--gold-glow), transparent); }
        .form-tag { font-size: 11px; font-weight: 500; color: var(--gold); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
        .form-title { font-family: Inter, system-ui, sans-serif; font-size: 34px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; margin-bottom: 8px; line-height: 1.1; }
        .form-subtitle { font-size: 14px; color: var(--text-tertiary); margin-bottom: 40px; font-weight: 300; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; }
        .form-input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 18px; font-size: 15px; font-family: Inter, system-ui, sans-serif; font-weight: 300; color: var(--text-primary); outline: none; transition: all 0.2s; }
        .form-input::placeholder { color: var(--text-tertiary); }
        .form-input:focus { border-color: var(--gold); background: var(--bg-input); box-shadow: 0 0 0 3px var(--gold-subtle); }
        .form-error { background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: var(--error); margin-bottom: 20px; }
        .form-btn { width: 100%; background: var(--gold); color: #1a1a1f; border: none; border-radius: var(--radius-md); padding: 15px; font-size: 15px; font-weight: 600; font-family: Inter, system-ui, sans-serif; cursor: pointer; position: relative; overflow: hidden; transition: all var(--dur-base) var(--ease-out); margin-top: 8px; letter-spacing: 0.3px; }
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
        .google-btn { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 500; font-family: Inter, system-ui, sans-serif; color: rgba(255,255,255,0.85); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; }
        .google-btn:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.22); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .google-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .or-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .or-divider span { font-size: 12px; color: rgba(255,255,255,0.25); font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }
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
          <div className="auth-ticker">
            <div className="ticker-title">Live Activity</div>
            <div className="ticker-cards">
              <div className="ticker-card"><div className="ticker-dot green"/><div className="ticker-text">Senior UX Designer posted at Figma</div><div className="ticker-time">2m ago</div></div>
              <div className="ticker-card"><div className="ticker-dot blue"/><div className="ticker-text">Data Analyst role at Stripe — 0 applicants</div><div className="ticker-time">11m ago</div></div>
              <div className="ticker-card"><div className="ticker-dot pink"/><div className="ticker-text">PM opening at OpenAI, remote</div><div className="ticker-time">34m ago</div></div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          {envMissing && process.env.NODE_ENV === 'development' && (
            <div style={{background:'var(--error-bg)',border:'1px solid var(--error-border)',borderRadius:'12px',padding:'16px',marginBottom:'24px',fontSize:'13px',color:'var(--error)',lineHeight:'1.5'}}>
              <strong>⚠️ Development Debug:</strong><br />
              Missing Supabase environment variables:<br />
              • NEXT_PUBLIC_SUPABASE_URL<br />
              • NEXT_PUBLIC_SUPABASE_ANON_KEY<br />
              Check your .env.local file.
            </div>
          )}
          {forgotMode ? (
            <div className="form-enter">
              <div className="form-tag">Account recovery</div>
              <h2 className="form-title">Reset your password</h2>
              <p className="form-subtitle">Enter your email and we&apos;ll send you a reset link</p>
              {forgotError && <div className="form-error">⚠ {forgotError}</div>}
              {forgotMsg && <div style={{background:"var(--success-bg)",border:"1px solid var(--success-border)",borderRadius:10,padding:"12px 16px",fontSize:13,color:"var(--success)",marginBottom:20}}>{forgotMsg}</div>}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleForgotPassword()}/>
              </div>
              <button className="form-btn" onClick={handleForgotPassword} disabled={forgotLoading||!!forgotMsg}>
                {forgotLoading ? <span className="form-loading"><span className="form-spinner"/> Sending…</span> : "Send Reset Link →"}
              </button>
              <div className="form-footer"><span onClick={()=>{setForgotMode(false);setForgotMsg("");setForgotError("");}} style={{color:"var(--gold)",cursor:"pointer"}}>← Back to login</span></div>
            </div>
          ) : (
            <div className="form-enter">
              <div className="form-tag">Welcome back</div>
              <h2 className="form-title">Sign in</h2>
              <p className="form-subtitle">Your next opportunity is waiting.</p>
              {error && <div className="form-error">⚠ {error}</div>}
              <button className="google-btn" onClick={handleGoogleAuth} disabled={googleLoading}>
                {googleLoading ? <><span className="form-spinner"/> Redirecting…</> : <><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>Continue with Google</>}
              </button>
              <div className="or-divider"><span>or</span></div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}/>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input className="form-input" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={{ paddingRight: 44 }}/>
                  <button type="button" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, display: "flex", alignItems: "center" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{textAlign:"right",marginTop:6}}>
                  <span onClick={()=>setForgotMode(true)} style={{fontSize:12,color:"rgba(255,255,255,0.3)",cursor:"pointer"}} onMouseEnter={e=>(e.currentTarget.style.color="#fbbf24")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>Forgot password?</span>
                </div>
              </div>
              <button className="form-btn" onClick={handleLogin} disabled={loading}>
                {loading ? <span className="form-loading"><span className="form-spinner"/> Signing in…</span> : "Sign In →"}
              </button>
              <div className="form-footer">Don&apos;t have an account? <a href="/signup">Create one free</a></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


