'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mouse, setMouse] = useState({ x: -500, y: -500 })
  const [typedText, setTypedText] = useState('')
  const [morphWord, setMorphWord] = useState('scams.')
  const [countersStarted, setCountersStarted] = useState(false)
  const [c1, setC1] = useState('0')
  const [c2, setC2] = useState('0')
  const [c3, setC3] = useState('0×')

  const fullCoverText = 'Dear Hiring Manager, I am excited to apply for the Senior ML Engineer role at Google. My 4 years of Python and TensorFlow experience aligns perfectly with your requirements...'
  const morphWords = ['scams.', 'spam.', 'ghosts.', 'silence.']
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&'

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
    let idx = 0
    const morph = async () => {
      idx = (idx + 1) % morphWords.length
      const next = morphWords[idx]
      for (let i = 0; i < 9; i++) {
        setMorphWord(next.split('').map((c, k) =>
          k < Math.floor(i / 9 * next.length) ? c : chars[Math.floor(Math.random() * chars.length)]
        ).join(''))
        await new Promise(r => setTimeout(r, 38))
      }
      setMorphWord(next)
    }
    const interval = setInterval(morph, 2800)
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
    { n: 'Sarah K.', t: 'Got 3 interviews in one week using Early Bird mode' },
    { n: 'Marcus T.', t: 'Cover letter generator is absolutely insane quality' },
    { n: 'Priya R.', t: 'Landed a $140k role — applied within 2 hours of posting' },
    { n: 'James L.', t: 'Resume match saved me from 50 bad-fit applications' },
    { n: 'Aisha M.', t: 'Interview sim gave me exact questions I was asked IRL' },
    { n: 'Leo C.', t: 'From zero callbacks to 5 offers in a single month' },
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
          
          <motion.div className="pill" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
            <span className="pdot" />
            AI-powered · Now live at vegaply.com
          </motion.div>

          <h1 className="hero-h1">
            {['Skip', 'the'].map((word, i) => (
              <motion.span key={i} style={{display:'inline-block', marginRight:'0.25em'}}
                initial={{opacity:0,y:40}} animate={{opacity:1,y:0}}
                transition={{delay:i*0.15+0.3, duration:0.6, ease:[0.34,1.56,0.64,1]}}>
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span className="grad-word" initial={{opacity:0,y:40}} animate={{opacity:1,y:0}}
              transition={{delay:0.6, duration:0.6, ease:[0.34,1.56,0.64,1]}}>
              {morphWord}
            </motion.span>
            <br />
            <motion.span style={{fontWeight:700,color:'rgba(255,255,255,0.92)'}}
              initial={{opacity:0,y:40}} animate={{opacity:1,y:0}}
              transition={{delay:0.75, duration:0.6, ease:[0.34,1.56,0.64,1]}}>
              Apply smarter.
            </motion.span>
          </h1>

          <motion.p className="hero-sub" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:0.9, duration:0.6}}>
            750+ jobs daily, AI-matched to your resume, with cover letters auto-written. Plus a verified H1B sponsor filter — because international students need it.
          </motion.p>

          <motion.div className="hero-btns" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:1.05, duration:0.6}}>
            <Link href="/signup" className="btn-primary">Start free — find H1B jobs now</Link>
            <Link href="/login" className="btn-ghost">Sign in →</Link>
          </motion.div>

          <motion.div className="av-row" initial={{opacity:0}} animate={{opacity:1}}
            transition={{delay:1.2, duration:0.6}}>
            <div className="av-stack">
              <div className="av a1">AK</div><div className="av a3">SR</div>
              <div className="av a3">MJ</div><div className="av a4">PL</div>
            </div>
            <div className="av-txt">
              <span className="stars">★★★★★</span>
              70+ verified H1B sponsors · No credit card · Cancel anytime
            </div>
          </motion.div>

          {/* Card Stack */}
          <motion.div className="card-stack" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}}
            transition={{delay:1.35, duration:0.8, ease:[0.34,1.56,0.64,1]}}>
            <div className="stack-card">
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>✉️ AI COVER LETTER</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6,minHeight:60}}>
                {typedText}
                <span style={{display:'inline-block',width:2,height:14,background:'var(--gold)',marginLeft:2,animation:'blink 1s ease infinite'}}/>
              </div>
            </div>
            <div className="stack-card">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--cyan))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#1a1a1f'}}>94%</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Strong Match</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Senior ML Engineer · Google</div>
                </div>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:99}}>
                <div style={{width:'94%',height:'100%',background:'linear-gradient(90deg,var(--gold),var(--cyan))',borderRadius:99}}/>
              </div>
            </div>
            <div className="stack-card">
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>📋 KANBAN TRACKER</div>
              <div style={{display:'flex',gap:6}}>
                {['Saved','Applied','Interview','Offer'].map((s,i) => (
                  <div key={i} style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'6px 4px',textAlign:'center',fontSize:9,color:'rgba(255,255,255,0.4)'}}>
                    {s}<div style={{fontSize:13,fontWeight:700,color:i===2?'var(--cyan)':'var(--text-secondary)',marginTop:2}}>{[3,8,2,1][i]}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div className="counters" id="counters-section"
            initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.5, duration:0.6}}>
            <div className="ctr"><span className="ctr-n">{c1}</span><div className="ctr-l">Fresh jobs every day</div></div>
            <div className="ctr"><span className="ctr-n">{c2}</span><div className="ctr-l">Before anyone else sees it</div></div>
            <div className="ctr"><span className="ctr-n">{c3}</span><div className="ctr-l">To get your AI match score</div></div>
          </motion.div>
        </div>

        {/* TICKER */}
        <motion.div className="ticker-wrap" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
          <div className="ticker-inner">
            {[...tickData, ...tickData].map((d, i) => (
              <span key={i} className="t-item">
                <span className="t-dot"/><span className="t-name">{d.n}</span> · {d.t}
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

        {/* TESTIMONIALS */}
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5,ease:'easeOut'}}>
        <div className="section reveal" id="stories">
          <div className="eyebrow">Real results</div>
          <h2 className="sec-title">People are getting hired <em>faster.</em></h2>
          <div className="testi-grid">
            {[
              {init:'R',bg:'linear-gradient(135deg,var(--gold),var(--cyan))',name:'Ravi M.',role:'MS Data Science',quote:'Got my H1B sponsor job at Deloitte in 11 days. Applied within 2 hours of posting. Never would have found it otherwise.'},
              {init:'P',bg:'linear-gradient(135deg,var(--gold),var(--cyan))',name:'Priya K.',role:'Software Engineer',quote:'The AI match score saved me so much time. I only applied to jobs above 80%. Got 3 interviews in 2 weeks.'},
              {init:'J',bg:'linear-gradient(135deg,var(--success),var(--success))',name:'James L.',role:'Career Changer',quote:'As a career changer, the skill gap analysis showed me exactly what to learn. Got hired at a top startup.'},
              {init:'A',bg:'linear-gradient(135deg,var(--gold),var(--gold-hover))',name:'Ananya S.',role:'OPT Student',quote:'OPT student here. The H1B filter is literally a lifesaver. Found 3 sponsor jobs I never knew existed.'},
              {init:'M',bg:'linear-gradient(135deg,var(--cyan),var(--gold))',name:'Marcus T.',role:'Product Manager',quote:'Applied to 8 jobs in one morning using Smart Apply. Got 2 callbacks same day. Incredible tool.'},
              {init:'S',bg:'linear-gradient(135deg,var(--cyan),var(--success))',name:'Sofia R.',role:'UX Designer',quote:'The interview simulator is scary good. It asked me exactly the questions I got in my real interview.'},
            ].map((t,i) => (
              <div key={i} className="testi-card">
                <div className="testi-avatar" style={{background:t.bg}}>{t.init}</div>
                <div className="testi-stars">★★★★★</div>
                <div className="testi-quote">&ldquo;{t.quote}&rdquo;</div>
                <div className="testi-name">{t.name}</div>
                <div className="testi-role">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
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
