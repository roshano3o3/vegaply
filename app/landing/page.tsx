"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [counters, setCounters] = useState({ jobs: 0, users: 0, rate: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsAnimated = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !statsAnimated.current) {
        statsAnimated.current = true;
        const targets = { jobs: 12400, users: 3800, rate: 3 };
        const dur = 1600;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCounters({
            jobs: Math.round(targets.jobs * ease),
            users: Math.round(targets.users * ease),
            rate: Math.round(targets.rate * ease * 10) / 10,
          });
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3000);
    return () => clearInterval(t);
  }, []);

  const features = [
    {
      icon: "⚡",
      tag: "TIMING EDGE",
      title: "Early Bird Mode",
      desc: "See only jobs posted in the last 24 hours — before hundreds of applicants pile on. Apply when the hiring manager is still actively reviewing.",
      detail: "Early applicants are 3× more likely to get an interview. Vegaply surfaces fresh jobs the moment they go live.",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.06)",
      border: "rgba(251,191,36,0.18)",
    },
    {
      icon: "🎯",
      tag: "AI ANALYSIS",
      title: "Resume Match Score",
      desc: "Instant AI-powered match between your resume and any job posting. Know your real fit percentage before you spend an hour applying.",
      detail: "Our AI reads both documents like a recruiter would — skills, seniority, domain, language — and tells you exactly where you stand.",
      color: "#818cf8",
      bg: "rgba(129,140,248,0.06)",
      border: "rgba(129,140,248,0.18)",
    },
    {
      icon: "📊",
      tag: "SKILL INTELLIGENCE",
      title: "Skill Gap Analysis",
      desc: "See exactly which skills you're missing for each role, which ones you already ace, and get course recommendations to close every gap.",
      detail: "Missing AWS? We'll show you the top Coursera course. Weak on SQL? Here's a freeCodeCamp path. No guessing — just a clear upgrade roadmap.",
      color: "#34d399",
      bg: "rgba(52,211,153,0.06)",
      border: "rgba(52,211,153,0.18)",
    },
    {
      icon: "🏆",
      tag: "WIN PROBABILITY",
      title: "Success Predictor",
      desc: "A single percentage that tells you your real chance of getting this job — based on difficulty level, your match score, and competition signals.",
      detail: "We combine job seniority, competition age, and your match score into one honest number. Stop wasting time on 20% chances when 80% ones exist.",
      color: "#ec4899",
      bg: "rgba(236,72,153,0.06)",
      border: "rgba(236,72,153,0.18)",
    },
    {
      icon: "🇺🇸",
      tag: "VISA INTELLIGENCE",
      title: "H1B & Visa Detection",
      desc: "Every job card shows visa status instantly: H1B Friendly, Citizens Only, or Security Clearance Required — before you waste time applying.",
      detail: "We scan job descriptions for sponsorship language, clearance requirements, and citizenship mandates so international candidates never hit a wall.",
      color: "#f87171",
      bg: "rgba(248,113,113,0.06)",
      border: "rgba(248,113,113,0.18)",
    },
    {
      icon: "📋",
      tag: "PIPELINE MANAGEMENT",
      title: "Kanban Job Tracker",
      desc: "Track every application through a 5-column kanban board: Saved → Applied → Interviewing → Offer → Rejected. Your whole job search in one view.",
      detail: "See your response rate, application funnel, and motivational progress — so you always know exactly where each opportunity stands.",
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.06)",
      border: "rgba(167,139,250,0.18)",
    },
  ];

  const steps = [
    { num: "01", title: "Search fresh jobs", desc: "Enter your role and location. Early Bird mode shows only jobs posted in the last 24 hours.", icon: "🔍" },
    { num: "02", title: "Upload your resume", desc: "Drop your PDF once. Vegaply reads it, stores it, and uses it for every future match automatically.", icon: "📄" },
    { num: "03", title: "See your scores", desc: "Instant match %, success chance, skill gaps, and visa status — all before you click Apply.", icon: "📊" },
    { num: "04", title: "Apply first & win", desc: "Tailor your resume bullets with one click, then apply while others are still reading the posting.", icon: "🚀" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Data Analyst", company: "Hired at Deloitte", text: "Applied 2 hours after the job posted. Vegaply showed 84% match. Got an interview the next morning. This is the unfair advantage I didn't know existed.", score: 84, avatar: "S" },
    { name: "Marcus T.", role: "Software Engineer", company: "Series B startup", text: "Was getting ghosted until I used the Skill Gap tool. Fixed my resume for 3 missing keywords. Response rate jumped from 5% to 40% in two weeks.", score: 91, avatar: "M" },
    { name: "Priya M.", role: "Product Manager", company: "Joined Google", text: "Found my job 1 hour after it posted. The Success Predictor showed 78% — I trusted it, customized my cover letter, and got the call same day.", score: 78, avatar: "P" },
    { name: "James L.", role: "UX Designer", company: "Now at Figma", text: "The H1B detection saved me hours. I'm on an OPT and used to apply blindly. Now I only see roles that actually sponsor. Game-changing for international job seekers.", score: 82, avatar: "J" },
    { name: "Aisha R.", role: "Data Scientist", company: "Hired at Databricks", text: "The kanban tracker kept me sane. Applying to 30+ jobs is chaos without it. Seeing my funnel helped me realize I needed more top-of-pipeline volume.", score: 88, avatar: "A" },
    { name: "Ryan C.", role: "Backend Engineer", company: "Joined Vercel", text: "Early Bird mode is real. I got to 3 jobs before they even had 10 applicants. The hiring manager literally said I was 'one of the first to apply.'", score: 76, avatar: "R" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'DM Sans',sans-serif;background:#060608;color:#fff;min-height:100vh;overflow-x:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.4}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
        .nav.scrolled{background:rgba(6,6,8,0.94);border-bottom:1px solid rgba(255,255,255,0.06);backdrop-filter:blur(24px)}
        .nav-logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;text-decoration:none}
        .nav-logo span{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .nav-links{display:flex;align-items:center;gap:32px}
        .nav-link{font-size:14px;font-weight:500;color:rgba(255,255,255,0.4);text-decoration:none;transition:color .2s}
        .nav-link:hover{color:#fff}
        .nav-cta{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;padding:9px 22px;font-size:14px;font-weight:600;transition:all .2s;white-space:nowrap}
        .nav-cta:hover{opacity:0.9;transform:translateY(-1px)}

        /* HERO */
        .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;text-align:center;overflow:hidden}
        .hero-glow-1{position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:1000px;height:700px;background:radial-gradient(ellipse,rgba(99,102,241,0.2) 0%,transparent 65%);pointer-events:none}
        .hero-glow-2{position:absolute;bottom:-100px;left:15%;width:500px;height:400px;background:radial-gradient(ellipse,rgba(236,72,153,0.12) 0%,transparent 65%);pointer-events:none}
        .hero-glow-3{position:absolute;top:25%;right:8%;width:400px;height:400px;background:radial-gradient(ellipse,rgba(52,211,153,0.07) 0%,transparent 65%);pointer-events:none}

        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.28);border-radius:100px;padding:7px 18px;font-size:12px;font-weight:600;color:#a5b4fc;margin-bottom:28px;animation:fadeUp .6s ease both;letter-spacing:.3px}
        .hero-badge-dot{width:7px;height:7px;background:#818cf8;border-radius:50%;animation:pulse 2s ease-in-out infinite;flex-shrink:0}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.65)}}

        .hero-title{font-family:'Playfair Display',serif;font-size:clamp(44px,7.5vw,88px);font-weight:900;line-height:.98;letter-spacing:-3px;margin-bottom:28px;animation:fadeUp .7s .1s ease both;max-width:900px}
        .hero-title em{font-style:italic;background:linear-gradient(135deg,#818cf8 0%,#ec4899 55%,#fbbf24 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .hero-sub{font-size:18px;color:rgba(255,255,255,0.38);max-width:560px;line-height:1.75;margin-bottom:20px;font-weight:300;animation:fadeUp .7s .2s ease both}

        .hero-proof{display:flex;align-items:center;gap:20px;justify-content:center;margin-bottom:44px;animation:fadeUp .7s .25s ease both;flex-wrap:wrap}
        .hero-proof-avatars{display:flex}
        .hero-proof-av{width:30px;height:30px;border-radius:50%;border:2px solid #060608;margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
        .hero-proof-av:first-child{margin-left:0}
        .hero-proof-text{font-size:13px;color:rgba(255,255,255,0.35);font-weight:400}
        .hero-proof-text strong{color:rgba(255,255,255,0.7);font-weight:600}

        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .7s .3s ease both;margin-bottom:12px}
        .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;padding:15px 36px;font-size:16px;font-weight:700;font-family:inherit;transition:all .25s;display:inline-flex;align-items:center;gap:8px;border:none;cursor:pointer;letter-spacing:-.2px}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 20px 60px rgba(99,102,241,0.4)}
        .btn-secondary{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.65);text-decoration:none;border-radius:12px;padding:15px 36px;font-size:16px;font-weight:600;font-family:inherit;transition:all .2s;border:1px solid rgba(255,255,255,0.1);cursor:pointer}
        .btn-secondary:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2);color:#fff}
        .hero-note{font-size:12px;color:rgba(255,255,255,0.2);animation:fadeUp .7s .35s ease both}

        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}

        /* HERO MOCKUP */
        .hero-mockup{margin-top:64px;position:relative;max-width:920px;width:100%;animation:fadeUp .9s .45s ease both}
        .mockup-card{background:rgba(10,10,16,0.95);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:20px;backdrop-filter:blur(20px);box-shadow:0 48px 140px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.03)}
        .mockup-bar{display:flex;align-items:center;gap:6px;margin-bottom:16px}
        .mockup-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .mockup-url{flex:1;display:flex;justify-content:center}
        .mockup-url-pill{background:rgba(255,255,255,0.04);border-radius:6px;padding:3px 24px;font-size:11px;color:rgba(255,255,255,0.25)}
        .mockup-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .mockup-tab{font-size:11px;font-weight:700;padding:5px 12px;border-radius:8px;white-space:nowrap}
        .mockup-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
        .mockup-job{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:13px;position:relative;overflow:hidden;transition:border-color .2s}
        .mockup-job-hot{border-color:rgba(251,191,36,0.22)!important}
        .mockup-ribbon{background:linear-gradient(90deg,rgba(248,113,113,0.7),rgba(251,191,36,0.7));color:#fff;font-size:9px;font-weight:800;padding:3px 10px;margin:-13px -13px 10px;letter-spacing:.3px}
        .mockup-badges{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
        .mockup-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px}
        .mockup-score-row{display:flex;align-items:center;gap:7px;margin-top:8px}
        .mockup-bar-bg{flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden}
        .mockup-bar-fill{height:100%;border-radius:4px;animation:grow 1.4s .9s ease both}
        @keyframes grow{from{width:0}to{width:var(--w)}}

        /* SOCIAL PROOF TICKER */
        .ticker-wrap{overflow:hidden;padding:0 0 0;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.015);position:relative;z-index:1}
        .ticker-track{display:flex;gap:0;animation:ticker 28s linear infinite;width:max-content}
        .ticker-item{padding:12px 48px;font-size:12px;color:rgba(255,255,255,0.28);white-space:nowrap;display:flex;align-items:center;gap:10px;border-right:1px solid rgba(255,255,255,0.05)}
        .ticker-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}

        /* STATS */
        .stats-section{padding:80px 48px;position:relative;z-index:1}
        .stats-inner{max-width:860px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(255,255,255,0.06);border-radius:20px;overflow:hidden}
        .stat-item{background:#060608;padding:44px 32px;text-align:center}
        .stat-num{font-family:'Playfair Display',serif;font-size:54px;font-weight:900;line-height:1;margin-bottom:8px}
        .stat-label{font-size:13px;color:rgba(255,255,255,0.28);font-weight:400;line-height:1.5}

        /* FEATURE SHOWCASE */
        .features-section{padding:120px 48px;position:relative;z-index:1}
        .section-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#818cf8;margin-bottom:16px;text-align:center}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(32px,4.5vw,52px);font-weight:900;text-align:center;margin-bottom:16px;line-height:1.1;letter-spacing:-1.5px}
        .section-sub{font-size:16px;color:rgba(255,255,255,0.3);text-align:center;max-width:500px;margin:0 auto 72px;line-height:1.75}

        .features-layout{max-width:1140px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
        .features-list{display:flex;flex-direction:column;gap:6px}
        .feature-row{border-radius:14px;padding:18px 20px;border:1px solid transparent;cursor:pointer;transition:all .25s;display:flex;gap:14px;align-items:flex-start}
        .feature-row.active{border-color:var(--fc);background:var(--fbg)}
        .feature-row:not(.active){border-color:rgba(255,255,255,0.05);background:rgba(255,255,255,0.02)}
        .feature-row:not(.active):hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.08)}
        .feature-icon-wrap{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:background .25s}
        .feature-tag{font-size:9px;font-weight:800;letter-spacing:1.5px;margin-bottom:4px;opacity:0.7}
        .feature-row-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;font-family:'Playfair Display',serif}
        .feature-row-desc{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6;display:none}
        .feature-row.active .feature-row-desc{display:block}

        .feature-detail-panel{position:sticky;top:100px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px;min-height:320px;transition:all .3s}
        .fdp-tag{font-size:10px;font-weight:800;letter-spacing:2px;margin-bottom:12px;opacity:0.8}
        .fdp-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:900;margin-bottom:16px;line-height:1.2;letter-spacing:-.5px}
        .fdp-desc{font-size:14px;color:rgba(255,255,255,0.45);line-height:1.8;margin-bottom:20px}
        .fdp-detail{font-size:13px;line-height:1.75;opacity:0.6}
        .fdp-icon{font-size:48px;margin-bottom:20px;display:block}

        /* VISA SECTION */
        .visa-section{padding:80px 48px;position:relative;z-index:1}
        .visa-inner{max-width:1000px;margin:0 auto;background:rgba(248,113,113,0.05);border:1px solid rgba(248,113,113,0.15);border-radius:24px;padding:56px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
        .visa-badges-demo{display:flex;flex-direction:column;gap:12px}
        .visa-badge-row{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 16px}
        .vbadge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;white-space:nowrap}

        /* HOW IT WORKS */
        .how-section{padding:100px 48px;position:relative;z-index:1}
        .how-grid{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;position:relative}
        .how-grid::before{content:'';position:absolute;top:32px;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(129,140,248,0.35),rgba(236,72,153,0.35),transparent);z-index:0}
        .how-step{text-align:center;position:relative;z-index:1}
        .how-num{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;position:relative}
        .how-num-label{position:absolute;top:-7px;right:-7px;background:linear-gradient(135deg,#818cf8,#ec4899);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:20px;letter-spacing:.3px}
        .how-step-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;margin-bottom:8px;color:#fff}
        .how-step-desc{font-size:12px;color:rgba(255,255,255,0.32);line-height:1.65}

        /* KANBAN PREVIEW */
        .kanban-section{padding:80px 48px 120px;position:relative;z-index:1}
        .kanban-board{max-width:1100px;margin:48px auto 0;display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
        .kanban-col{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px}
        .kanban-col-header{font-size:10px;font-weight:800;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between}
        .kanban-count{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px}
        .kanban-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;margin-bottom:8px}
        .kanban-card-title{font-size:11px;font-weight:700;color:#fff;margin-bottom:3px}
        .kanban-card-co{font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:7px}
        .kanban-card-score{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600}

        /* TESTIMONIALS */
        .testimonials-section{padding:100px 48px;position:relative;z-index:1}
        .testimonials-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .t-card{background:rgba(255,255,255,0.028);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:26px;transition:all .3s;display:flex;flex-direction:column;gap:16px}
        .t-card:hover{border-color:rgba(129,140,248,0.22);transform:translateY(-4px);background:rgba(255,255,255,0.04)}
        .t-score-row{display:flex;align-items:center;gap:10px}
        .t-score-text{font-size:12px;font-weight:700}
        .t-score-sub{font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px}
        .t-quote{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.75;font-style:italic;flex:1}
        .t-author{display:flex;align-items:center;gap:10px}
        .t-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0}
        .t-name{font-size:13px;font-weight:700;color:#fff}
        .t-role{font-size:11px;color:rgba(255,255,255,0.28);margin-top:2px}

        /* CTA */
        .cta-section{padding:140px 48px;position:relative;z-index:1;text-align:center;overflow:hidden}
        .cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(99,102,241,0.18) 0%,transparent 65%);pointer-events:none}
        .cta-glow2{position:absolute;top:60%;left:30%;width:400px;height:300px;background:radial-gradient(ellipse,rgba(236,72,153,0.1) 0%,transparent 65%);pointer-events:none}
        .cta-inner{max-width:680px;margin:0 auto;position:relative;z-index:1}
        .cta-title{font-family:'Playfair Display',serif;font-size:clamp(38px,5.5vw,60px);font-weight:900;line-height:1.08;letter-spacing:-2px;margin-bottom:20px}
        .cta-title em{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .cta-sub{font-size:17px;color:rgba(255,255,255,0.32);margin-bottom:48px;line-height:1.75;max-width:480px;margin-left:auto;margin-right:auto}
        .cta-perks{display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:44px;flex-wrap:wrap}
        .cta-perk{display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(255,255,255,0.35)}
        .cta-perk-dot{width:16px;height:16px;border-radius:50%;background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
        .cta-note{font-size:12px;color:rgba(255,255,255,0.18);margin-top:18px}

        /* FOOTER */
        .footer{padding:48px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
        .footer-logo{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#fff;text-decoration:none}
        .footer-logo span{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .footer-links{display:flex;gap:24px}
        .footer-link{font-size:12px;color:rgba(255,255,255,0.25);text-decoration:none;transition:color .2s}
        .footer-link:hover{color:rgba(255,255,255,0.6)}
        .footer-copy{font-size:12px;color:rgba(255,255,255,0.18)}

        @media(max-width:1000px){
          .features-layout{grid-template-columns:1fr}
          .feature-detail-panel{display:none}
          .feature-row.active .feature-row-desc{display:block}
          .kanban-board{grid-template-columns:repeat(3,1fr)}
          .visa-inner{grid-template-columns:1fr}
          .testimonials-grid{grid-template-columns:repeat(2,1fr)}
        }
        @media(max-width:768px){
          .how-grid{grid-template-columns:repeat(2,1fr)}
          .how-grid::before{display:none}
          .stats-inner{grid-template-columns:1fr;gap:1px}
          .testimonials-grid{grid-template-columns:1fr}
          .kanban-board{grid-template-columns:repeat(2,1fr)}
          .nav-links{display:none}
          .footer{flex-direction:column;gap:16px;text-align:center}
          .footer-links{flex-wrap:wrap;justify-content:center}
        }
        @media(max-width:600px){
          .nav{padding:0 20px}
          .hero{padding:100px 20px 60px}
          .hero-title{letter-spacing:-2px}
          .stats-section,.features-section,.how-section,.kanban-section,.testimonials-section,.cta-section,.visa-section{padding:60px 20px}
          .mockup-jobs{grid-template-columns:1fr}
          .kanban-board{grid-template-columns:1fr}
          .visa-inner{padding:32px 24px}
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav${scrollY > 20 ? " scrolled" : ""}`}>
        <a href="#" className="nav-logo">Vega<span>ply</span></a>
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

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow-1"/>
        <div className="hero-glow-2"/>
        <div className="hero-glow-3"/>

        <div className="hero-badge">
          <div className="hero-badge-dot"/>
          AI-Powered · Real-Time Jobs · 6 Unfair Advantages
        </div>

        <h1 className="hero-title">
          Stop applying late.<br/>
          Start winning <em>early.</em>
        </h1>

        <p className="hero-sub">
          Vegaply finds jobs posted in the last 24 hours, scores your resume instantly, detects visa requirements, predicts your success chance, and tracks every application — so you land the job before others even start applying.
        </p>

        <div className="hero-proof">
          <div className="hero-proof-avatars">
            {["S","M","P","J","A"].map((l,i)=>(
              <div key={i} className="hero-proof-av" style={{background:`hsl(${220+i*30},60%,45%)`}}>{l}</div>
            ))}
          </div>
          <div className="hero-proof-text"><strong>3,800+ job seekers</strong> applied earlier this month</div>
          <div style={{width:1,height:16,background:"rgba(255,255,255,0.1)"}}/>
          <div className="hero-proof-text" style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:"#34d399"}}>★★★★★</span>
            <strong>4.9/5</strong> avg rating
          </div>
        </div>

        <div className="hero-actions">
          <Link href="/signup" className="btn-primary">Start for Free — No Card Required →</Link>
          <Link href="/login" className="btn-secondary">I already have an account</Link>
        </div>
        <div className="hero-note">Free forever · Set up in 60 seconds · No spam</div>

        {/* App Mockup */}
        <div className="hero-mockup">
          <div className="mockup-card">
            <div className="mockup-bar">
              <div className="mockup-dot" style={{background:"#f87171"}}/>
              <div className="mockup-dot" style={{background:"#fbbf24"}}/>
              <div className="mockup-dot" style={{background:"#34d399"}}/>
              <div className="mockup-url">
                <div className="mockup-url-pill">vegaply.com/home</div>
              </div>
            </div>
            <div className="mockup-tabs">
              <div className="mockup-tab" style={{background:"rgba(129,140,248,0.1)",color:"#818cf8",border:"1px solid rgba(129,140,248,0.2)"}}>All Jobs (48)</div>
              <div className="mockup-tab" style={{background:"linear-gradient(135deg,rgba(248,113,113,0.12),rgba(251,191,36,0.12))",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.2)"}}>⚡ Early Bird (31)</div>
              <div className="mockup-tab" style={{background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.07)"}}>📋 Tracker (7)</div>
              <div className="mockup-tab" style={{background:"rgba(255,255,255,0.03)",color:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.07)"}}>📊 Analytics</div>
            </div>
            <div className="mockup-jobs">
              {[
                { title:"Senior Product Designer", company:"Linear", loc:"Remote", hot:true, score:91, color:"#34d399", time:"28m ago", visa:"✅ H1B Friendly", visaColor:"rgba(52,211,153,0.15)", visaText:"#34d399", diff:"🟢 Easy Apply", success:88 },
                { title:"Staff Data Scientist", company:"Stripe", loc:"San Francisco, CA", hot:true, score:76, color:"#818cf8", time:"1h ago", visa:"🔒 Clearance Req.", visaColor:"rgba(248,113,113,0.15)", visaText:"#f87171", diff:"🔴 Competitive", success:52 },
                { title:"Frontend Engineer", company:"Vercel", loc:"Remote", hot:false, score:68, color:"#fbbf24", time:"3h ago", visa:"✅ H1B Friendly", visaColor:"rgba(52,211,153,0.15)", visaText:"#34d399", diff:"🟡 Medium", success:71 },
                { title:"Growth Marketing Mgr", company:"Notion", loc:"New York, NY", hot:false, score:58, color:"#f87171", time:"5h ago", visa:"🇺🇸 Citizens Only", visaColor:"rgba(248,113,113,0.15)", visaText:"#f87171", diff:"🔴 Competitive", success:38 },
              ].map((job, i) => (
                <div key={i} className={`mockup-job${job.hot?" mockup-job-hot":""}`}>
                  {job.hot&&<div className="mockup-ribbon">🔥 HOT — posted under 2 hours ago</div>}
                  <div style={{marginTop:job.hot?0:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{job.title}</div>
                    <div style={{fontSize:11,color:"#818cf8",fontWeight:500,marginBottom:1}}>{job.company}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.28)",marginBottom:8}}>{job.loc}</div>
                    <div className="mockup-badges">
                      <span className="mockup-badge" style={{background:job.visaColor,color:job.visaText}}>{job.visa}</span>
                      <span className="mockup-badge" style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.4)"}}>{job.diff}</span>
                      <span className="mockup-badge" style={{background:"rgba(99,102,241,0.12)",color:"#a5b4fc"}}>🎯 {job.success}% chance</span>
                    </div>
                    <div className="mockup-score-row">
                      <span style={{fontSize:11,fontWeight:800,color:job.color,minWidth:28}}>{job.score}%</span>
                      <div className="mockup-bar-bg"><div className="mockup-bar-fill" style={{background:job.color,"--w":`${job.score}%`} as any}/></div>
                      <span style={{fontSize:9,color:"rgba(255,255,255,0.22)"}}>{job.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[
            {text:"Sarah got hired at Deloitte — applied 2h after posting",color:"#34d399"},
            {text:"Marcus increased response rate from 5% → 40% with Skill Gap",color:"#818cf8"},
            {text:"Priya joined Google — found the job 1h after it went live",color:"#ec4899"},
            {text:"James filtered to H1B-friendly roles and got 3 offers",color:"#fbbf24"},
            {text:"Ryan got to a Vercel job before it had 10 applicants",color:"#34d399"},
            {text:"Aisha tracked 34 applications and landed Databricks",color:"#818cf8"},
            {text:"David used Success Predictor to focus on 80%+ roles only",color:"#f87171"},
            {text:"Sarah got hired at Deloitte — applied 2h after posting",color:"#34d399"},
            {text:"Marcus increased response rate from 5% → 40% with Skill Gap",color:"#818cf8"},
            {text:"Priya joined Google — found the job 1h after it went live",color:"#ec4899"},
            {text:"James filtered to H1B-friendly roles and got 3 offers",color:"#fbbf24"},
            {text:"Ryan got to a Vercel job before it had 10 applicants",color:"#34d399"},
            {text:"Aisha tracked 34 applications and landed Databricks",color:"#818cf8"},
            {text:"David used Success Predictor to focus on 80%+ roles only",color:"#f87171"},
          ].map((item,i)=>(
            <div key={i} className="ticker-item">
              <div className="ticker-dot" style={{background:item.color}}/>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-num" style={{background:"linear-gradient(135deg,#fbbf24,#f87171)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              {counters.jobs.toLocaleString()}+
            </div>
            <div className="stat-label">Fresh jobs tracked in the past 24 hours</div>
          </div>
          <div className="stat-item">
            <div className="stat-num" style={{background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              {counters.users.toLocaleString()}+
            </div>
            <div className="stat-label">Job seekers who applied earlier this month</div>
          </div>
          <div className="stat-item">
            <div className="stat-num" style={{background:"linear-gradient(135deg,#34d399,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              {counters.rate}×
            </div>
            <div className="stat-label">More likely to interview as an early applicant*</div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:14,fontSize:11,color:"rgba(255,255,255,0.15)"}}>*LinkedIn Talent Insights research on application timing and interview rates</div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-eyebrow">Six unfair advantages</div>
        <h2 className="section-title">
          Every tool you need<br/>
          <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>to get hired first</em>
        </h2>
        <p className="section-sub">Each feature gives you an edge that most applicants simply don't have. Together, they make you unstoppable.</p>

        <div className="features-layout">
          <div className="features-list">
            {features.map((f, i) => (
              <div
                key={i}
                className={`feature-row${activeFeature===i?" active":""}`}
                style={{"--fc":f.border,"--fbg":f.bg} as any}
                onClick={()=>setActiveFeature(i)}
              >
                <div className="feature-icon-wrap" style={{background:activeFeature===i?f.bg:"rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:18}}>{f.icon}</span>
                </div>
                <div style={{flex:1}}>
                  <div className="feature-tag" style={{color:f.color}}>{f.tag}</div>
                  <div className="feature-row-title">{f.title}</div>
                  <div className="feature-row-desc" style={{color:"rgba(255,255,255,0.38)"}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="feature-detail-panel" style={{borderColor:features[activeFeature].border,background:features[activeFeature].bg}}>
            <span className="fdp-icon">{features[activeFeature].icon}</span>
            <div className="fdp-tag" style={{color:features[activeFeature].color}}>{features[activeFeature].tag}</div>
            <div className="fdp-title">{features[activeFeature].title}</div>
            <div className="fdp-desc">{features[activeFeature].desc}</div>
            <div className="fdp-detail" style={{color:features[activeFeature].color}}>{features[activeFeature].detail}</div>
          </div>
        </div>
      </section>

      {/* VISA SECTION */}
      <section className="visa-section" id="visa">
        <div className="visa-inner">
          <div>
            <div className="section-eyebrow" style={{textAlign:"left",color:"#f87171"}}>For international job seekers</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,3.5vw,40px)",fontWeight:900,lineHeight:1.15,letterSpacing:"-1px",marginBottom:16}}>Never apply to<br/>a job that won't <em style={{fontStyle:"italic",color:"#f87171"}}>sponsor you</em></h2>
            <p style={{fontSize:14,color:"rgba(255,255,255,0.38)",lineHeight:1.8,marginBottom:24,maxWidth:420}}>Vegaply reads every job description for visa language. You'll know instantly if a role is H1B friendly, requires US citizenship, or demands security clearance — before you invest a minute of your time.</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{background:"rgba(52,211,153,0.12)",color:"#34d399",border:"1px solid rgba(52,211,153,0.25)",fontSize:12,fontWeight:700,padding:"7px 14px",borderRadius:8}}>✅ H1B Friendly</span>
              <span style={{background:"rgba(248,113,113,0.12)",color:"#f87171",border:"1px solid rgba(248,113,113,0.25)",fontSize:12,fontWeight:700,padding:"7px 14px",borderRadius:8}}>🇺🇸 Citizens Only</span>
              <span style={{background:"rgba(251,191,36,0.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.25)",fontSize:12,fontWeight:700,padding:"7px 14px",borderRadius:8}}>🔒 Clearance Required</span>
            </div>
          </div>
          <div className="visa-badges-demo">
            {[
              {title:"Senior ML Engineer",company:"OpenAI",visa:"✅ H1B Friendly",vc:"rgba(52,211,153,0.12)",vt:"#34d399",score:88,sc:"#34d399"},
              {title:"Security Architect",company:"Lockheed Martin",visa:"🔒 Clearance Required",vc:"rgba(251,191,36,0.12)",vt:"#fbbf24",score:72,sc:"#818cf8"},
              {title:"Policy Analyst",company:"US Dept. of Defense",visa:"🇺🇸 Citizens Only",vc:"rgba(248,113,113,0.12)",vt:"#f87171",score:65,sc:"#fbbf24"},
              {title:"Data Scientist",company:"Databricks",visa:"✅ H1B Friendly",vc:"rgba(52,211,153,0.12)",vt:"#34d399",score:91,sc:"#34d399"},
            ].map((j,i)=>(
              <div key={i} className="visa-badge-row">
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>{j.title}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{j.company}</div>
                </div>
                <span className="vbadge" style={{background:j.vc,color:j.vt,border:`1px solid ${j.vt}33`}}>{j.visa}</span>
                <span style={{fontSize:12,fontWeight:800,color:j.sc,minWidth:30,textAlign:"right"}}>{j.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how">
        <div className="section-eyebrow">Simple process</div>
        <h2 className="section-title">
          From signup to first<br/>
          <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>application in 5 minutes</em>
        </h2>
        <p className="section-sub" style={{marginBottom:80}}>Most users find a matched job and apply within 10 minutes of signing up. The setup is that fast.</p>
        <div className="how-grid">
          {steps.map((s,i)=>(
            <div key={i} className="how-step">
              <div className="how-num">
                <span style={{fontSize:24}}>{s.icon}</span>
                <div className="how-num-label">{s.num}</div>
              </div>
              <div className="how-step-title">{s.title}</div>
              <div className="how-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* KANBAN PREVIEW */}
      <section className="kanban-section" id="tracker">
        <div className="section-eyebrow">Application tracker</div>
        <h2 className="section-title">
          Your entire job search,<br/>
          <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#a78bfa,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>on one board</em>
        </h2>
        <p className="section-sub">Stop losing track of applications in a spreadsheet. Vegaply's kanban board shows your full pipeline at a glance — with response rates, progress stats, and motivational nudges built in.</p>

        <div className="kanban-board">
          {[
            {label:"SAVED",color:"#94a3b8",count:4,cards:[
              {title:"UX Researcher",co:"Figma",score:82,sc:"#34d399"},
              {title:"Design Lead",co:"Atlassian",score:71,sc:"#818cf8"},
            ]},
            {label:"APPLIED",color:"#818cf8",count:3,cards:[
              {title:"Sr. Designer",co:"Linear",score:91,sc:"#34d399"},
              {title:"Product Designer",co:"Loom",score:74,sc:"#818cf8"},
            ]},
            {label:"INTERVIEWING",color:"#fbbf24",count:2,cards:[
              {title:"Staff Engineer",co:"Stripe",score:88,sc:"#34d399"},
            ]},
            {label:"OFFER",color:"#34d399",count:1,cards:[
              {title:"Frontend Lead",co:"Vercel",score:95,sc:"#34d399"},
            ]},
            {label:"REJECTED",color:"#ef4444",count:1,cards:[
              {title:"Growth Mgr",co:"Notion",score:48,sc:"#f87171"},
            ]},
          ].map((col,i)=>(
            <div key={i} className="kanban-col">
              <div className="kanban-col-header" style={{color:col.color}}>
                {col.label}
                <span className="kanban-count">{col.count}</span>
              </div>
              {col.cards.map((c,j)=>(
                <div key={j} className="kanban-card">
                  <div className="kanban-card-title">{c.title}</div>
                  <div className="kanban-card-co">{c.co}</div>
                  <div className="kanban-card-score" style={{color:c.sc}}>
                    <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke={c.sc} strokeWidth="1.5" strokeDasharray={`${c.score*0.251} 100`} strokeLinecap="round"/></svg>
                    {c.score}% match
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-eyebrow">Real results</div>
        <h2 className="section-title">People are getting hired</h2>
        <p className="section-sub" style={{marginBottom:64}}>Early applicants are 3× more likely to get an interview. Here's what they say after using every feature.</p>
        <div className="testimonials-grid">
          {testimonials.map((t,i)=>{
            const color = t.score>=85?"#34d399":t.score>=70?"#818cf8":"#fbbf24";
            const r=18, circ=2*Math.PI*r;
            return (
              <div key={i} className="t-card">
                <div className="t-score-row">
                  <svg width="48" height="48" viewBox="0 0 48 48" style={{flexShrink:0}}>
                    <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
                    <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3"
                      strokeDasharray={circ} strokeDashoffset={circ-(t.score/100)*circ}
                      strokeLinecap="round" transform="rotate(-90 24 24)"/>
                    <text x="24" y="29" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="'DM Sans',sans-serif">{t.score}</text>
                  </svg>
                  <div>
                    <div className="t-score-text" style={{color}}>{t.score>=85?"Excellent Match":t.score>=70?"Strong Match":"Good Match"}</div>
                    <div className="t-score-sub">Resume match score</div>
                  </div>
                </div>
                <p className="t-quote">"{t.text}"</p>
                <div className="t-author">
                  <div className="t-avatar" style={{background:`linear-gradient(135deg,hsl(${220+i*30},60%,40%),hsl(${250+i*30},60%,55%))`}}>{t.avatar}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-role">{t.role} · {t.company}</div>
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
        <div className="cta-glow2"/>
        <div className="cta-inner">
          <div className="hero-badge" style={{margin:"0 auto 32px",display:"inline-flex"}}>
            <div className="hero-badge-dot"/>
            Join 3,800+ job seekers already using Vegaply
          </div>
          <h2 className="cta-title">
            The job you want<br/>was posted <em>today.</em>
          </h2>
          <p className="cta-sub">
            500 people are about to apply. You can be first — with the right resume, the right score, and the right timing. Set up takes 60 seconds.
          </p>
          <div className="cta-perks">
            {["Free forever","No credit card","60-second setup","Resume stored securely","Cancel anytime"].map((p,i)=>(
              <div key={i} className="cta-perk">
                <div className="cta-perk-dot">✓</div>
                {p}
              </div>
            ))}
          </div>
          <Link href="/signup" className="btn-primary" style={{fontSize:17,padding:"17px 52px"}}>
            Get Started — It's Free →
          </Link>
          <div className="cta-note">No spam · Unsubscribe anytime · Built for job seekers, not recruiters</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <a href="#" className="footer-logo">Vega<span>ply</span></a>
        <div className="footer-links">
          <a href="#features" className="footer-link">Features</a>
          <a href="#how" className="footer-link">How it works</a>
          <Link href="/login" className="footer-link">Sign in</Link>
          <Link href="/signup" className="footer-link">Get started</Link>
        </div>
        <div className="footer-copy">© 2026 Vegaply. Made for job seekers everywhere.</div>
      </footer>
    </>
  );
}
