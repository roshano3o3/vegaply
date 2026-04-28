'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mouse, setMouse] = useState({ x: -500, y: -500 })
  const [typedText, setTypedText] = useState('')
  const [morphWord, setMorphWord] = useState('scams.')
  const [countersStarted, setCountersStarted] = useState(false)
  const [c1, setC1] = useState('0')
  const [c2, setC2] = useState('0')
  const [c3, setC3] = useState('0×')

  const prefersReducedMotion = useReducedMotion()

  const fullCoverText = 'Dear Hiring Manager, I am excited to apply for the Senior ML Engineer role at Google. My 4 years of Python and TensorFlow experience aligns perfectly with your requirements...'
  const morphWords = ['scams.', 'vendors.', 'middlemen.', 'scrapers.']

  // Mouse tracking
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])

  // Typing animation
  useEffect(() => {
    let i = 0
    let resetting = false
    const interval = setInterval(() => {
      if (resetting) return
      if (i < fullCoverText.length) {
        setTypedText(fullCoverText.slice(0, i + 1))
        i++
      } else {
        resetting = true
        setTimeout(() => { i = 0; setTypedText(''); resetting = false }, 2000)
      }
    }, 35)
    return () => clearInterval(interval)
  }, [])

  // Morphing word
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % morphWords.length
      setMorphWord(morphWords[i])
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  // Star canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    let mx = W / 2, my = H / 2
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouse)
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      ox: 0, t: Math.random() * Math.PI * 2,
      tw: Math.random() * 0.006 + 0.002, wamp: Math.random() * 0.5 + 0.15,
      sp: Math.random() * 0.18 + 0.04, r: Math.random() * 0.85 + 0.15,
      o: Math.random() * 0.55 + 0.12,
      h: [240, 260, 280, 310][Math.floor(Math.random() * 4)]
    }))
    stars.forEach(s => { s.ox = s.x })
    let raf: number
    const loop = () => {
      ctx.clearRect(0, 0, W, H)
      stars.forEach(s => {
        s.t += s.tw; s.x = s.ox + Math.sin(s.t) * s.wamp; s.y -= s.sp
        if (s.y < -5) { s.y = H + 5; s.ox = s.x = Math.random() * W }
        ctx.beginPath(); ctx.arc(s.x % W, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.h},75%,72%,${s.o})`; ctx.fill()
      })
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 85) {
            ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y)
            ctx.strokeStyle = `rgba(130,120,255,${(1 - d / 85) * 0.07})`; ctx.lineWidth = 0.4; ctx.stroke()
          }
        }
      }
      stars.forEach(s => {
        const dx = s.x - mx, dy = s.y - my, d = Math.sqrt(dx * dx + dy * dy)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(mx, my)
            ctx.strokeStyle = `rgba(245,158,11,${(1 - d / 120) * 0.22})`; ctx.lineWidth = 0.5; ctx.stroke()
        }
      })
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMouse) }
  }, [])

  // Counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !countersStarted) {
        setCountersStarted(true)
        const animCount = (setter: (v: string) => void, target: number, suffix = '', dur = 2000) => {
          let start: number | null = null
          const step = (ts: number) => {
            if (!start) start = ts
            const p = Math.min((ts - start) / dur, 1), ease = 1 - Math.pow(1 - p, 4)
            setter(Math.round(ease * target).toLocaleString() + suffix)
            if (p < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
        animCount(setC1, 750)
        animCount(setC2, 24, 'h')
        animCount(setC3, 3, 'min')
      }
    }, { threshold: 0.3 })
    const el = document.getElementById('counters-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [countersStarted])

  // Score ring animation
  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll('.arc').forEach((a: Element) => {
        const el = a as SVGElement
        const t = parseFloat(el.dataset.t || '50')
        el.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.34,1,.64,1)'
        el.style.strokeDashoffset = String(t)
      })
    }, 1300)
  }, [])

  // Scroll reveal
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' })
    document.querySelectorAll('.reveal').forEach(r => io.observe(r))
    return () => io.disconnect()
  }, [])

  // Feature card glow
  useEffect(() => {
    const feats = document.querySelectorAll('.feat')
    feats.forEach(f => {
      f.addEventListener('mousemove', (e: Event) => {
        const me = e as MouseEvent
        const r = (f as HTMLElement).getBoundingClientRect()
        ;(f as HTMLElement).style.setProperty('--fx', ((me.clientX - r.left) / r.width * 100) + '%')
        ;(f as HTMLElement).style.setProperty('--fy', ((me.clientY - r.top) / r.height * 100) + '%')
      })
    })
  }, [])

  // 3D tilt cards
  useEffect(() => {
    const cards = document.querySelectorAll('[data-card]')
    cards.forEach(card => {
      const el = card as HTMLElement
      const glare = el.querySelector('.tilt-glare') as HTMLElement
      let raf: number | null = null
      let targetRX = 0, targetRY = 0, currentRX = 0, currentRY = 0
      let isHovered = false
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t
      const animate = () => {
        currentRX = lerp(currentRX, targetRX, 0.1)
        currentRY = lerp(currentRY, targetRY, 0.1)
        el.style.transform = `perspective(1200px) rotateX(${currentRX}deg) rotateY(${currentRY}deg) scale(${isHovered ? 1.035 : 1})`
        if (isHovered || Math.abs(currentRX) > 0.05 || Math.abs(currentRY) > 0.05) {
          raf = requestAnimationFrame(animate)
        } else {
          el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'
          raf = null
        }
      }
      el.addEventListener('mousemove', e => {
        const me = e as MouseEvent
        const rect = el.getBoundingClientRect()
        targetRY = ((me.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 12
        targetRX = -((me.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 10
        const gx = ((me.clientX - rect.left) / rect.width * 100).toFixed(1)
        const gy = ((me.clientY - rect.top) / rect.height * 100).toFixed(1)
        if (glare) { glare.style.setProperty('--gx', gx + '%'); glare.style.setProperty('--gy', gy + '%') }
        if (!raf) raf = requestAnimationFrame(animate)
      })
      el.addEventListener('mouseenter', () => {
        isHovered = true
        el.style.boxShadow = '0 40px 80px rgba(0,0,0,.55), 0 0 40px rgba(245,158,11,.15)'
        if (!raf) raf = requestAnimationFrame(animate)
      })
      el.addEventListener('mouseleave', () => {
        isHovered = false; targetRX = 0; targetRY = 0; el.style.boxShadow = ''
        if (!raf) raf = requestAnimationFrame(animate)
      })
    })
  }, [])

  const tickData = [
    "5 job sources combined",
    "70+ H1B sponsors verified",
    "AI-powered resume matching",
    "Real-time job updates",
    "Auto cover letter generation",
    "Direct ATS applications",
    "Built for F-1 students",
  ]

  const activityItems = [
    '🔥 Someone in Austin applied to ML Engineer at Stripe · 2m ago',
    '✅ Someone in NYC got an interview at Figma · 5m ago',
    '⚡ Someone in Seattle found H1B role at Microsoft · 8m ago',
    '🎉 Someone in Boston received an offer · 12m ago',
    '🔥 Someone in Chicago applied to Data Scientist · 15m ago',
    '✅ Someone in LA got interview at Notion · 18m ago',
  ]

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
          --danger:  #ef4444;
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
          --radius-full: 9999px;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
          --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
          --shadow-lg: 0 12px 32px rgba(0,0,0,0.5);
          --shadow-glow-gold: 0 0 24px rgba(245,158,11,0.20);
          --shadow-glow-cyan: 0 0 24px rgba(6,182,212,0.20);
          --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
          --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
          --dur-fast:  120ms;
          --dur-base:  200ms;
          --dur-slow:  400ms;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{background:var(--bg-page);font-family:'DM Sans',sans-serif;color:var(--text-primary);overflow-x:hidden;}
        canvas#bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
        .noise{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");background-size:200px 200px;}
        .wrap{position:relative;z-index:10;}

        /* NAV */
        nav{display:flex;align-items:center;justify-content:space-between;padding:0 52px;height:56px;background:var(--bg-surface);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border-subtle);position:sticky;top:0;z-index:100;}
        .logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--text-primary);}
        .logo-text{font-size:18px;font-weight:800;letter-spacing:-0.5px;line-height:1;}
        .logo-text span{font-style:italic;background:linear-gradient(135deg,var(--gold),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .nav-links{display:flex;gap:32px;list-style:none;}
        .nav-links a{font-size:13px;color:var(--text-tertiary);text-decoration:none;transition:color var(--dur-base) var(--ease-out);}
        .nav-links a:hover{color:var(--text-primary);}
        .nav-right{display:flex;gap:12px;align-items:center;}
        .nav-signin{font-size:13px;color:var(--text-tertiary);text-decoration:none;transition:color var(--dur-base) var(--ease-out);padding:8px 16px;}
        .nav-signin:hover{color:var(--text-primary);}
        .nav-btn{background:var(--gold);color:#1a1a1f;border:none;padding:8px 20px;border-radius:var(--radius-md);font-size:13px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all var(--dur-base) var(--ease-out);text-decoration:none;display:inline-block;box-shadow:var(--shadow-glow-gold);}
        .nav-btn:hover{background:var(--gold-hover);box-shadow:0 6px 24px var(--gold-glow);}

        /* HERO */
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 60px;position:relative;overflow:hidden;background:var(--bg-page);}
        .orb-1{position:absolute;top:-10%;right:-5%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,var(--gold-glow),transparent 70%);pointer-events:none;animation:ambientFloat 10s ease-in-out infinite;}
        .orb-2{position:absolute;bottom:0;left:-10%;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,var(--cyan-glow),transparent 70%);pointer-events:none;animation:ambientFloat 14s ease-in-out infinite reverse;}
        @keyframes ambientFloat{0%,100%{transform:scale(1) translate(0,0);}33%{transform:scale(1.08) translate(8px,-12px);}66%{transform:scale(0.96) translate(-6px,8px);}}

        .pill{display:inline-flex;align-items:center;gap:8px;background:var(--gold-subtle);border:1px solid rgba(245,158,11,.22);border-radius:var(--radius-full);padding:6px 18px;font-size:12px;font-weight:500;color:var(--gold);letter-spacing:.4px;margin-bottom:36px;}
        .pdot{width:7px;height:7px;background:var(--gold);border-radius:50%;animation:pdotAnim 1.8s ease infinite;}
        @keyframes pdotAnim{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(.5);opacity:.3;}}

        .hero-h1{font-family:'Playfair Display',serif;font-size:clamp(42px,5vw,72px);font-weight:800;line-height:1.1;letter-spacing:-2px;max-width:940px;}
        .grad-word{display:inline-block;background:linear-gradient(135deg,var(--gold) 0%,var(--gold-hover) 40%,var(--cyan) 75%,var(--cyan-hover) 100%);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:gflow 5s linear infinite;}
        @keyframes gflow{0%{background-position:0% 50%;}100%{background-position:300% 50%;}}

        .hero-sub{font-size:18px;font-weight:400;color:var(--text-secondary);max-width:520px;margin:26px auto 0;line-height:1.7;}
        .hero-btns{display:flex;align-items:center;gap:14px;margin-top:42px;flex-wrap:wrap;justify-content:center;}

        .btn-primary{position:relative;background:var(--gold);color:#1a1a1f;border:none;padding:16px 36px;border-radius:var(--radius-lg);font-size:16px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;overflow:hidden;transition:all var(--dur-base) var(--ease-out);box-shadow:var(--shadow-glow-gold);text-decoration:none;display:inline-block;}
        .btn-primary::after{content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);animation:sheen 3.5s 1.5s ease infinite;}
        @keyframes sheen{0%{left:-100%;}45%,100%{left:160%;}}
        .btn-primary:hover{background:var(--gold-hover);box-shadow:0 8px 40px var(--gold-glow);transform:translateY(-1px);}

        .btn-ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border-normal);padding:16px 36px;border-radius:var(--radius-lg);font-size:16px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all var(--dur-base) var(--ease-out);text-decoration:none;display:inline-block;}
        .btn-ghost:hover{border-color:var(--border-strong);color:var(--text-primary);}

        .av-row{display:flex;align-items:center;gap:14px;margin-top:46px;flex-wrap:wrap;justify-content:center;}
        .av-stack{display:flex;}
        .av{width:33px;height:33px;border-radius:50%;border:2px solid var(--bg-page);margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}
        .av:first-child{margin-left:0;}
        .a1{background:linear-gradient(135deg,var(--gold),var(--gold-hover));}
        .a2{background:linear-gradient(135deg,var(--gold),var(--cyan));}
        .a3{background:linear-gradient(135deg,var(--cyan),var(--cyan-hover));}
        .a4{background:linear-gradient(135deg,var(--gold),var(--gold-hover));}
        .av-txt{font-size:13px;color:var(--text-tertiary);}
        .av-txt strong{color:var(--text-secondary);font-weight:500;}
        .stars{color:var(--gold);font-size:12px;display:block;}

        /* CARD STACK */
        .card-stack{position:relative;width:420px;height:200px;margin:64px auto 0;}
        .stack-card{position:absolute;width:340px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:22px;backdrop-filter:blur(20px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}
        .stack-card:nth-child(1){transform:rotate(-5deg) translateX(-10px);z-index:1;top:24px;left:0;}
        .stack-card:nth-child(2){transform:rotate(0deg);z-index:3;top:0;left:40px;border-color:rgba(245,158,11,0.35);background:var(--gold-subtle);box-shadow:0 20px 60px var(--gold-glow);}
        .stack-card:nth-child(3){transform:rotate(5deg) translateX(10px);z-index:1;top:24px;left:80px;}
        .stack-card:hover{transform:rotate(0deg) translateY(-8px) scale(1.02)!important;z-index:10!important;}

        /* COUNTERS */
        .counters{display:flex;gap:18px;margin-top:56px;flex-wrap:wrap;justify-content:center;}
        .ctr{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:22px 28px;text-align:center;position:relative;overflow:hidden;transition:transform var(--dur-slow) var(--ease-out),border-color var(--dur-base) var(--ease-out);min-width:120px;}
        .ctr:hover{transform:translateY(-4px);border-color:rgba(245,158,11,.28);}
        .ctr::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,158,11,.45),transparent);}
        .ctr-n{font-family:'Playfair Display',serif;font-size:32px;font-weight:800;color:var(--text-primary);display:block;}
        .ctr-l{font-size:12px;color:var(--text-tertiary);margin-top:4px;letter-spacing:1px;text-transform:uppercase;}

        /* TICKER */
        .ticker-wrap{overflow:hidden;padding:13px 0;border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);position:relative;}
        .ticker-wrap::before,.ticker-wrap::after{content:'';position:absolute;top:0;bottom:0;width:100px;z-index:2;pointer-events:none;}
        .ticker-wrap::before{left:0;background:linear-gradient(90deg,var(--bg-page),transparent);}
        .ticker-wrap::after{right:0;background:linear-gradient(270deg,var(--bg-page),transparent);}
        .ticker-inner{display:flex;width:max-content;animation:tick 35s linear infinite;}
        @keyframes tick{from{transform:translateX(0);}to{transform:translateX(-50%);}}
        .t-item{display:flex;align-items:center;gap:10px;padding:0 28px;font-size:13px;color:var(--text-tertiary);white-space:nowrap;font-weight:300;}
        .t-name{color:var(--text-secondary);font-weight:500;}
        .t-dot{width:4px;height:4px;border-radius:50%;background:var(--gold);flex-shrink:0;}

        /* ACTIVITY FEED */
        .activity-feed{max-width:600px;margin:0 auto;height:140px;overflow:hidden;position:relative;}
        .activity-feed::before{content:'';position:absolute;top:0;left:0;right:0;height:40px;z-index:2;background:linear-gradient(180deg,var(--bg-page),transparent);}
        .activity-feed::after{content:'';position:absolute;bottom:0;left:0;right:0;height:40px;z-index:2;background:linear-gradient(0deg,var(--bg-page),transparent);}
        .activity-inner{display:flex;flex-direction:column;gap:10px;animation:feedScroll 14s linear infinite;}
        @keyframes feedScroll{0%{transform:translateY(0);}100%{transform:translateY(-50%);}}
        .activity-item{display:flex;align-items:center;gap:10px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-full);padding:8px 16px;font-size:12px;color:var(--text-secondary);white-space:nowrap;}
        .activity-dot{width:6px;height:6px;border-radius:50%;background:var(--success);flex-shrink:0;animation:pulse 2s ease infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.8);}}

        /* SECTIONS */
        .section{padding:100px 52px;max-width:1200px;margin:0 auto;}
        .eyebrow{font-size:11px;font-weight:600;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:14px;}
        .sec-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,60px);font-weight:700;line-height:1.05;letter-spacing:-1.5px;}
        .sec-title em{font-style:italic;background:linear-gradient(135deg,var(--gold),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}

        /* 3D TILT CARDS */
        .how-section{padding-top:100px;padding-bottom:120px;}
        .how-smallline{font-size:14px;color:rgba(255,255,255,0.72);margin-top:24px;letter-spacing:0.04em;}
        .how-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center;margin-top:42px;position:relative;}
        .how-left{position:relative;}
        .how-scene{position:relative;min-height:600px;display:flex;justify-content:center;align-items:center;padding:14px;}
        .how-central{position:relative;width:100%;max-width:520px;padding:34px;display:flex;flex-direction:column;gap:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:32px;backdrop-filter:blur(28px);box-shadow:0 40px 100px rgba(245,158,11,0.14);z-index:2;overflow:hidden;}
        .how-central::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 18% 24%,rgba(245,158,11,0.18),transparent 35%),radial-gradient(circle at 82% 78%,rgba(6,182,212,0.16),transparent 32%);pointer-events:none;mix-blend-mode:screen;}
        .how-card-header{display:flex;align-items:center;justify-content:space-between;gap:18px;position:relative;z-index:1;}
        .how-pill{font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:8px 14px;border-radius:999px;background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.08));color:var(--gold);}
        .how-search{height:52px;display:flex;align-items:center;padding:0 20px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.78);font-size:15px;font-weight:500;letter-spacing:0.01em;}
        .how-job{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-top:1px solid rgba(255,255,255,0.06);}
        .how-job:first-child{border-top:none;}
        .how-job-left{display:flex;gap:14px;align-items:center;min-width:0;}
        .how-job-icon{width:44px;height:44px;border-radius:16px;background:rgba(245,158,11,0.14);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}
        .how-job-detail{display:flex;flex-direction:column;gap:4px;min-width:0;}
        .how-job-role{font-size:15px;font-weight:700;color:#fff;min-width:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;}
        .how-job-company{font-size:12px;color:var(--text-secondary);}
        .how-job-meta{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-secondary);}
        .how-badge{font-size:11px;font-weight:700;padding:6px 12px;border-radius:999px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.18);color:var(--gold);}
        .how-ring{position:relative;width:48px;height:48px;display:grid;place-items:center;}
        .how-ring svg{position:absolute;top:0;left:0;width:48px;height:48px;}
        .how-ring-text{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff;}
        .how-floating{position:absolute;width:244px;padding:24px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:28px;backdrop-filter:blur(24px);box-shadow:0 38px 90px rgba(0,0,0,0.22);transform-style:preserve-3d;transition:transform 300ms ease,box-shadow 300ms ease;will-change:transform;}
        .how-floating:hover{transform:translateY(-6px) scale(1.03);box-shadow:0 40px 98px rgba(245,158,11,0.18);}
        .how-floating h3{font-size:15px;font-weight:700;color:#fff;margin:0 0 8px;line-height:1.35;}
        .how-floating p{font-size:13px;color:var(--text-secondary);line-height:1.7;margin:0;}
        .how-right{display:grid;gap:22px;position:relative;}
        .how-right::before{content:'';position:absolute;top:-18px;right:-12px;width:220px;height:220px;border-radius:50%;background:rgba(245,158,11,0.08);filter:blur(50px);pointer-events:none;}
        .how-right::after{content:'';position:absolute;bottom:-12px;left:-20px;width:240px;height:240px;border-radius:50%;background:rgba(6,182,212,0.08);filter:blur(50px);pointer-events:none;}
        .how-chat{display:flex;flex-direction:column;gap:18px;padding:22px;position:relative;z-index:1;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:44px;backdrop-filter:blur(30px);}
        .how-chat-card{position:relative;max-width:100%;min-width:240px;width:min(100%,560px);padding:26px 28px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.12);border-radius:34px;box-shadow:0 30px 80px rgba(0,0,0,0.24);overflow:hidden;}
        .how-chat-card::before{content:'';position:absolute;top:18px;left:22px;width:14px;height:14px;border-radius:50%;background:var(--gold);box-shadow:0 0 18px rgba(245,158,11,0.35);}
        .how-chat-card.user{margin-left:auto;align-self:flex-end;background:linear-gradient(180deg,rgba(6,182,212,0.18),rgba(255,255,255,0.03));border-color:rgba(6,182,212,0.18);box-shadow:0 30px 90px rgba(6,182,212,0.16);}
        .how-chat-card.user::before{left:auto;right:22px;background:var(--cyan);box-shadow:0 0 18px rgba(6,182,212,0.35);}
        .how-chat-card.special{background:linear-gradient(135deg,rgba(245,158,11,0.18),rgba(6,182,212,0.12));border-color:rgba(245,158,11,0.24);box-shadow:0 32px 96px rgba(245,158,11,0.2);}
        .how-chat-card.special .how-chat-title{color:#fff;}
        .how-chat-card::after{content:'';position:absolute;bottom:-8px;left:32px;width:calc(100% - 64px);height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent);opacity:0.45;}
        .how-chat-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:#fff;margin-bottom:8px;}
        .how-chat-title span{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.08);}
        .how-chat-text{font-size:15px;color:rgba(255,255,255,0.78);line-height:1.85;}
        .how-chat-meta{display:flex;align-items:center;gap:10px;font-size:12px;color:rgba(255,255,255,0.62);margin-top:12px;}
        .how-chat-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.75);font-weight:600;}
        .how-feature-row{display:grid;grid-template-columns:52px auto;gap:18px;padding:22px 24px;border-radius:24px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);transition:transform 300ms ease,box-shadow 300ms ease,background 300ms ease;}
        .how-feature-row:hover{transform:translateY(-3px);box-shadow:0 20px 45px rgba(245,158,11,0.12);background:rgba(255,255,255,0.07);}
        .how-feature-icon{width:52px;height:52px;border-radius:18px;background:rgba(245,158,11,0.14);display:flex;align-items:center;justify-content:center;font-size:21px;color:var(--gold);}
        .how-feature-copy{display:flex;flex-direction:column;gap:8px;}
        .how-feature-title{font-size:16px;font-weight:700;color:#fff;}
        .how-feature-desc{font-size:14px;color:var(--text-secondary);line-height:1.7;}
        @media(max-width:1024px){.how-grid{grid-template-columns:1fr;gap:38px;}.how-scene{min-height:auto;}.how-central{max-width:520px;margin:0 auto;}.how-left{order:2;}.how-right{order:1;}.how-section{padding-top:80px;padding-bottom:90px;}}
        @media(max-width:768px){.how-section{padding:70px 20px;}.how-grid{gap:28px;}.how-floating{display:none;}.how-central{max-width:360px;}.how-feature-row{grid-template-columns:1fr;}.how-feature-icon{width:46px;height:46px;}.how-section h2{font-size:clamp(28px,5vw,42px);}} 
        .cards-scene{display:flex;gap:22px;margin-top:58px;perspective:1200px;flex-wrap:wrap;}
        .tilt-card{flex:1;min-width:260px;position:relative;border-radius:22px;transform-style:preserve-3d;transform:perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1);transition:box-shadow var(--dur-base) var(--ease-out);cursor:pointer;will-change:transform;}
        .tilt-inner{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:22px;padding:30px;position:relative;overflow:hidden;height:100%;transition:border-color var(--dur-base) var(--ease-out),background var(--dur-base) var(--ease-out);}
        .tilt-glare{position:absolute;inset:0;border-radius:22px;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.12) 0%,rgba(255,255,255,.04) 30%,transparent 65%);pointer-events:none;opacity:0;transition:opacity var(--dur-base) var(--ease-out);}
        .tilt-card:hover .tilt-glare{opacity:1;}
        .tilt-card:hover .tilt-inner{border-color:rgba(245,158,11,.32);background:var(--gold-subtle);}
        .tilt-card::after{content:'';position:absolute;inset:-1px;border-radius:23px;background:linear-gradient(135deg,var(--gold-glow),var(--cyan-glow),transparent 60%);opacity:0;transition:opacity var(--dur-base) var(--ease-out);z-index:-1;filter:blur(8px);}
        .tilt-card:hover::after{opacity:.6;}
        .hot-badge{position:absolute;top:16px;right:16px;background:var(--danger);color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:var(--radius-full);letter-spacing:.5px;}
        .co-logo{width:44px;height:44px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;margin-bottom:14px;}
        .cl1{background:var(--gold-subtle);color:var(--gold);}
        .cl2{background:rgba(236,72,153,.2);color:#f472b6;}
        .cl3{background:var(--cyan-subtle);color:var(--cyan);}
        .j-title{font-size:17px;font-weight:700;margin-bottom:6px;letter-spacing:-.3px;}
        .j-co{font-size:13px;color:var(--text-tertiary);margin-bottom:16px;font-weight:300;}
        .badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;}
        .b{font-size:10px;font-weight:600;padding:4px 10px;border-radius:var(--radius-full);letter-spacing:.3px;}
        .ba{background:var(--gold-subtle);color:var(--gold);border:1px solid rgba(245,158,11,.2);}
        .bg{background:var(--cyan-subtle);color:var(--cyan);border:1px solid rgba(6,182,212,.2);}
        .bi{background:var(--bg-hover);color:var(--text-secondary);border:1px solid var(--border-subtle);}
        .match-row{display:flex;align-items:center;gap:14px;}
        .mpct{font-size:20px;font-weight:800;font-family:'Playfair Display',serif;}
        .mlbl{font-size:11px;color:var(--text-tertiary);margin-top:2px;}
        .float-label{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:var(--gold-subtle);border:1px solid rgba(245,158,11,.25);color:var(--gold);font-size:11px;padding:5px 14px;border-radius:var(--radius-full);white-space:nowrap;opacity:0;transition:opacity var(--dur-base) var(--ease-out),bottom var(--dur-base) var(--ease-out);}
        .tilt-card:hover .float-label{opacity:1;bottom:-20px;}

        /* FEATURES */
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .feat{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:28px;position:relative;overflow:hidden;cursor:default;transition:all var(--dur-base) var(--ease-out);}
        .feat:hover{background:var(--bg-surface);border-color:var(--border-normal);transform:translateY(-2px);}
        .feat-glow{position:absolute;inset:0;background:radial-gradient(circle at var(--fx,50%) var(--fy,50%),var(--gold-subtle),transparent 55%);opacity:0;transition:opacity var(--dur-slow) var(--ease-out);pointer-events:none;border-radius:var(--radius-xl);}
        .feat:hover .feat-glow{opacity:1;}
        .feat-icon{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:18px;}
        .i1{background:var(--gold-subtle);}
.i2{background:var(--gold-subtle);}
        .i3{background:var(--cyan-subtle);}
        .i4{background:var(--gold-subtle);}
        .i5{background:var(--cyan-subtle);}
.i6{background:var(--cyan-subtle);}
        .feat-name{font-size:18px;font-weight:700;margin-bottom:8px;color:var(--text-primary);}
        .feat-desc{font-size:14px;font-weight:400;color:var(--text-tertiary);line-height:1.7;}
        .feat-tag{display:inline-block;margin-top:13px;background:var(--gold-subtle);border:1px solid rgba(245,158,11,.18);color:var(--gold);font-size:11px;padding:3px 10px;border-radius:var(--radius-full);font-weight:500;}

        /* TESTIMONIALS */
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .testi-card{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:28px;transition:transform var(--dur-base) var(--ease-out),border-color var(--dur-base) var(--ease-out);}
        .testi-card:hover{transform:translateY(-4px);border-color:rgba(245,158,11,.25);}
        .testi-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;margin-bottom:16px;}
        .testi-quote{font-size:14px;color:var(--text-secondary);line-height:1.7;font-weight:300;margin-bottom:16px;}
        .testi-name{font-size:13px;font-weight:600;color:var(--text-primary);}
        .testi-role{font-size:11px;color:var(--text-tertiary);margin-top:2px;}
        .testi-stars{color:var(--gold);font-size:12px;margin-bottom:12px;}

        /* PRICING */
        .pricing-section{padding:100px 52px;max-width:1200px;margin:0 auto;text-align:center;}
        .pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:52px;max-width:800px;margin-left:auto;margin-right:auto;}
        .pricing-card{border-radius:24px;padding:40px;text-align:left;position:relative;overflow:hidden;}
        .pricing-free{background:var(--bg-elevated);border:1px solid var(--border-subtle);}
        .pricing-pro{background:var(--gold-subtle);border:1px solid rgba(245,158,11,0.4);box-shadow:0 20px 60px var(--gold-glow);}
        .pricing-pro::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,158,11,0.8),transparent);}
        .pricing-badge{display:inline-block;background:var(--gold);color:#1a1a1f;font-size:10px;font-weight:700;padding:4px 12px;border-radius:var(--radius-full);letter-spacing:1px;margin-bottom:20px;}
        .pricing-price{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;line-height:1;margin-bottom:4px;}
        .pricing-period{font-size:13px;color:var(--text-tertiary);margin-bottom:24px;}
        .pricing-features{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px;}
        .pricing-features li{font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:10px;font-weight:300;}
        .pricing-features li span{color:var(--success);font-size:15px;flex-shrink:0;}
        .pricing-features li.locked{color:var(--text-tertiary);}
        .pricing-features li.locked span{color:var(--text-tertiary);}
        @media(max-width:768px){.pricing-grid{grid-template-columns:1fr;}.pricing-section{padding:60px 20px;}}

        /* CTA */
        .cta-wrap{text-align:center;padding:110px 52px;position:relative;}
        .cta-radial{position:absolute;width:900px;height:500px;background:radial-gradient(ellipse,var(--gold-glow) 0%,transparent 68%);left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;}
        .cta-h{font-family:'Playfair Display',serif;font-size:clamp(40px,6vw,76px);font-weight:900;letter-spacing:-2.5px;line-height:1.0;max-width:700px;margin:0 auto 28px;}
        .cta-h em{font-style:italic;background:linear-gradient(135deg,var(--gold),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .cta-sub{font-size:16px;color:var(--text-secondary);font-weight:300;max-width:440px;margin:0 auto 38px;line-height:1.75;}
        .cta-trust{font-size:12px;color:var(--text-tertiary);margin-top:20px;letter-spacing:.3px;}

        /* FOOTER */
        footer{border-top:1px solid var(--border-subtle);padding:34px 52px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;}
        .fc{font-size:13px;color:var(--text-tertiary);}
        .fl{display:flex;gap:22px;}
        .fl a{font-size:13px;color:var(--text-tertiary);text-decoration:none;transition:color var(--dur-base) var(--ease-out);}
        .fl a:hover{color:var(--text-secondary);}

        /* GLOW LINE */
        .glow-line{height:1px;max-width:1200px;margin:0 auto;background:linear-gradient(90deg,transparent,var(--gold-glow),transparent);}

        /* REVEAL */
        .reveal{opacity:0;transform:translateY(24px);transition:opacity 600ms cubic-bezier(0.16,1,0.3,1),transform 600ms cubic-bezier(0.16,1,0.3,1);will-change:opacity,transform;}
        .reveal.in{opacity:1;transform:none;}
        @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none;}}

        /* BLINK */
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(26px);}to{opacity:1;transform:none;}}
        @keyframes gradient-sweep{0%{background-position:100% 50%;}100%{background-position:0% 50%;}}
        @keyframes shimmer{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
        @keyframes glow-pulse{0%,100%{text-shadow:0 0 30px rgba(245,158,11,0);transform:scale(1);}50%{text-shadow:0 0 40px rgba(245,158,11,0.3);transform:scale(1.01);}}
        @keyframes glow-pulse-strong{0%,100%{text-shadow:0 0 20px rgba(245,158,11,0),0 0 40px rgba(245,158,11,0);transform:scale(1);}50%{text-shadow:0 0 30px rgba(245,158,11,0.4),0 0 60px rgba(245,158,11,0.2);transform:scale(1.015);}}
        @keyframes bullet-in{to{opacity:1;transform:translateX(0);}}
        @keyframes hero-fade-up-anim{to{opacity:1;transform:translateY(0);}}
        @keyframes card-shimmer{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
        .hero-content{display:flex;flex-direction:column;align-items:center;width:100%;max-width:780px;}
        .hero-pill{display:inline-flex;align-items:center;gap:8px;background:var(--gold-subtle);border:1px solid rgba(245,158,11,.22);border-radius:var(--radius-full);padding:6px 18px;font-size:12px;font-weight:500;color:var(--gold);letter-spacing:.4px;margin-bottom:36px;}
        .hero-pill-dot{width:7px;height:7px;background:var(--gold);border-radius:50%;animation:pdotAnim 1.8s ease infinite;flex-shrink:0;}
        .hero-headline-sweep{background:linear-gradient(90deg,#f5f5f7 0%,#f5f5f7 25%,#fbbf24 45%,#f59e0b 50%,#fbbf24 55%,#f5f5f7 75%,#f5f5f7 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:gradient-sweep 5s cubic-bezier(0.16,1,0.3,1) 0.4s infinite;}
        .hero-bullet{opacity:0;transform:translateX(-12px);animation:bullet-in 600ms cubic-bezier(0.16,1,0.3,1) forwards;}
        .hero-prepared{display:inline-block;animation:glow-pulse-strong 3.5s ease-in-out 2s infinite;}
        .hero-closing-shimmer{background:linear-gradient(90deg,rgba(245,245,247,0.6) 0%,#f59e0b 50%,rgba(245,245,247,0.6) 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 6s ease-in-out infinite;}
        .hero-fade-up{opacity:0;transform:translateY(16px);animation:hero-fade-up-anim 700ms cubic-bezier(0.16,1,0.3,1) forwards;}
        .hero-morph{background:linear-gradient(135deg,#f59e0b 0%,#06b6d4 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;display:inline-block;transition:opacity 300ms ease;}
        .feat-card{background:linear-gradient(135deg,rgba(245,158,11,0.04) 0%,rgba(6,182,212,0.04) 100%);border:1px solid rgba(245,245,247,0.08);border-radius:14px;padding:18px 22px;display:flex;align-items:center;gap:16px;opacity:0;transform:translateY(20px);animation:hero-fade-up-anim 700ms cubic-bezier(0.16,1,0.3,1) forwards;transition:all 300ms cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;}
        .feat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.08) 50%,transparent 100%);background-size:200% 100%;background-position:-100% 0;transition:background-position 600ms ease;pointer-events:none;}
        .feat-card:hover{border-color:rgba(245,158,11,0.3);transform:translateY(-2px);box-shadow:0 8px 24px rgba(245,158,11,0.12);}
        .feat-card:hover::before{background-position:100% 0;}
        .feat-card .feat-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(6,182,212,0.12));border-radius:10px;flex-shrink:0;transition:transform 300ms cubic-bezier(0.16,1,0.3,1);margin-bottom:0;}
        .feat-card:hover .feat-icon{transform:scale(1.1) rotate(-4deg);}
        .feat-text{font-size:clamp(14px,1.5vw,16px);color:rgba(245,245,247,0.92);font-weight:500;line-height:1.5;}
        @media(prefers-reduced-motion:reduce){.hero-headline-sweep,.hero-bullet,.hero-prepared,.hero-closing-shimmer,.hero-fade-up,.hero-morph,.feat-card{animation:none !important;opacity:1 !important;transform:none !important;-webkit-text-fill-color:var(--text-primary,#f5f5f7) !important;transition:none !important;}}

        @media(max-width:1024px){
          .how-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
        @media(max-width:768px){
          .how-floating { display: none !important; }
          .how-central { margin: 0 auto; max-width: 320px; }
        }

        /* MOBILE */
        @media(max-width:768px){
          nav{padding:16px 20px;}
          .nav-links{display:none;}
          .section{padding:60px 20px;}
          .feat-grid{grid-template-columns:1fr;}
          .testi-grid{grid-template-columns:1fr;}
          .cards-scene{flex-direction:column;}
          .card-stack{width:100%;max-width:340px;}
          .counters{gap:12px;}
          footer{padding:24px 20px;}
          .cta-wrap{padding:60px 20px;}
        }
      `}</style>

      {/* Canvas background (kept for logic, hidden visually) */}
      <canvas ref={canvasRef} id="bg" style={{display:'none'}} />
      
      {/* Noise overlay */}
      <div className="noise" />
      
      {/* Cursor glow */}
      <div style={{
        position: 'fixed', left: mouse.x - 200, top: mouse.y - 200,
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 2,
        transition: 'left 0.15s ease, top 0.15s ease'
      }} />

      <div className="wrap">
        {/* NAV */}
        <nav>
          <Link href="/" className="logo">
            <div style={{width:30,height:30,background:'var(--gold)',borderRadius:9,border:'1px solid rgba(245,158,11,0.4)',boxShadow:'0 0 16px rgba(245,158,11,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 200 200"><path d="M100,76 L34,118 L66,113 Z" fill="var(--gold)"/><path d="M100,76 L166,118 L134,113 Z" fill="var(--gold-hover)"/><ellipse cx="100" cy="92" rx="8" ry="16" fill="var(--gold)"/><circle cx="100" cy="76" r="7" fill="var(--gold)"/><polygon points="100,66 107,62 100,61" fill="#fcd34d"/><line x1="96" y1="108" x2="88" y2="126" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round"/><line x1="100" y1="109" x2="100" y2="128" stroke="var(--cyan-hover)" strokeWidth="2" strokeLinecap="round"/><line x1="104" y1="108" x2="112" y2="126" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round"/><path d="M82,144 A18,18 0 0,1 118,144" fill="var(--gold)" opacity="0.6"/></svg>
            </div>
            <span className="logo-text">Vega<span>ply</span></span>
          </Link>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#stories">Stories</a></li>
          </ul>
          <div className="nav-right">
            <Link href="/login" className="nav-signin">Sign in</Link>
            <Link href="/signup" className="nav-btn">Get Started Free →</Link>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="orb-1" /><div className="orb-2" />
          
          <div className="hero-content">
            <div className="hero-pill">
              <span className="hero-pill-dot"></span>
              AI-powered · Now live at vegaply.com
            </div>

            <h1 style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(40px, 6vw, 72px)',
              lineHeight:1.05,
              fontWeight:700,
              letterSpacing:'-0.02em',
              margin:'0 0 16px 0',
              textAlign:'center'
            }}>
              <span className="hero-fade-up" style={{display:'block', animationDelay:'200ms', color:'rgba(245,245,247,0.92)'}}>
                Skip the
              </span>
              <span className="hero-fade-up hero-morph" style={{display:'block', animationDelay:'400ms'}}>
                {morphWord}
              </span>
            </h1>

            <h2 className="hero-fade-up" style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(36px, 5vw, 56px)',
              lineHeight:1.1,
              fontWeight:700,
              letterSpacing:'-0.02em',
              margin:'32px 0 20px 0',
              textAlign:'center',
              animationDelay:'700ms'
            }}>
              <span style={{display:'block'}}>Stop applying.</span>
              <span className="hero-headline-sweep" style={{display:'block'}}>Start getting interviews.</span>
            </h2>

            <p className="hero-fade-up" style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(18px, 2.2vw, 24px)',
              lineHeight:1.4,
              color:'rgba(245, 245, 247, 0.8)',
              margin:'0 0 36px 0',
              textAlign:'center',
              fontWeight:500,
              animationDelay:'1000ms'
            }}>
              Vegaply does your entire job search — better, faster, smarter.
            </p>

            <p className="hero-fade-up" style={{
              fontSize:'clamp(15px, 1.6vw, 17px)',
              lineHeight:1.6,
              color:'rgba(245, 245, 247, 0.7)',
              margin:'0 auto 20px auto',
              maxWidth:'640px',
              textAlign:'center',
              animationDelay:'1300ms'
            }}>
              While others spam-apply hoping something sticks, Vegaply is:
            </p>

            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',
              gap:'12px',
              maxWidth:'720px',
              margin:'0 auto 40px auto'
            }}>
              {[
                {icon:'⚡', text:'Scanning thousands of new jobs daily'},
                {icon:'🎯', text:'Matching them to your resume with AI'},
                {icon:'✍️', text:'Writing custom cover letters instantly'},
                {icon:'✓',  text:'Applying only to high-quality roles'}
              ].map((item, i) => (
                <div key={i} className="feat-card" style={{animationDelay:`${1500 + i * 130}ms`}}>
                  <div className="feat-icon">{item.icon}</div>
                  <div className="feat-text">{item.text}</div>
                </div>
              ))}
            </div>

            <p className="hero-fade-up" style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(28px, 3.6vw, 40px)',
              lineHeight:1.2,
              fontWeight:700,
              color:'#f5f5f7',
              margin:'32px 0 32px 0',
              textAlign:'center',
              animationDelay:'2200ms'
            }}>
              <span className="hero-prepared">You just show up prepared.</span>
            </p>

            <p className="hero-fade-up" style={{
              fontSize:'clamp(15px, 1.6vw, 17px)',
              lineHeight:1.6,
              color:'rgba(245, 245, 247, 0.65)',
              margin:'0 auto 32px auto',
              maxWidth:'640px',
              textAlign:'center',
              animationDelay:'2400ms'
            }}>
              After applying: track every application, know when to follow up, practice real interview questions, and find H1B sponsors without the guesswork.
            </p>

            <p className="hero-fade-up" style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(18px, 2vw, 22px)',
              lineHeight:1.4,
              fontStyle:'italic',
              margin:'0 0 48px 0',
              textAlign:'center',
              animationDelay:'2600ms'
            }}>
              <span className="hero-closing-shimmer">
                This isn&apos;t job searching. This is job hunting — automated.
              </span>
            </p>

            <motion.div className="hero-btns" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
              transition={{delay:1.05, duration:0.6}}>
              <Link href="/signup" className="btn-primary">Start free — find H1B jobs now</Link>
              <Link href="/login" className="btn-ghost">Sign in →</Link>
            </motion.div>

            <motion.div className="av-row" initial={{opacity:0}} animate={{opacity:1}}
              transition={{delay:1.2, duration:0.6}}>
              <div className="av-txt">
                ✓ 70+ verified H1B sponsors · No credit card · Cancel anytime
              </div>
            </motion.div>
          </div>
        </div>

        {/* TICKER */}
        <motion.div className="ticker-wrap" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
          <div className="ticker-inner">
            {[...tickData, ...tickData].map((d, i) => (
              <span key={i} className="t-item">
                <span className="t-dot"/>{d}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ACTIVITY FEED */}
        <motion.div style={{padding:'40px 24px',textAlign:'center'}} initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',letterSpacing:2,marginBottom:20,textTransform:'uppercase'}}>Live activity</div>
          <div className="activity-feed">
            <div className="activity-inner">
              {[...activityItems,...activityItems].map((item,i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot"/>{item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 3D TILT CARDS */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <div className="section reveal" id="features">
          <div className="eyebrow">Live job feed</div>
          <h2 className="sec-title">Jobs that are <em>actually</em> fresh.</h2>
          <div className="cards-scene">
            <div className="tilt-card" data-card>
              <div className="tilt-inner">
                <div className="tilt-glare"/>
                <div className="hot-badge">🔥 HOT</div>
                <div className="co-logo cl1">G</div>
                <div className="j-title">Senior ML Engineer</div>
                <div className="j-co">Google · Mountain View, CA</div>
                <div className="badges">
                  <span className="b ba">2h ago — still early!</span>
                  <span className="b bg">H1B Friendly</span>
                  <span className="b bi">$180k–220k</span>
                </div>
                <div className="match-row">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="var(--cyan)" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="6"/>
                  </svg>
                  <div><div className="mpct" style={{color:'var(--cyan)'}}>94%</div><div className="mlbl">Resume match</div></div>
                </div>
              </div>
              <div className="float-label">Apply in 1 click →</div>
            </div>

            <div className="tilt-card" data-card>
              <div className="tilt-inner">
                <div className="tilt-glare"/>
                <div className="co-logo cl2">A</div>
                <div className="j-title">Product Designer</div>
                <div className="j-co">Airbnb · Remote</div>
                <div className="badges">
                  <span className="b bg">Easy Apply</span>
                  <span className="b bi">$130k–160k</span>
                </div>
                <div className="match-row">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="var(--gold)" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="25"/>
                  </svg>
                  <div><div className="mpct" style={{color:'var(--gold)'}}>76%</div><div className="mlbl">Resume match</div></div>
                </div>
              </div>
              <div className="float-label">View full match →</div>
            </div>

            <div className="tilt-card" data-card>
              <div className="tilt-inner">
                <div className="tilt-glare"/>
                <div className="hot-badge">🔥 HOT</div>
                <div className="co-logo cl3">S</div>
                <div className="j-title">Staff Frontend Eng.</div>
                <div className="j-co">Stripe · New York, NY</div>
                <div className="badges">
                  <span className="b ba">4h ago — still early!</span>
                  <span className="b bi">$160k–200k</span>
                </div>
                <div className="match-row">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="var(--cyan)" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="12"/>
                  </svg>
                  <div><div className="mpct" style={{color:'var(--cyan)'}}>88%</div><div className="mlbl">Resume match</div></div>
                </div>
              </div>
              <div className="float-label">Prep interview →</div>
            </div>
          </div>
        </div>
        </motion.div>



        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <section className="section reveal how-section" id="how">
          <div style={{maxWidth: '840px', margin: '0 auto 42px'}}>
            <div className="eyebrow">HOW IT WORKS</div>
            <h2 className="sec-title" style={{maxWidth:'860px'}}>How Vegaply helps you apply <em>before everyone else</em></h2>
            <p style={{fontSize:16, color:'rgba(255,255,255,0.72)', lineHeight:1.8, margin:'22px 0 0', maxWidth:'740px'}}>
              Most job boards only show listings. Vegaply helps you find fresh roles, understand your match, tailor your resume, prepare for interviews, and track every application — from one smart dashboard.
            </p>
            <p className="how-smallline">LinkedIn shows jobs. Vegaply helps you decide, tailor, prepare, and apply faster.</p>
          </div>

          <div className="how-grid">
            <div className="how-left">
              <div className="how-scene">
                <motion.div className="how-central"
                  animate={prefersReducedMotion ? undefined : { y: [-8, 8, -8] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}>
                  <div className="how-card-header">
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',boxShadow:'0 0 12px rgba(245,158,11,0.4)'}} />
                      <div style={{display:'grid',gap:2}}>
                        <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--gold)'}}>Vegaply</span>
                        <span style={{fontSize:15,fontWeight:700,color:'#f5f5f7'}}>Vegaply Dashboard</span>
                      </div>
                    </div>
                    <div className="how-pill">● LIVE</div>
                  </div>

                  <div className="how-search">Search 10,000+ fresh jobs…</div>

                  <div className="how-job">
                    <div className="how-job-left">
                      <div className="how-job-icon">DA</div>
                      <div className="how-job-detail">
                        <div className="how-job-role">Data Analyst</div>
                        <div className="how-job-company">Stripe · Remote</div>
                      </div>
                    </div>
                    <div className="how-job-meta">
                      <span>94%</span>
                      <span className="how-badge">Hot</span>
                    </div>
                  </div>
                  <div className="how-job" style={{paddingTop:12}}>
                    <div className="how-job-left">
                      <div className="how-ring">
                        <svg viewBox="0 0 44 44" fill="none">
                          <circle cx="22" cy="22" r="16" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
                          <circle cx="22" cy="22" r="16" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray="100.5" strokeDashoffset="18" transform="rotate(-90 22 22)" />
                        </svg>
                        <div className="how-ring-text">94%</div>
                      </div>
                      <div className="how-job-detail">
                        <div className="how-job-role">Data Analyst</div>
                        <div className="how-job-company">Stripe · Remote</div>
                      </div>
                    </div>
                    <div className="how-job-meta">
                      <span className="how-badge">Hot</span>
                    </div>
                  </div>
                  <div className="how-job">
                    <div className="how-job-left">
                      <div className="how-job-icon">BA</div>
                      <div className="how-job-detail">
                        <div className="how-job-role">Business Analyst</div>
                        <div className="how-job-company">Deloitte · Dallas</div>
                      </div>
                    </div>
                    <div className="how-job-meta">
                      <span>88%</span>
                      <span className="how-badge">New</span>
                    </div>
                  </div>
                  <div className="how-job">
                    <div className="how-job-left">
                      <div className="how-job-icon">DE</div>
                      <div className="how-job-detail">
                        <div className="how-job-role">Data Engineer</div>
                        <div className="how-job-company">Capital One · Hybrid</div>
                      </div>
                    </div>
                    <div className="how-job-meta">
                      <span>76%</span>
                      <span className="how-badge">Early Bird</span>
                    </div>
                  </div>
                </motion.div>

                {[
                  {icon:'⚡',title:'Fresh Jobs',desc:'Posted in last 24h',style:{top:'-10%',left:'-8%'}},
                  {icon:'🤖',title:'AI Match Score',desc:'Know your fit instantly',style:{top:'4%',right:'-6%'}},
                  {icon:'✂️',title:'Tailored Resume',desc:'ATS keywords baked in',style:{top:'42%',left:'-6%'}},
                  {icon:'🎯',title:'Interview Prep',desc:'Likely Q&A generated',style:{bottom:'4%',right:'-8%'}},
                  {icon:'📊',title:'Tracker',desc:'Applied → Offer pipeline',style:{bottom:'-8%',left:'12%'}},
                ].map((card, idx) => (
                  <motion.div key={idx}
                    className="how-floating"
                    style={card.style}
                    animate={prefersReducedMotion ? undefined : { y: [-10, 10, -10], rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 5.5 + idx * 0.4, ease: 'easeInOut', delay: idx * 0.8 }}>
                    <h3>{card.icon} {card.title}</h3>
                    <p>{card.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="how-right">
              <div className="how-chat">
                {[
                  {icon:'🔍',title:'Smart job discovery',text:'Vegaply surfaces the roles with the highest fit, so you only spend time on what truly matters.'},
                  {icon:'✂️',title:'AI resume tailoring',text:'Your resume rewrites itself for each opening, matching keywords and tone to the job description.'},
                  {icon:'⚡',title:'One-click apply flow',text:'Submit applications, cover letters, and prep notes in a single, connected action.'},
                  {icon:'📈',title:'Live progress feed',text:'See every application stage, interview invite, and offer update from one central dashboard.'},
                  {icon:'🏁',title:'Beat the competition',text:'Early alerts, sponsor filters, and matched leads help you apply faster than 100+ rivals.'},
                ].map((item, idx) => (
                  <motion.div key={idx}
                    className={`how-chat-card ${idx % 2 === 1 ? 'user' : ''} ${idx === 0 ? 'special' : ''}`}
                    initial={{opacity:0,y:20}}
                    whileInView={{opacity:1,y:0}}
                    viewport={{once:true}}
                    transition={{delay:0.1 + idx * 0.1, duration:0.55, ease:'easeInOut'}}>
                    <div className="how-chat-title">{item.icon} {item.title}</div>
                    <div className="how-chat-text">{item.text}</div>
                    <div className="how-chat-meta">
                      <span className="how-chat-badge">
                        {idx === 0 ? 'Fresh' : idx === 1 ? 'Match' : idx === 2 ? 'Speed' : idx === 3 ? 'Live' : 'Priority'}
                      </span>
                      <span>{idx === 2 ? 'Chat-style workflow' : 'AI-first experience'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
        </motion.div>

        <div className="glow-line"/>

        {/* FEATURES */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <div className="section reveal">
          <div className="eyebrow">Everything you need</div>
          <h2 className="sec-title">Six tools. One <em>unfair</em> advantage.</h2>
          <div className="feat-grid">
            {[
              {icon:'⚡',cls:'i1',name:'Early Bird Detection',desc:'Get alerts the moment a job posts. Beat hundreds by applying in the first hour.',tag:'HOT · Under 6h'},
              {icon:'🎯',cls:'i2',name:'AI Resume Match',desc:'Claude AI scores your resume against every listing — with gaps clearly highlighted.',tag:'94% accuracy'},
              {icon:'✍️',cls:'i3',name:'Cover Letter Gen.',desc:'Personalized, compelling letters written in seconds for every application.',tag:'1-click · Instant'},
              {icon:'🎤',cls:'i4',name:'Interview Simulator',desc:'AI asks real questions from the job listing. Get scored feedback after every answer.',tag:'Chat-based'},
              {icon:'🌐',cls:'i5',name:'H1B Sponsor Filter',desc:'One toggle shows only verified H1B sponsoring companies. Built for international students.',tag:'500+ sponsors'},
              {icon:'🗂️',cls:'i6',name:'Kanban Tracker',desc:'Drag jobs across a 5-stage board. Never lose track of any application again.',tag:'5-stage board'},
            ].map((f,i) => (
              <div key={i} className="feat reveal" style={{transitionDelay:`${i*80}ms`}}>
                <div className="feat-glow"/>
                <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                <div className="feat-name">{f.name}</div>
                <div className="feat-desc">{f.desc}</div>
                <span className="feat-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
        </motion.div>

        <div className="glow-line"/>

        {/* FOUNDER STORY */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <section className="reveal" id="stories" style={{padding:'80px 24px',maxWidth:'800px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{
              fontFamily:'var(--font-display)',
              fontSize:'clamp(32px, 4vw, 48px)',
              fontWeight:700,
              letterSpacing:'-0.02em',
              margin:'0 0 16px 0',
              color:'#f5f5f7'
            }}>
              Why I built Vegaply
            </h2>
            <p style={{
              fontSize:'15px',
              color:'rgba(245,245,247,0.55)',
              letterSpacing:'0.05em',
              textTransform:'uppercase',
              margin:0
            }}>
              Founder note
            </p>
          </div>

          <div style={{
            background:'linear-gradient(135deg, rgba(245,158,11,0.04) 0%, rgba(6,182,212,0.04) 100%)',
            border:'1px solid rgba(245,245,247,0.08)',
            borderRadius:'14px',
            padding:'40px',
            fontSize:'17px',
            lineHeight:1.7,
            color:'rgba(245,245,247,0.85)',
            fontStyle:'italic'
          }}>
            <p style={{margin:'0 0 20px 0'}}>
              I&rsquo;m Roshan — an F-1 student at the University of Houston. I watched my friends pay $300/month to shady WhatsApp &ldquo;career consultants&rdquo; who blasted out 40 garbage applications a day on their behalf. The applications were generic. The job matches were random. The results were brutal.
            </p>
            <p style={{margin:'0 0 20px 0'}}>
              There had to be a better way. So I built one.
            </p>
            <p style={{margin:0,fontStyle:'normal',color:'rgba(245,245,247,0.65)',fontSize:'15px'}}>
              — Roshan, founder<br/>
              <span style={{fontSize:'13px',color:'rgba(245,245,247,0.45)'}}>F-1 student · University of Houston</span>
            </p>
          </div>
        </section>
        </motion.div>

        {/* PRICING */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <div className="pricing-section reveal">
          <div className="eyebrow">Pricing</div>
          <h2 className="sec-title">Simple. <em>Transparent.</em></h2>
          <p style={{fontSize:16,color:"rgba(255,255,255,0.35)",fontWeight:300,marginTop:16,maxWidth:480,margin:"16px auto 0"}}>
            Start free forever. Upgrade when you want to apply on autopilot.
          </p>
          <div className="pricing-grid">

            {/* FREE CARD */}
            <div className="pricing-card pricing-free">
              <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:16,fontWeight:500}}>FREE FOREVER</div>
              <div className="pricing-price">$0</div>
              <div className="pricing-period">For students testing the water</div>
              <ul className="pricing-features">
                <li><span>✓</span> 750+ fresh jobs daily</li>
                <li><span>✓</span> Early Bird mode (24h jobs)</li>
                <li><span>✓</span> AI Resume Match score</li>
                <li><span>✓</span> Cover letter generator</li>
                <li><span>✓</span> Skill gap analysis</li>
                <li><span>✓</span> Interview simulator</li>
                <li><span>✓</span> H1B sponsor filter</li>
                <li><span>✓</span> Kanban job tracker</li>
                <li className="locked"><span>✗</span> Smart Apply (auto-prep)</li>
                <li className="locked"><span>✗</span> Under 10 applicants tab</li>
                <li className="locked"><span>✗</span> 30 auto-applies per day</li>
                <li className="locked"><span>✗</span> Priority job alerts</li>
              </ul>
              <Link href="/signup" className="btn-ghost" style={{width:"100%",textAlign:"center",display:"block"}}>
                Get Started Free
              </Link>
            </div>

            {/* PRO CARD */}
            <div className="pricing-card pricing-pro">
              <div className="pricing-badge">⚡ PRO</div>
              <div className="pricing-price" style={{background:"linear-gradient(135deg,var(--gold),var(--cyan))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>$9.99</div>
              <div className="pricing-period">For students serious about landing H1B</div>
              <ul className="pricing-features">
                <li><span>✓</span> Everything in Free</li>
                <li><span>✓</span> <strong style={{color:"rgba(255,255,255,0.8)"}}>Smart Apply</strong> — AI preps full application</li>
                <li><span>✓</span> <strong style={{color:"rgba(255,255,255,0.8)"}}>Under 10 applicants</strong> tab</li>
                <li><span>✓</span> <strong style={{color:"rgba(255,255,255,0.8)"}}>30 auto-applies</strong> per day</li>
                <li><span>✓</span> Competition radar per job</li>
                <li><span>✓</span> Priority email alerts</li>
                <li><span>✓</span> Resume version manager</li>
                <li><span>✓</span> Early access to new features</li>
              </ul>
              <Link href="/signup" className="btn-primary" style={{width:"100%",textAlign:"center",display:"block"}}>
                Start Pro — $9.99/mo
              </Link>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.2)",textAlign:"center",marginTop:12}}>
                Coming soon · Join waitlist now
              </p>
            </div>

          </div>
        </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <div className="cta-wrap reveal">
          <div className="cta-radial"/>
          <h2 className="cta-h">Your H1B sponsor is hiring <em>right now.</em></h2>
          <p className="cta-sub">Stop scrolling LinkedIn at 2 AM. Let AI do the heavy lifting while you sleep.</p>
          <Link href="/signup" className="btn-primary" style={{fontSize:16,padding:'17px 48px'}}>
            Start free — no credit card
          </Link>
          <p className="cta-trust">✓ Built by an F-1 student · ✓ 70+ H1B sponsors verified · ✓ Free to start</p>
        </div>
        </motion.div>

        {/* FOOTER */}
        <footer>
          <div className="fc">© 2026 Vegaply</div>
          <div className="fl">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:support@vegaply.com">Contact</a>
          </div>
        </footer>
      </div>
    </>
  )
}
