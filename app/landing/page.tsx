"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redirect logged-in users to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/home";
    });
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: "⚡",
      title: "Early Bird Mode",
      desc: "See jobs posted in the last 24 hours before hundreds of applicants pile on. First mover advantage, every day.",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.06)",
      border: "rgba(251,191,36,0.15)",
    },
    {
      icon: "🤖",
      title: "AI Resume Match",
      desc: "Instant match score between your resume and any job. Know your fit before you apply — not after rejection.",
      color: "#818cf8",
      bg: "rgba(129,140,248,0.06)",
      border: "rgba(129,140,248,0.15)",
    },
    {
      icon: "🎯",
      title: "ATS Score Analysis",
      desc: "See exactly which keywords your resume is missing. Most companies auto-reject below 60% — don't let that be you.",
      color: "#34d399",
      bg: "rgba(52,211,153,0.06)",
      border: "rgba(52,211,153,0.15)",
    },
    {
      icon: "✂️",
      title: "Resume Tailoring",
      desc: "One click rewrites your resume bullets to match the job's language. ATS-optimized, human-approved.",
      color: "#ec4899",
      bg: "rgba(236,72,153,0.06)",
      border: "rgba(236,72,153,0.15)",
    },
    {
      icon: "🔧",
      title: "Fix My Resume",
      desc: "After matching, instantly see which gaps to fill and get AI-rewritten bullets that close them.",
      color: "#f87171",
      bg: "rgba(248,113,113,0.06)",
      border: "rgba(248,113,113,0.15)",
    },
    {
      icon: "📋",
      title: "Application Tracker",
      desc: "Kanban board to track every application — Applied, Interviewing, Offer, Rejected. Your pipeline in one view.",
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.06)",
      border: "rgba(167,139,250,0.15)",
    },
  ];

  const steps = [
    { num: "01", title: "Search fresh jobs", desc: "Enter your role and location. Early Bird mode shows only jobs posted in the last 24 hours.", icon: "🔍" },
    { num: "02", title: "Upload your resume", desc: "Drop your PDF once. Vegaply remembers it for every future match.", icon: "📄" },
    { num: "03", title: "See your match score", desc: "Instant AI analysis — Resume Match %, ATS Score, strengths, and gaps for each job.", icon: "📊" },
    { num: "04", title: "Fix & apply early", desc: "One click rewrites your resume for that job. Apply before the competition even notices.", icon: "🚀" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Data Analyst", company: "Got hired at Deloitte", text: "I applied to a job 2 hours after it was posted. Vegaply showed me I was an 84% match. Got the interview next day.", score: 84 },
    { name: "Marcus T.", role: "Software Engineer", company: "Now at a Series B startup", text: "The ATS score feature is a game changer. I was getting ghosted until I fixed my keywords. Response rate went from 5% to 40%.", score: 91 },
    { name: "Priya M.", role: "Product Manager", company: "Joined Google", text: "Found my job 1 hour after posting. The resume tailoring literally rewrote my bullets to match their JD. Insane tool.", score: 78 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'DM Sans',sans-serif;background:#060608;color:#fff;min-height:100vh;overflow-x:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}

        /* Noise texture overlay */
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.4}

        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
        .nav.scrolled{background:rgba(6,6,8,0.92);border-bottom:1px solid rgba(255,255,255,0.06);backdrop-filter:blur(20px)}
        .nav-logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;text-decoration:none}
        .nav-logo span{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .nav-links{display:flex;align-items:center;gap:32px}
        .nav-link{font-size:14px;font-weight:500;color:rgba(255,255,255,0.4);text-decoration:none;transition:color .2s}
        .nav-link:hover{color:#fff}
        .nav-cta{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;padding:9px 22px;font-size:14px;font-weight:600;transition:all .2s}
        .nav-cta:hover{opacity:0.9;transform:translateY(-1px)}

        /* Hero */
        .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;text-align:center;overflow:hidden}
        .hero-glow-1{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(99,102,241,0.18) 0%,transparent 65%);pointer-events:none}
        .hero-glow-2{position:absolute;bottom:-100px;left:20%;width:500px;height:400px;background:radial-gradient(ellipse,rgba(236,72,153,0.1) 0%,transparent 65%);pointer-events:none}
        .hero-glow-3{position:absolute;top:30%;right:10%;width:400px;height:400px;background:radial-gradient(ellipse,rgba(52,211,153,0.06) 0%,transparent 65%);pointer-events:none}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:600;color:#a5b4fc;margin-bottom:32px;animation:fadeUp .6s ease both}
        .hero-badge::before{content:'';width:7px;height:7px;background:#818cf8;border-radius:50%;animation:pulse 2s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        .hero-title{font-family:'Playfair Display',serif;font-size:clamp(42px,7vw,82px);font-weight:900;line-height:1.0;letter-spacing:-2px;margin-bottom:24px;animation:fadeUp .7s .1s ease both}
        .hero-title-line2{display:block;font-style:italic;background:linear-gradient(135deg,#818cf8 0%,#ec4899 50%,#fbbf24 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-size:18px;color:rgba(255,255,255,0.35);max-width:520px;line-height:1.7;margin-bottom:48px;font-weight:300;animation:fadeUp .7s .2s ease both}
        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .7s .3s ease both}
        .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;padding:15px 36px;font-size:16px;font-weight:700;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:8px;border:none;cursor:pointer}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 48px rgba(99,102,241,0.35)}
        .btn-secondary{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7);text-decoration:none;border-radius:12px;padding:15px 36px;font-size:16px;font-weight:600;font-family:inherit;transition:all .2s;border:1px solid rgba(255,255,255,0.1);cursor:pointer}
        .btn-secondary:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2);color:#fff}

        /* Hero mockup */
        .hero-mockup{margin-top:72px;position:relative;max-width:860px;width:100%;animation:fadeUp .8s .4s ease both}
        .mockup-card{background:rgba(13,13,20,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px;backdrop-filter:blur(20px);box-shadow:0 40px 120px rgba(0,0,0,0.6)}
        .mockup-bar{display:flex;gap:6px;margin-bottom:20px}
        .mockup-dot{width:10px;height:10px;border-radius:50%}
        .mockup-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .mockup-job{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;position:relative;overflow:hidden}
        .mockup-job-hot{border-color:rgba(251,191,36,0.2)!important;background:rgba(251,191,36,0.02)!important}
        .mockup-ribbon{position:absolute;top:0;left:0;right:0;background:linear-gradient(135deg,rgba(248,113,113,0.6),rgba(251,191,36,0.6));color:#fff;font-size:9px;font-weight:700;padding:3px 10px;text-align:center}
        .mockup-score{display:flex;align-items:center;gap:8px;margin-top:8px}
        .mockup-score-bar{flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden}
        .mockup-score-fill{height:100%;border-radius:4px;animation:grow 1.5s .8s ease both}
        @keyframes grow{from{width:0}to{width:var(--w)}}

        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

        /* Stats */
        .stats-section{padding:80px 48px;position:relative;z-index:1}
        .stats-inner{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(255,255,255,0.06);border-radius:20px;overflow:hidden}
        .stat-item{background:#060608;padding:48px 32px;text-align:center}
        .stat-num{font-family:'Playfair Display',serif;font-size:56px;font-weight:900;line-height:1;margin-bottom:8px}
        .stat-label{font-size:14px;color:rgba(255,255,255,0.3);font-weight:400}

        /* Features */
        .features-section{padding:100px 48px;position:relative;z-index:1}
        .section-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#818cf8;margin-bottom:16px;text-align:center}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(32px,4vw,48px);font-weight:900;text-align:center;margin-bottom:16px;line-height:1.15;letter-spacing:-1px}
        .section-sub{font-size:16px;color:rgba(255,255,255,0.3);text-align:center;max-width:480px;margin:0 auto 64px;line-height:1.7}
        .features-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .feature-card{border-radius:16px;padding:28px;border:1px solid;transition:all .3s;position:relative;overflow:hidden}
        .feature-card::before{content:'';position:absolute;top:0;right:0;width:80px;height:80px;border-radius:50%;filter:blur(40px);opacity:0.3}
        .feature-card:hover{transform:translateY(-4px)}
        .feature-icon{font-size:28px;margin-bottom:16px;display:block}
        .feature-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:8px}
        .feature-desc{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.7}

        /* How it works */
        .how-section{padding:100px 48px;position:relative;z-index:1}
        .how-grid{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;position:relative}
        .how-grid::before{content:'';position:absolute;top:32px;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(129,140,248,0.3),rgba(236,72,153,0.3),transparent);z-index:0}
        .how-step{text-align:center;position:relative;z-index:1}
        .how-num{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;position:relative}
        .how-num-label{position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#818cf8,#ec4899);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px}
        .how-step-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;margin-bottom:8px;color:#fff}
        .how-step-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6}

        /* Testimonials */
        .testimonials-section{padding:100px 48px;position:relative;z-index:1}
        .testimonials-grid{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .testimonial-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px;transition:all .3s}
        .testimonial-card:hover{border-color:rgba(129,140,248,0.2);transform:translateY(-3px)}
        .testimonial-score{display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .testimonial-ring{width:48px;height:48px;flex-shrink:0}
        .testimonial-text{font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:20px;font-style:italic}
        .testimonial-author{display:flex;align-items:center;gap:10px}
        .testimonial-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#ec4899);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
        .testimonial-name{font-size:13px;font-weight:700;color:#fff}
        .testimonial-role{font-size:11px;color:rgba(255,255,255,0.3);margin-top:1px}

        /* CTA */
        .cta-section{padding:120px 48px;position:relative;z-index:1;text-align:center}
        .cta-inner{max-width:640px;margin:0 auto}
        .cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(99,102,241,0.15) 0%,transparent 65%);pointer-events:none}
        .cta-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,56px);font-weight:900;line-height:1.1;letter-spacing:-1.5px;margin-bottom:20px}
        .cta-sub{font-size:16px;color:rgba(255,255,255,0.35);margin-bottom:48px;line-height:1.7}
        .cta-note{font-size:12px;color:rgba(255,255,255,0.2);margin-top:16px}

        /* Footer */
        .footer{padding:48px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
        .footer-logo{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#fff}
        .footer-logo span{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .footer-copy{font-size:12px;color:rgba(255,255,255,0.2)}

        @media(max-width:900px){
          .features-grid{grid-template-columns:repeat(2,1fr)}
          .how-grid{grid-template-columns:repeat(2,1fr)}
          .how-grid::before{display:none}
          .testimonials-grid{grid-template-columns:1fr}
          .stats-inner{grid-template-columns:1fr}
          .stats-inner{gap:1px}
          .nav-links{display:none}
          .mockup-jobs{grid-template-columns:1fr}
          .footer{flex-direction:column;gap:12px;text-align:center}
        }
        @media(max-width:600px){
          .features-grid{grid-template-columns:1fr}
          .nav{padding:0 20px}
          .hero{padding:100px 20px 60px}
          .stats-section,.features-section,.how-section,.testimonials-section,.cta-section{padding:60px 20px}
        }
      `}</style>

      {/* Nav */}
      <nav className={`nav${scrollY > 20 ? " scrolled" : ""}`}>
        <a href="#" className="nav-logo">Apply<span>Smart</span></a>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how" className="nav-link">How it works</a>
          <a href="#testimonials" className="nav-link">Stories</a>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/login" className="nav-link" style={{ fontSize: 14 }}>Sign in</Link>
          <Link href="/signup" className="nav-cta">Get Started Free →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow-1"/>
        <div className="hero-glow-2"/>
        <div className="hero-glow-3"/>
        <div className="hero-badge">⚡ AI-Powered Early Bird Job Search</div>
        <h1 className="hero-title">
          Apply before<br/>
          <span className="hero-title-line2">anyone else does</span>
        </h1>
        <p className="hero-sub">
          Vegaply finds jobs posted in the last 24 hours, matches your resume instantly, and tells you your ATS score — so you apply first and get hired faster.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="btn-primary">Start for Free →</Link>
          <Link href="/login" className="btn-secondary">Sign In</Link>
        </div>

        {/* App mockup */}
        <div className="hero-mockup">
          <div className="mockup-card">
            <div className="mockup-bar">
              <div className="mockup-dot" style={{ background: "#f87171" }}/>
              <div className="mockup-dot" style={{ background: "#fbbf24" }}/>
              <div className="mockup-dot" style={{ background: "#34d399" }}/>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 24px", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Vegaply.app</div>
              </div>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <div style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(129,140,248,0.2)" }}>All Results (0)</div>
              <div style={{ background: "linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15))", color: "#fbbf24", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)" }}>⚡ Early Bird (24)</div>
              <div style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)" }}>🔖 Saved (3)</div>
            </div>
            <div className="mockup-jobs">
              {[
                { title: "Senior Data Analyst", company: "Stripe", loc: "Remote", hot: true, score: 87, color: "#34d399", time: "45m ago" },
                { title: "Product Analyst", company: "Airbnb", loc: "San Francisco, CA", hot: true, score: 72, color: "#818cf8", time: "1h ago" },
                { title: "Business Intelligence Analyst", company: "Shopify", loc: "Toronto, Canada", hot: false, score: 64, color: "#fbbf24", time: "4h ago" },
                { title: "Data Engineer", company: "Meta", loc: "Menlo Park, CA", hot: false, score: 58, color: "#fbbf24", time: "6h ago" },
              ].map((job, i) => (
                <div key={i} className={`mockup-job${job.hot ? " mockup-job-hot" : ""}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  {job.hot && <div className="mockup-ribbon">🔥 HOT — under 6h old</div>}
                  <div style={{ marginTop: job.hot ? 14 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{job.title}</div>
                    <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 500 }}>{job.company}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{job.loc}</div>
                    <div className="mockup-score">
                      <span style={{ fontSize: 10, fontWeight: 700, color: job.color }}>{job.score}%</span>
                      <div className="mockup-score-bar">
                        <div className="mockup-score-fill" style={{ background: job.color, "--w": `${job.score}%` } as any}/>
                      </div>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{job.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-num" style={{ background: "linear-gradient(135deg,#818cf8,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              24h
            </div>
            <div className="stat-label">Jobs posted within the last 24 hours — minimal competition</div>
          </div>
          <div className="stat-item">
            <div className="stat-num" style={{ background: "linear-gradient(135deg,#34d399,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              60s
            </div>
            <div className="stat-label">Average time to get your first AI match score</div>
          </div>
          <div className="stat-item">
            <div className="stat-num" style={{ background: "linear-gradient(135deg,#fbbf24,#f87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              3x
            </div>
            <div className="stat-label">Early applicants are 3x more likely to get an interview*</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.15)" }}>*Based on LinkedIn Talent Insights research on application timing</div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-eyebrow">Everything you need</div>
        <h2 className="section-title">Built for the modern job seeker</h2>
        <p className="section-sub">Every feature designed to get you hired faster than everyone else applying to the same job.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ background: f.bg, borderColor: f.border }}>
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how">
        <div className="section-eyebrow">Simple process</div>
        <h2 className="section-title">From search to hired<br/><em style={{ fontStyle: "italic", background: "linear-gradient(135deg,#818cf8,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in four steps</em></h2>
        <p className="section-sub" style={{ marginBottom: 80 }}>The whole flow takes under 5 minutes. Most users apply to their first matched job within 10 minutes of signing up.</p>
        <div className="how-grid">
          {steps.map((s, i) => (
            <div key={i} className="how-step">
              <div className="how-num">
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <div className="how-num-label">{s.num}</div>
              </div>
              <div className="how-step-title">{s.title}</div>
              <div className="how-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-eyebrow">Real results</div>
        <h2 className="section-title">People are getting hired</h2>
        <p className="section-sub" style={{ marginBottom: 64 }}>Early applicants are 3x more likely to get an interview. These are their stories.</p>
        <div className="testimonials-grid">
          {testimonials.map((t, i) => {
            const color = t.score >= 80 ? "#34d399" : t.score >= 65 ? "#818cf8" : "#fbbf24";
            const r = 18, circ = 2 * Math.PI * r;
            return (
              <div key={i} className="testimonial-card">
                <div className="testimonial-score">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="testimonial-ring">
                    <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
                    <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3"
                      strokeDasharray={circ} strokeDashoffset={circ - (t.score / 100) * circ}
                      strokeLinecap="round" transform="rotate(-90 24 24)"/>
                    <text x="24" y="29" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="'DM Sans',sans-serif">{t.score}</text>
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{t.score >= 80 ? "Excellent Match" : t.score >= 65 ? "Strong Match" : "Good Match"}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Resume Match Score</div>
                  </div>
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow"/>
        <div className="cta-inner" style={{ position: "relative", zIndex: 1 }}>
          <h2 className="cta-title">
            Your next job was posted<br/>
            <span style={{ fontStyle: "italic", background: "linear-gradient(135deg,#818cf8,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>in the last hour</span>
          </h2>
          <p className="cta-sub">Don't let 500 people apply before you. Start finding early jobs and matching your resume in 60 seconds.</p>
          <Link href="/signup" className="btn-primary" style={{ fontSize: 17, padding: "17px 48px" }}>
            Get Started — It's Free →
          </Link>
          <div className="cta-note">No credit card required · Takes 60 seconds to set up</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">Apply<span>Smart</span></div>
        <div className="footer-copy">© 2026 Vegaply. Built with ❤️ for job seekers everywhere.</div>
      </footer>
    </>
  );
}
