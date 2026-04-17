'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mouse, setMouse] = useState({ x: -500, y: -500 })
  const [typedText, setTypedText] = useState('')
  const [morphWord, setMorphWord] = useState('late.')
  const [countersStarted, setCountersStarted] = useState(false)
  const [c1, setC1] = useState('0')
  const [c2, setC2] = useState('0')
  const [c3, setC3] = useState('0×')

  const fullCoverText = 'Dear Hiring Manager, I am excited to apply for the Senior ML Engineer role at Google. My 4 years of Python and TensorFlow experience aligns perfectly with your requirements...'
  const morphWords = ['late.', 'slow.', 'blindly.', 'losing.']
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
          ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 120) * 0.22})`; ctx.lineWidth = 0.5; ctx.stroke()
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
    }, { threshold: 0.1 })
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
        el.style.boxShadow = '0 40px 80px rgba(0,0,0,.55), 0 0 40px rgba(99,102,241,.15)'
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{background:#060608;font-family:'DM Sans',sans-serif;color:#fff;overflow-x:hidden;}
        canvas#bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
        .noise{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");background-size:200px 200px;}
        .wrap{position:relative;z-index:10;}
        
        /* NAV */
        nav{display:flex;align-items:center;justify-content:space-between;padding:22px 52px;background:rgba(6,6,8,0.55);backdrop-filter:blur(28px);border-bottom:1px solid rgba(255,255,255,0.04);position:sticky;top:0;z-index:100;}
        .logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-decoration:none;color:#fff;}
        .logo span{background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .nav-links{display:flex;gap:32px;list-style:none;}
        .nav-links a{font-size:13px;color:rgba(255,255,255,0.38);text-decoration:none;transition:color .3s;}
        .nav-links a:hover{color:#fff;}
        .nav-right{display:flex;gap:12px;align-items:center;}
        .nav-signin{font-size:13px;color:rgba(255,255,255,0.4);text-decoration:none;transition:color .3s;padding:8px 16px;}
        .nav-signin:hover{color:#fff;}
        .nav-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:10px 22px;border-radius:100px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;transition:transform .3s,box-shadow .3s;text-decoration:none;display:inline-block;}
        .nav-btn:hover{transform:scale(1.06);box-shadow:0 0 32px rgba(99,102,241,.5);}

        /* HERO */
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 60px;position:relative;overflow:hidden;}
        .orb-1{position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.18),transparent 70%);top:-200px;left:-200px;filter:blur(80px);pointer-events:none;animation:orbFloat1 8s ease-in-out infinite;}
        .orb-2{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.15),transparent 70%);top:30%;right:-150px;filter:blur(70px);pointer-events:none;animation:orbFloat2 10s ease-in-out infinite;}
        .orb-3{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(236,72,153,0.12),transparent 70%);bottom:-100px;left:40%;filter:blur(90px);pointer-events:none;animation:orbFloat3 12s ease-in-out infinite;}
        @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-30px) scale(1.05);}66%{transform:translate(-20px,20px) scale(0.95);}}
        @keyframes orbFloat2{0%,100%{transform:translate(0,0);}50%{transform:translate(-40px,-20px);}}
        @keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(20px,-30px) scale(1.08);}}
        
        .pill{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);border-radius:100px;padding:6px 18px;font-size:12px;font-weight:500;color:#a5b4fc;letter-spacing:.4px;margin-bottom:36px;}
        .pdot{width:7px;height:7px;background:#6366f1;border-radius:50%;animation:pdotAnim 1.8s ease infinite;}
        @keyframes pdotAnim{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(.5);opacity:.3;}}

        .hero-h1{font-family:'Playfair Display',serif;font-size:clamp(52px,8.5vw,100px);font-weight:900;line-height:.95;letter-spacing:-4px;max-width:940px;}
        .grad-word{display:inline-block;background:linear-gradient(135deg,#818cf8 0%,#c084fc 40%,#ec4899 75%,#fb7185 100%);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:gflow 5s linear infinite;}
        @keyframes gflow{0%{background-position:0% 50%;}100%{background-position:300% 50%;}}
        
        .hero-sub{font-size:17px;font-weight:300;color:rgba(255,255,255,.42);max-width:490px;margin:26px auto 0;line-height:1.75;}
        .hero-btns{display:flex;align-items:center;gap:14px;margin-top:42px;flex-wrap:wrap;justify-content:center;}
        
        .btn-primary{position:relative;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:15px 36px;border-radius:100px;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;overflow:hidden;transition:transform .4s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;box-shadow:0 4px 40px rgba(99,102,241,.35);text-decoration:none;display:inline-block;}
        .btn-primary::after{content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:sheen 3.5s 1.5s ease infinite;}
        @keyframes sheen{0%{left:-100%;}45%,100%{left:160%;}}
        .btn-primary:hover{transform:scale(1.07) translateY(-2px);box-shadow:0 8px 60px rgba(99,102,241,.55);}
        
        .btn-ghost{background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);padding:15px 28px;border-radius:100px;font-size:15px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .3s;text-decoration:none;display:inline-block;}
        .btn-ghost:hover{border-color:rgba(255,255,255,.28);color:#fff;}
        
        .av-row{display:flex;align-items:center;gap:14px;margin-top:46px;flex-wrap:wrap;justify-content:center;}
        .av-stack{display:flex;}
        .av{width:33px;height:33px;border-radius:50%;border:2px solid #060608;margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}
        .av:first-child{margin-left:0;}
        .a1{background:linear-gradient(135deg,#6366f1,#8b5cf6);}
        .a2{background:linear-gradient(135deg,#ec4899,#f43f5e);}
        .a3{background:linear-gradient(135deg,#10b981,#059669);}
        .a4{background:linear-gradient(135deg,#f59e0b,#d97706);}
        .av-txt{font-size:13px;color:rgba(255,255,255,.38);}
        .av-txt strong{color:rgba(255,255,255,.72);font-weight:500;}
        .stars{color:#fbbf24;font-size:12px;display:block;}

        /* CARD STACK */
        .card-stack{position:relative;width:420px;height:200px;margin:64px auto 0;}
        .stack-card{position:absolute;width:340px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:22px;backdrop-filter:blur(20px);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);}
        .stack-card:nth-child(1){transform:rotate(-5deg) translateX(-10px);z-index:1;top:24px;left:0;}
        .stack-card:nth-child(2){transform:rotate(0deg);z-index:3;top:0;left:40px;border-color:rgba(99,102,241,0.35);background:rgba(99,102,241,0.07);box-shadow:0 20px 60px rgba(99,102,241,0.2);}
        .stack-card:nth-child(3){transform:rotate(5deg) translateX(10px);z-index:1;top:24px;left:80px;}
        .stack-card:hover{transform:rotate(0deg) translateY(-8px) scale(1.02)!important;z-index:10!important;}

        /* COUNTERS */
        .counters{display:flex;gap:18px;margin-top:56px;flex-wrap:wrap;justify-content:center;}
        .ctr{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:22px 28px;text-align:center;position:relative;overflow:hidden;transition:transform .4s ease,border-color .3s;min-width:120px;}
        .ctr:hover{transform:translateY(-4px);border-color:rgba(99,102,241,.28);}
        .ctr::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.45),transparent);}
        .ctr-n{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;background:linear-gradient(135deg,#fff,rgba(255,255,255,.6));-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block;}
        .ctr-l{font-size:11px;color:rgba(255,255,255,.28);margin-top:4px;letter-spacing:.3px;}

        /* TICKER */
        .ticker-wrap{overflow:hidden;padding:13px 0;border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.04);position:relative;}
        .ticker-wrap::before,.ticker-wrap::after{content:'';position:absolute;top:0;bottom:0;width:100px;z-index:2;pointer-events:none;}
        .ticker-wrap::before{left:0;background:linear-gradient(90deg,#060608,transparent);}
        .ticker-wrap::after{right:0;background:linear-gradient(270deg,#060608,transparent);}
        .ticker-inner{display:flex;width:max-content;animation:tick 35s linear infinite;}
        @keyframes tick{from{transform:translateX(0);}to{transform:translateX(-50%);}}
        .t-item{display:flex;align-items:center;gap:10px;padding:0 28px;font-size:13px;color:rgba(255,255,255,.32);white-space:nowrap;font-weight:300;}
        .t-name{color:rgba(255,255,255,.68);font-weight:500;}
        .t-dot{width:4px;height:4px;border-radius:50%;background:#6366f1;flex-shrink:0;}

        /* ACTIVITY FEED */
        .activity-feed{max-width:600px;margin:0 auto;height:140px;overflow:hidden;position:relative;}
        .activity-feed::before{content:'';position:absolute;top:0;left:0;right:0;height:40px;z-index:2;background:linear-gradient(180deg,#060608,transparent);}
        .activity-feed::after{content:'';position:absolute;bottom:0;left:0;right:0;height:40px;z-index:2;background:linear-gradient(0deg,#060608,transparent);}
        .activity-inner{display:flex;flex-direction:column;gap:10px;animation:feedScroll 14s linear infinite;}
        @keyframes feedScroll{0%{transform:translateY(0);}100%{transform:translateY(-50%);}}
        .activity-item{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:100px;padding:8px 16px;font-size:12px;color:rgba(255,255,255,0.45);white-space:nowrap;}
        .activity-dot{width:6px;height:6px;border-radius:50%;background:#34d399;flex-shrink:0;animation:pulse 2s ease infinite;}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.8);}}

        /* SECTIONS */
        .section{padding:100px 52px;max-width:1200px;margin:0 auto;}
        .eyebrow{font-size:11px;font-weight:600;letter-spacing:3px;color:#6366f1;text-transform:uppercase;margin-bottom:14px;}
        .sec-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,60px);font-weight:700;line-height:1.05;letter-spacing:-1.5px;}
        .sec-title em{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}

        /* 3D TILT CARDS */
        .cards-scene{display:flex;gap:22px;margin-top:58px;perspective:1200px;flex-wrap:wrap;}
        .tilt-card{flex:1;min-width:260px;position:relative;border-radius:22px;transform-style:preserve-3d;transform:perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1);transition:box-shadow .3s ease;cursor:pointer;will-change:transform;}
        .tilt-inner{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:30px;position:relative;overflow:hidden;height:100%;transition:border-color .3s,background .3s;}
        .tilt-glare{position:absolute;inset:0;border-radius:22px;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.12) 0%,rgba(255,255,255,.04) 30%,transparent 65%);pointer-events:none;opacity:0;transition:opacity .25s;}
        .tilt-card:hover .tilt-glare{opacity:1;}
        .tilt-card:hover .tilt-inner{border-color:rgba(99,102,241,.32);background:rgba(99,102,241,.05);}
        .tilt-card::after{content:'';position:absolute;inset:-1px;border-radius:23px;background:linear-gradient(135deg,rgba(99,102,241,.4),rgba(236,72,153,.2),transparent 60%);opacity:0;transition:opacity .3s;z-index:-1;filter:blur(8px);}
        .tilt-card:hover::after{opacity:.6;}
        .hot-badge{position:absolute;top:16px;right:16px;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;letter-spacing:.5px;}
        .co-logo{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;margin-bottom:14px;}
        .cl1{background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(139,92,246,.15));color:#818cf8;}
        .cl2{background:linear-gradient(135deg,rgba(236,72,153,.2),rgba(244,63,94,.1));color:#f472b6;}
        .cl3{background:linear-gradient(135deg,rgba(52,211,153,.2),rgba(16,185,129,.1));color:#34d399;}
        .j-title{font-size:17px;font-weight:700;margin-bottom:6px;letter-spacing:-.3px;}
        .j-co{font-size:13px;color:rgba(255,255,255,.35);margin-bottom:16px;font-weight:300;}
        .badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;}
        .b{font-size:10px;font-weight:600;padding:4px 10px;border-radius:100px;letter-spacing:.3px;}
        .ba{background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2);}
        .bg{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2);}
        .bi{background:rgba(99,102,241,.1);color:#a5b4fc;border:1px solid rgba(99,102,241,.2);}
        .match-row{display:flex;align-items:center;gap:14px;}
        .mpct{font-size:20px;font-weight:800;font-family:'Playfair Display',serif;}
        .mlbl{font-size:11px;color:rgba(255,255,255,.3);margin-top:2px;}
        .float-label{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.25);color:#a5b4fc;font-size:11px;padding:5px 14px;border-radius:100px;white-space:nowrap;opacity:0;transition:opacity .3s,bottom .3s;}
        .tilt-card:hover .float-label{opacity:1;bottom:-20px;}

        /* FEATURES */
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.06);}
        .feat{background:#060608;padding:38px 32px;position:relative;overflow:hidden;cursor:default;transition:background .35s;}
        .feat-glow{position:absolute;inset:0;background:radial-gradient(circle at var(--fx,50%) var(--fy,50%),rgba(99,102,241,.09),transparent 55%);opacity:0;transition:opacity .4s;pointer-events:none;}
        .feat:hover .feat-glow{opacity:1;}
        .feat-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:21px;margin-bottom:18px;}
        .i1{background:rgba(99,102,241,.14);}
        .i2{background:rgba(236,72,153,.14);}
        .i3{background:rgba(52,211,153,.14);}
        .i4{background:rgba(251,191,36,.14);}
        .i5{background:rgba(167,139,250,.14);}
        .i6{background:rgba(248,113,113,.14);}
        .feat-name{font-size:15px;font-weight:600;margin-bottom:8px;color:rgba(255,255,255,.88);}
        .feat-desc{font-size:13px;font-weight:300;color:rgba(255,255,255,.35);line-height:1.72;}
        .feat-tag{display:inline-block;margin-top:13px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.18);color:#a5b4fc;font-size:11px;padding:3px 10px;border-radius:100px;font-weight:500;}

        /* TESTIMONIALS */
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .testi-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:28px;transition:transform .3s,border-color .3s;}
        .testi-card:hover{transform:translateY(-4px);border-color:rgba(99,102,241,.25);}
        .testi-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;margin-bottom:16px;}
        .testi-quote{font-size:14px;color:rgba(255,255,255,.55);line-height:1.7;font-weight:300;margin-bottom:16px;}
        .testi-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.8);}
        .testi-role{font-size:11px;color:rgba(255,255,255,.3);margin-top:2px;}
        .testi-stars{color:#fbbf24;font-size:12px;margin-bottom:12px;}

        /* PRICING */
        .pricing-section{padding:100px 52px;max-width:1200px;margin:0 auto;text-align:center;}
        .pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:52px;max-width:800px;margin-left:auto;margin-right:auto;}
        .pricing-card{border-radius:24px;padding:40px;text-align:left;position:relative;overflow:hidden;}
        .pricing-free{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);}
        .pricing-pro{background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid rgba(99,102,241,0.4);box-shadow:0 20px 60px rgba(99,102,241,0.15);}
        .pricing-pro::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.8),transparent);}
        .pricing-badge{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:10px;font-weight:700;padding:4px 12px;border-radius:100px;letter-spacing:1px;margin-bottom:20px;}
        .pricing-price{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;line-height:1;margin-bottom:4px;}
        .pricing-period{font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:24px;}
        .pricing-features{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px;}
        .pricing-features li{font-size:13px;color:rgba(255,255,255,0.6);display:flex;align-items:center;gap:10px;font-weight:300;}
        .pricing-features li span{color:#34d399;font-size:15px;flex-shrink:0;}
        .pricing-features li.locked{color:rgba(255,255,255,0.25);}
        .pricing-features li.locked span{color:rgba(255,255,255,0.2);}
        @media(max-width:768px){.pricing-grid{grid-template-columns:1fr;}.pricing-section{padding:60px 20px;}}

        /* CTA */
        .cta-wrap{text-align:center;padding:110px 52px;position:relative;}
        .cta-radial{position:absolute;width:900px;height:500px;background:radial-gradient(ellipse,rgba(99,102,241,.09) 0%,transparent 68%);left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;}
        .cta-h{font-family:'Playfair Display',serif;font-size:clamp(40px,6vw,76px);font-weight:900;letter-spacing:-2.5px;line-height:1.0;max-width:700px;margin:0 auto 28px;}
        .cta-h em{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
        .cta-sub{font-size:16px;color:rgba(255,255,255,.38);font-weight:300;max-width:440px;margin:0 auto 38px;line-height:1.75;}
        .cta-trust{font-size:12px;color:rgba(255,255,255,.2);margin-top:20px;letter-spacing:.3px;}

        /* FOOTER */
        footer{border-top:1px solid rgba(255,255,255,.04);padding:34px 52px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;}
        .fc{font-size:13px;color:rgba(255,255,255,.18);}
        .fl{display:flex;gap:22px;}
        .fl a{font-size:13px;color:rgba(255,255,255,.18);text-decoration:none;transition:color .3s;}
        .fl a:hover{color:rgba(255,255,255,.55);}

        /* GLOW LINE */
        .glow-line{height:1px;max-width:1200px;margin:0 auto;background:linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent);}
        
        /* REVEAL */
        .reveal{opacity:0;transform:translateY(32px);transition:opacity .85s ease,transform .85s cubic-bezier(.34,1.3,.64,1);}
        .reveal.in{opacity:1;transform:none;}
        
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

      {/* Canvas background */}
      <canvas ref={canvasRef} id="bg" />
      
      {/* Noise overlay */}
      <div className="noise" />
      
      {/* Cursor glow */}
      <div style={{
        position: 'fixed', left: mouse.x - 200, top: mouse.y - 200,
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 2,
        transition: 'left 0.15s ease, top 0.15s ease'
      }} />

      <div className="wrap">
        {/* NAV */}
        <nav>
          <Link href="/" className="logo">Vega<span>ply</span></Link>
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
          <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
          
          <motion.div className="pill" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
            <span className="pdot" />
            AI-powered · Now live at vegaply.com
          </motion.div>

          <h1 className="hero-h1">
            {['Stop', 'applying'].map((word, i) => (
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
            <motion.span style={{fontStyle:'italic',color:'rgba(255,255,255,0.82)'}}
              initial={{opacity:0,y:40}} animate={{opacity:1,y:0}}
              transition={{delay:0.75, duration:0.6, ease:[0.34,1.56,0.64,1]}}>
              Start winning.
            </motion.span>
          </h1>

          <motion.p className="hero-sub" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:0.9, duration:0.6}}>
            Vegaply finds fresh jobs, matches your resume, writes your cover letter, and preps your interview — all in seconds.
          </motion.p>

          <motion.div className="hero-btns" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
            transition={{delay:1.05, duration:0.6}}>
            <Link href="/signup" className="btn-primary">Find jobs now — it&apos;s free</Link>
            <Link href="/login" className="btn-ghost">Sign in →</Link>
          </motion.div>

          <motion.div className="av-row" initial={{opacity:0}} animate={{opacity:1}}
            transition={{delay:1.2, duration:0.6}}>
            <div className="av-stack">
              <div className="av a1">AK</div><div className="av a2">SR</div>
              <div className="av a3">MJ</div><div className="av a4">PL</div>
            </div>
            <div className="av-txt">
              <span className="stars">★★★★★</span>
              Early access open · Be among the first to apply
            </div>
          </motion.div>

          {/* Card Stack */}
          <motion.div className="card-stack" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}}
            transition={{delay:1.35, duration:0.8, ease:[0.34,1.56,0.64,1]}}>
            <div className="stack-card">
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>✉️ AI COVER LETTER</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.6,minHeight:60}}>
                {typedText}
                <span style={{display:'inline-block',width:2,height:14,background:'#6366f1',marginLeft:2,animation:'blink 1s ease infinite'}}/>
              </div>
            </div>
            <div className="stack-card">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{width:42,height:42,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#34d399)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800}}>94%</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Strong Match</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Senior ML Engineer · Google</div>
                </div>
              </div>
              <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:99}}>
                <div style={{width:'94%',height:'100%',background:'linear-gradient(90deg,#6366f1,#34d399)',borderRadius:99}}/>
              </div>
            </div>
            <div className="stack-card">
              <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:8}}>📋 KANBAN TRACKER</div>
              <div style={{display:'flex',gap:6}}>
                {['Saved','Applied','Interview','Offer'].map((s,i) => (
                  <div key={i} style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'6px 4px',textAlign:'center',fontSize:9,color:'rgba(255,255,255,0.4)'}}>
                    {s}<div style={{fontSize:13,fontWeight:700,color:i===2?'#34d399':'rgba(255,255,255,0.7)',marginTop:2}}>{[3,8,2,1][i]}</div>
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
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...tickData, ...tickData].map((d, i) => (
              <span key={i} className="t-item">
                <span className="t-dot"/><span className="t-name">{d.n}</span> · {d.t}
              </span>
            ))}
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div style={{padding:'40px 24px',textAlign:'center'}}>
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
        </div>

        {/* 3D TILT CARDS */}
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
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="#34d399" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="6"/>
                  </svg>
                  <div><div className="mpct" style={{color:'#34d399'}}>94%</div><div className="mlbl">Resume match</div></div>
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
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="#818cf8" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="25"/>
                  </svg>
                  <div><div className="mpct" style={{color:'#818cf8'}}>76%</div><div className="mlbl">Resume match</div></div>
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
                    <circle className="arc" cx="22" cy="22" r="16" fill="none" stroke="#34d399" strokeWidth="3"
                      strokeLinecap="round" transform="rotate(-90 22 22)"
                      strokeDasharray="100.5" strokeDashoffset="100.5" data-t="12"/>
                  </svg>
                  <div><div className="mpct" style={{color:'#34d399'}}>88%</div><div className="mlbl">Resume match</div></div>
                </div>
              </div>
              <div className="float-label">Prep interview →</div>
            </div>
          </div>
        </div>

        <div className="glow-line"/>

        {/* FEATURES */}
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
              <div key={i} className="feat">
                <div className="feat-glow"/>
                <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                <div className="feat-name">{f.name}</div>
                <div className="feat-desc">{f.desc}</div>
                <span className="feat-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glow-line"/>

        {/* TESTIMONIALS */}
        <div className="section reveal" id="stories">
          <div className="eyebrow">Real results</div>
          <h2 className="sec-title">People are getting hired <em>faster.</em></h2>
          <div className="testi-grid">
            {[
              {init:'R',bg:'linear-gradient(135deg,#6366f1,#8b5cf6)',name:'Ravi M.',role:'MS Data Science',quote:'Got my H1B sponsor job at Deloitte in 11 days. Applied within 2 hours of posting. Never would have found it otherwise.'},
              {init:'P',bg:'linear-gradient(135deg,#ec4899,#f43f5e)',name:'Priya K.',role:'Software Engineer',quote:'The AI match score saved me so much time. I only applied to jobs above 80%. Got 3 interviews in 2 weeks.'},
              {init:'J',bg:'linear-gradient(135deg,#10b981,#059669)',name:'James L.',role:'Career Changer',quote:'As a career changer, the skill gap analysis showed me exactly what to learn. Got hired at a top startup.'},
              {init:'A',bg:'linear-gradient(135deg,#f59e0b,#d97706)',name:'Ananya S.',role:'OPT Student',quote:'OPT student here. The H1B filter is literally a lifesaver. Found 3 sponsor jobs I never knew existed.'},
              {init:'M',bg:'linear-gradient(135deg,#8b5cf6,#6366f1)',name:'Marcus T.',role:'Product Manager',quote:'Applied to 8 jobs in one morning using Smart Apply. Got 2 callbacks same day. Incredible tool.'},
              {init:'S',bg:'linear-gradient(135deg,#34d399,#10b981)',name:'Sofia R.',role:'UX Designer',quote:'The interview simulator is scary good. It asked me exactly the questions I got in my real interview.'},
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

        {/* PRICING */}
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
              <div className="pricing-period">No credit card · No expiry</div>
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
              <div className="pricing-price" style={{background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>$9.99</div>
              <div className="pricing-period">per month · Cancel anytime</div>
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

        {/* CTA */}
        <div className="cta-wrap reveal">
          <div className="cta-radial"/>
          <h2 className="cta-h">Your dream job is being posted <em>right now.</em></h2>
          <p className="cta-sub">Join early access — free forever. No credit card needed.</p>
          <Link href="/signup" className="btn-primary" style={{fontSize:16,padding:'17px 48px'}}>
            Start free — no credit card
          </Link>
          <p className="cta-trust">✓ Free forever · ✓ No credit card · ✓ 750+ fresh jobs daily</p>
        </div>

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
