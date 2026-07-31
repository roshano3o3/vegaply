"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  useEffect(() => {
    if (!success) return;
    setCountdown(60); setCanResend(false);
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [success]);
  const handleResend = async () => {
    setResending(true); setResent(false);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (!error) { setResent(true); setCountdown(60); setCanResend(false); const timer = setInterval(() => { setCountdown(prev => { if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; } return prev - 1; }); }, 1000); }
    setResending(false);
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["", "var(--danger)", "var(--warning)", "var(--success)"][strength];

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/home` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleSignup = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Duplicate email: Supabase returns identities=[] when email already registered
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try signing in instead.");
      setLoading(false);
      return;
    }
    // No email confirmation required — session available immediately, redirect now
    if (data.session) {
      router.push("/home");
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(180deg, #1d1f2e 0%, #11121e 50%, #08090e 100%);
          font-family: Inter, system-ui, sans-serif;
          overflow: hidden;
        }

        .auth-left {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          background: linear-gradient(165deg, #1c1e2c 0%, #131520 40%, #0d0e18 100%);
          overflow: hidden;
        }
        .auth-left::before {
          content: '';
          position: absolute;
          top: -120px; left: -120px;
          width: 480px; height: 480px;
          background: radial-gradient(circle, var(--gold-glow) 0%, transparent 70%);
          pointer-events: none;
          animation: breathe 6s ease-in-out infinite;
        }
        .auth-left::after {
          content: '';
          position: absolute;
          bottom: -80px; right: -60px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, var(--gold-glow) 0%, transparent 70%);
          pointer-events: none;
          animation: breathe 8s ease-in-out infinite reverse;
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        .auth-logo {
          font-family: Inter, system-ui, sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          position: relative;
          z-index: 1;
        }
        .auth-logo span {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-hero { position: relative; z-index: 1; }

        .auth-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--gold-bg);
          border: 1px solid var(--gold-border);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--gold);
          letter-spacing: 0.5px;
          margin-bottom: 28px;
        }
        .auth-eyebrow::before {
          content: '';
          width: 6px; height: 6px;
          background: var(--gold);
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .auth-headline {
          font-family: Inter, system-ui, sans-serif;
          font-size: clamp(42px, 4vw, 62px);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.05;
          letter-spacing: -0.04em;
          margin-bottom: 20px;
        }
        .auth-headline em {
          font-style: italic;
          font-family: Inter, system-ui, sans-serif;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .auth-sub {
          font-size: 16px;
          color: var(--text-secondary);
          line-height: 1.7;
          font-weight: 300;
          max-width: 380px;
          margin-bottom: 48px;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          animation: slideInLeft 0.5s ease forwards;
          opacity: 0;
          transform: translateX(-16px);
        }
        .feature-item:nth-child(1) { animation-delay: 0.1s; }
        .feature-item:nth-child(2) { animation-delay: 0.2s; }
        .feature-item:nth-child(3) { animation-delay: 0.3s; }
        .feature-item:nth-child(4) { animation-delay: 0.4s; }
        @keyframes slideInLeft {
          to { opacity: 1; transform: translateX(0); }
        }
        .feature-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .feature-icon.indigo { background: var(--gold-bg); }
        .feature-icon.pink   { background: var(--cyan-bg); }
        .feature-icon.green  { background: var(--success-bg); }
        .feature-icon.amber  { background: var(--warning-bg); }
        .feature-name { font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
        .feature-desc { font-size: 12px; color: var(--text-tertiary); font-weight: 300; }

        /* RIGHT */
        .auth-right {
          width: 480px;
          flex-shrink: 0;
          background: linear-gradient(180deg, #13141e 0%, #0f1018 55%, #0c0d14 100%);
          border-left: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 48px;
          position: relative;
        }
        .auth-right::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold-glow), transparent);
        }

        .form-tag {
          font-size: 11px;
          font-weight: 500;
          color: var(--gold);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .form-title {
          font-family: Inter, system-ui, sans-serif;
          font-size: 34px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          margin-bottom: 8px;
          line-height: 1.1;
        }
        .form-subtitle {
          font-size: 14px;
          color: var(--text-tertiary);
          margin-bottom: 40px;
          font-weight: 300;
        }

        .form-group { margin-bottom: 20px; }
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .form-input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 15px;
          font-family: Inter, system-ui, sans-serif;
          font-weight: 300;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }
        .form-input::placeholder { color: var(--text-placeholder); }
        .form-input:focus {
          border-color: var(--gold);
          background: var(--bg-input-focus);
          box-shadow: 0 0 0 3px var(--gold-glow);
        }

        .strength-bar {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          align-items: center;
        }
        .strength-seg {
          flex: 1;
          height: 3px;
          border-radius: 3px;
          background: var(--bg-input);
          transition: background 0.3s;
        }
        .strength-text {
          font-size: 11px;
          font-weight: 500;
          margin-left: 8px;
          min-width: 40px;
          text-align: right;
          transition: color 0.3s;
        }

        .form-error {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: var(--error);
          margin-bottom: 20px;
        }

        .form-btn {
          width: 100%;
          background: var(--grad-text);
          border: none;
          border-radius: 12px;
          padding: 15px;
          font-size: 15px;
          font-weight: 600;
          font-family: Inter, system-ui, sans-serif;
          color: var(--text-primary);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s;
          margin-top: 8px;
          letter-spacing: 0.3px;
        }
        .form-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .form-btn:hover::before { opacity: 1; }
        .form-btn:hover { transform: translateY(-1px); }
        .form-btn:active { transform: translateY(0); }
        .form-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .form-loading { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .form-spinner {
          width: 16px; height: 16px;
          border: 2px solid var(--text-tertiary);
          border-top-color: var(--text-primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          text-align: center;
          font-size: 14px;
          color: var(--text-tertiary);
          margin-top: 28px;
          font-weight: 300;
        }
        .form-footer a {
          color: var(--gold);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .form-footer a:hover { color: var(--gold-light); }
        .google-btn { width: 100%; background: var(--bg-input); border: 1px solid var(--border); border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 500; font-family: Inter, system-ui, sans-serif; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; }
        .google-btn:hover { background: var(--bg-input-hover); border-color: var(--gold-border); transform: translateY(-1px); box-shadow: var(--shadow-glow-subtle); }
        .google-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .or-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .or-divider span { font-size: 12px; color: var(--text-tertiary); font-weight: 400; letter-spacing: 0.5px; text-transform: uppercase; }

        .success-box {
          text-align: center;
          padding: 16px 0;
          animation: formFadeIn 0.5s ease forwards;
        }
        .success-icon {
          width: 64px; height: 64px;
          background: var(--success-bg);
          border: 1px solid var(--success-border);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          margin: 0 auto 20px;
        }
        .success-title {
          font-family: Inter, system-ui, sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .success-sub {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          font-weight: 300;
          margin-bottom: 32px;
        }
        .success-sub strong { color: var(--text-primary); font-weight: 500; }

        .form-enter { animation: formFadeIn 0.5s ease forwards; }
        @keyframes formFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .auth-left { display: none; }
          .auth-right { width: 100%; border-left: none; padding: 48px 32px; }
        }

        /* ── Orbit OS — Cosmic ambient layer ───────────────────────── */
        .auth-left::before, .auth-left::after { display: none; }

        .auth-cosmos {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .auth-cosmos::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1.2px 1.2px at 12% 18%, rgba(255,255,255,0.45) 0%, transparent 100%),
            radial-gradient(1px   1px   at 67% 32%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1px   1px   at 83% 67%, rgba(255,255,255,0.30) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 28% 58%, rgba(245,158,11, 0.45) 0%, transparent 100%),
            radial-gradient(1px   1px   at 47% 82%, rgba(255,255,255,0.28) 0%, transparent 100%),
            radial-gradient(1px   1px   at 91% 14%, rgba(255,255,255,0.38) 0%, transparent 100%),
            radial-gradient(1px   1px   at 38% 42%, rgba(255,255,255,0.22) 0%, transparent 100%),
            radial-gradient(1px   1px   at 73% 78%, rgba(255,255,255,0.28) 0%, transparent 100%),
            radial-gradient(1.2px 1.2px at  8% 72%, rgba(255,255,255,0.32) 0%, transparent 100%),
            radial-gradient(1px   1px   at 54%  8%, rgba(255,255,255,0.38) 0%, transparent 100%),
            radial-gradient(1px   1px   at 19% 90%, rgba(255,255,255,0.18) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 95% 48%, rgba(245,158,11, 0.30) 0%, transparent 100%);
          animation: starfield-shimmer 10s ease-in-out infinite;
        }
        @keyframes starfield-shimmer {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        .auth-cosmos-glow-1 {
          position: absolute;
          top: -160px; left: -160px;
          width: 580px; height: 580px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(245,158,11,0.16) 0%, transparent 65%);
          animation: cosmos-breathe 10s ease-in-out infinite;
        }
        .auth-cosmos-glow-2 {
          position: absolute;
          bottom: -120px; right: -100px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(245,158,11,0.07) 0%, transparent 65%);
          animation: cosmos-breathe 14s ease-in-out infinite reverse;
        }
        @keyframes cosmos-breathe {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(1.10); opacity: 0.55; }
        }
        .auth-orbit-ring { position: absolute; top: 50%; left: 50%; border-radius: 50%; }
        .auth-orbit-ring-1 {
          width: 560px; height: 210px;
          margin: -105px 0 0 -280px;
          border: 1px solid rgba(245,158,11,0.10);
          transform: rotate(-28deg);
          animation: ring-pulse 9s ease-in-out infinite;
        }
        .auth-orbit-ring-2 {
          width: 360px; height: 130px;
          margin: -65px 0 0 -180px;
          border: 1px solid rgba(245,158,11,0.055);
          transform: rotate(20deg);
          animation: ring-pulse 13s ease-in-out infinite reverse;
        }
        @keyframes ring-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        .auth-orbit-node-1 {
          position: absolute;
          top: calc(50% - 185px); left: 50%;
          width: 4px; height: 4px; margin-left: -2px;
          border-radius: 50%;
          background: rgba(245,158,11,0.85);
          box-shadow: 0 0 14px rgba(245,158,11,0.40), 0 0 6px rgba(245,158,11,0.55);
          transform-origin: 0px 185px;
          animation: node-orbit 32s linear infinite;
        }
        .auth-orbit-node-2 {
          position: absolute;
          top: calc(50% - 135px); left: 50%;
          width: 3px; height: 3px; margin-left: -1.5px;
          border-radius: 50%;
          background: rgba(253,230,138,0.60);
          box-shadow: 0 0 10px rgba(245,158,11,0.25);
          transform-origin: 0px 135px;
          animation: node-orbit 22s linear infinite reverse;
        }
        @keyframes node-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Dawn horizon band — warm glow at the base of the panel */
        .auth-cosmos::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 280px;
          background: radial-gradient(ellipse 85% 100% at 50% 100%, rgba(245,158,11,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
      `}</style>

      <div className="auth-root">
        {/* LEFT */}
        <div className="auth-left">
          {/* Orbit OS — decorative cosmic ambient layer, no logic */}
          <div aria-hidden="true" className="auth-cosmos">
            <div className="auth-cosmos-glow-1" />
            <div className="auth-cosmos-glow-2" />
            <div className="auth-orbit-ring auth-orbit-ring-1" />
            <div className="auth-orbit-ring auth-orbit-ring-2" />
            <div className="auth-orbit-node-1" />
            <div className="auth-orbit-node-2" />
          </div>
          <div className="auth-logo">Vega<span>ply</span></div>

          <div className="auth-hero">
            <div className="auth-eyebrow">Free — No credit card</div>
            <h1 className="auth-headline">
              The <em>smartest</em><br />
              way to find<br />
              your next role.
            </h1>
            <p className="auth-sub">
              Stop applying late. Vegaply delivers freshly posted roles each morning — so you&apos;re among the first to apply, before the crowd arrives.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon indigo">⚡</div>
                <div>
                  <div className="feature-name">Early Bird Detection</div>
                  <div className="feature-desc">Jobs posted in the last 6 hours — before most applicants see them</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon pink">🤖</div>
                <div>
                  <div className="feature-name">AI Resume Match</div>
                  <div className="feature-desc">Instant match score with tailored bullet points</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon amber">📋</div>
                <div>
                  <div className="feature-name">Kanban Tracker</div>
                  <div className="feature-desc">Kanban board for every job you're pursuing</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', fontWeight: 300 }}>
            © {new Date().getFullYear()} Vegaply · Built for ambitious job seekers
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          {success ? (
            <div className="success-box">
              <div className="success-icon">✉️</div>
              <div className="success-title">Check your inbox</div>
              <p className="success-sub">
                We sent a confirmation link to<br />
                <strong>{email}</strong><br /><br />
                Click the link to activate your account and start finding jobs.<br/><span style={{fontSize:12,color:"var(--text-tertiary)"}}>Check spam folder if you do not see it.</span>
              </p>
              {resent&&<div style={{background:"var(--success-bg)",border:"1px solid var(--success-border)",borderRadius:10,padding:"10px 16px",fontSize:13,color:"var(--success)",marginBottom:16}}>Email resent!</div>}<button onClick={handleResend} disabled={!canResend||resending} style={{width:"100%",background:canResend?"linear-gradient(135deg,var(--gold),var(--gold-dark))":"var(--bg-input)",border:"1px solid var(--border)",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,fontFamily:"inherit",color:canResend?"var(--text-primary)":"var(--text-tertiary)",cursor:canResend?"pointer":"not-allowed",marginBottom:16}}>{resending?"Sending...":canResend?"Resend Email":"Resend in "+countdown+"s"}</button><a href="/login" style={{display:"block",textAlign:"center",color:"var(--gold)",fontSize:14,fontWeight:500,textDecoration:"none"}}>
                ← Back to sign in
              </a>
            </div>
          ) : (
            <div className="form-enter">
              <div className="form-tag">Get started free</div>
              <h2 className="form-title">Create account</h2>
              <p className="form-subtitle">Start applying to better-fit roles today.</p>

              {error && <div className="form-error">⚠ {error}</div>}

              <button className="google-btn" onClick={handleGoogleAuth} disabled={googleLoading || !termsAccepted}>
                {googleLoading ? <><span className="form-spinner"/> Redirecting…</> : <><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>Continue with Google</>}
              </button>
              <div className="or-divider"><span>or</span></div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0, display: "flex", alignItems: "center" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="strength-bar">
                    {[1,2,3].map(i => (
                      <div key={i} className="strength-seg" style={{ background: i <= strength ? strengthColor : undefined }} />
                    ))}
                    <span className="strength-text" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--gold)" }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 300, lineHeight: 1.5 }}>
                  I agree to Vegaply&apos;s{" "}
                  <a href="/terms" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</a>
                </span>
              </label>

              <button className="form-btn" onClick={handleSignup} disabled={loading || !termsAccepted}>
                {loading ? (
                  <span className="form-loading">
                    <span className="form-spinner" /> Creating account…
                  </span>
                ) : "Create Free Account →"}
              </button>

              <div className="form-footer">
                Already have an account?{" "}
                <a href="/login">Sign in</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
