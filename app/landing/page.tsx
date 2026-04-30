'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { LogoVegaStar } from '@/components/logo/LogoVegaStar'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

// ─── Register GSAP plugins ────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText)
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityItem {
  emoji: string
  text: string
  time: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MORPH_WORDS = ['scams.', 'scrapers.', 'vendors.', 'middlemen.']

const TICKER_DATA = [
  '5 job sources combined',
  '70+ H1B sponsors verified',
  'AI-powered resume matching',
  'Real-time job updates',
  'Auto cover letter generation',
  'Direct ATS applications',
  'Built for F-1 students',
]

const ACTIVITY_ITEMS: ActivityItem[] = [
  { emoji: '🔥', text: 'Someone in Austin applied to ML Engineer at Stripe', time: '2m ago' },
  { emoji: '✅', text: 'Someone in NYC got an interview at Figma', time: '5m ago' },
  { emoji: '⚡', text: 'Someone in Seattle found H1B role at Microsoft', time: '8m ago' },
  { emoji: '🎉', text: 'Someone in Boston received an offer', time: '12m ago' },
  { emoji: '🔥', text: 'Someone in Chicago applied to Data Scientist', time: '15m ago' },
  { emoji: '✅', text: 'Someone in LA got interview at Notion', time: '18m ago' },
]

const FEATURES = [
  {
    icon: '⚡',
    name: 'Early Bird Detection',
    desc: 'Get alerts the moment a job posts. Beat hundreds by applying in the first hour.',
    tag: 'HOT · Under 6h',
    accent: 'var(--primary)',
  },
  {
    icon: '🎯',
    name: 'AI Resume Match',
    desc: 'Claude AI scores your resume against every listing — with gaps clearly highlighted.',
    tag: '94% accuracy',
    accent: 'var(--accent)',
  },
  {
    icon: '✍️',
    name: 'Cover Letter Gen.',
    desc: 'Personalized, compelling letters written in seconds for every application.',
    tag: '1-click · Instant',
    accent: 'var(--primary)',
  },
  {
    icon: '🎤',
    name: 'Interview Simulator',
    desc: 'AI asks real questions from the job listing. Get scored feedback after every answer.',
    tag: 'Chat-based',
    accent: 'var(--accent)',
  },
  {
    icon: '🌐',
    name: 'H1B Sponsor Filter',
    desc: 'One toggle shows only verified H1B sponsoring companies. Built for international students.',
    tag: '500+ sponsors',
    accent: 'var(--primary)',
  },
  {
    icon: '🗂️',
    name: 'Kanban Tracker',
    desc: 'Drag jobs across a 5-stage board. Never lose track of any application again.',
    tag: '5-stage board',
    accent: 'var(--accent)',
  },
]

const FLOATING_CARDS = [
  { icon: '⚡', title: 'Fresh Jobs', desc: 'Posted in last 24h' },
  { icon: '🤖', title: 'AI Match Score', desc: 'Know your fit instantly' },
  { icon: '✂️', title: 'Tailored Resume', desc: 'ATS keywords baked in' },
  { icon: '🎯', title: 'Interview Prep', desc: 'Likely Q&A generated' },
  { icon: '📊', title: 'Tracker', desc: 'Applied → Offer pipeline' },
]

// ─── Grain noise SVG data URI ─────────────────────────────────────────────────
const GRAIN_URL = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VegaplyPro() {
  const prefersReducedMotion = useReducedMotion()

  // Refs
  const heroRef = useRef<HTMLDivElement>(null)
  const heroHeadlineRef = useRef<HTMLHeadingElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const pinSectionRef = useRef<HTMLElement>(null)
  const pinLeftRef = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const featGridRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const lenisSyncedRef = useRef(false)

  // State
  const [morphWord, setMorphWord] = useState('scams.')
  const [morphVisible, setMorphVisible] = useState(true)
  const [countersStarted, setCountersStarted] = useState(false)
  const [c1, setC1] = useState('0')
  const [c2, setC2] = useState('0h')
  const [c3, setC3] = useState('0min')
  const [floatIdx, setFloatIdx] = useState(0)
  const [ringProgress, setRingProgress] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  // ─── Lenis smooth scroll ────────────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return
    if (typeof window === 'undefined') return

    let lenis: any
    let rafId: number

    const initLenis = async () => {
      try {
        const { default: Lenis } = await import('lenis')
        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
        })

        // Sync Lenis scroll with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add((time: number) => {
          lenis.raf(time * 1000)
        })
        gsap.ticker.lagSmoothing(0)

        lenisSyncedRef.current = true
      } catch {
        // Lenis not installed yet — graceful fallback
        function raf(time: number) {
          rafId = requestAnimationFrame(raf)
        }
        rafId = requestAnimationFrame(raf)
      }
    }

    initLenis()

    return () => {
      if (lenis) lenis.destroy()
      if (rafId) cancelAnimationFrame(rafId)
      gsap.ticker.remove(() => {})
    }
  }, [prefersReducedMotion])

  // ─── Nav scroll state ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ─── Morphing word animation ────────────────────────────────────────────────
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setMorphVisible(false)
      setTimeout(() => {
        i = (i + 1) % MORPH_WORDS.length
        setMorphWord(MORPH_WORDS[i])
        setMorphVisible(true)
      }, 350)
    }, 2400)
    return () => clearInterval(interval)
  }, [])

  // ─── Counter animation ──────────────────────────────────────────────────────
  useEffect(() => {
    const animCount = (
      setter: (v: string) => void,
      target: number,
      suffix = '',
      dur = 2000
    ) => {
      let start: number | null = null
      const step = (ts: number) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / dur, 1)
        const ease = 1 - Math.pow(1 - p, 4)
        setter(Math.round(ease * target).toLocaleString() + suffix)
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !countersStarted) {
          setCountersStarted(true)
          animCount(setC1, 750)
          animCount(setC2, 24, 'h')
          animCount(setC3, 3, 'min')
        }
      },
      { threshold: 0.3 }
    )

    const el = document.getElementById('counters-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [countersStarted])

  // ─── Ring animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setRingProgress(true), 900)
    return () => clearTimeout(t)
  }, [])

  // ─── Floating card rotation ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setFloatIdx(i => (i + 1) % 5), 3000)
    return () => clearInterval(t)
  }, [])

  // ─── Scroll reveal (fallback for non-GSAP elements) ─────────────────────────
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add('in')
            io.unobserve(en.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach(r => io.observe(r))
    return () => io.disconnect()
  }, [])

  // ─── Feature card cursor glow ────────────────────────────────────────────────
  useEffect(() => {
    const feats = document.querySelectorAll('.feat-card')
    feats.forEach(f => {
      f.addEventListener('mousemove', (e: Event) => {
        const me = e as MouseEvent
        const r = (f as HTMLElement).getBoundingClientRect()
        ;(f as HTMLElement).style.setProperty(
          '--fx',
          ((me.clientX - r.left) / r.width) * 100 + '%'
        )
        ;(f as HTMLElement).style.setProperty(
          '--fy',
          ((me.clientY - r.top) / r.height) * 100 + '%'
        )
      })
    })
  }, [])

  // ─── GSAP Animations ─────────────────────────────────────────────────────────
  useGSAP(() => {
    if (prefersReducedMotion) return
    if (typeof window === 'undefined') return

    // Hero headline SplitText char animation
    if (heroHeadlineRef.current) {
      try {
        const split = SplitText.create(heroHeadlineRef.current, {
          type: 'chars,words',
        })
        gsap.from(split.chars, {
          yPercent: 120,
          opacity: 0,
          duration: 0.85,
          stagger: 0.018,
          ease: 'power3.out',
          delay: 0.2,
        })
      } catch {
        // SplitText not available, fallback handled by CSS
      }
    }

    // Hero content fade up
    if (heroContentRef.current) {
      const children = heroContentRef.current.querySelectorAll('.hero-animate')
      gsap.from(children, {
        y: 32,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.6,
      })
    }

    // Nav fade in
    if (navRef.current) {
      gsap.from(navRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.1,
      })
    }

    // ── Pinned "How it works" section ──────────────────────────────────────────
    if (
      pinSectionRef.current &&
      step1Ref.current &&
      step2Ref.current &&
      step3Ref.current
    ) {
      // Set initial states: only step 1 visible
      gsap.set([step2Ref.current, step3Ref.current], { opacity: 0, scale: 0.95, y: 20 })
      gsap.set(step1Ref.current, { opacity: 1, scale: 1, y: 0 })

      // Single timeline with pin + scrub — no separate ScrollTrigger.create
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinSectionRef.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      // Step 1 → Step 2
      tl.to(step1Ref.current, { opacity: 0, scale: 0.95, y: -20, duration: 1 }, 0)
        .to(step2Ref.current, { opacity: 1, scale: 1, y: 0, duration: 1 }, 0.5)
        // Step 2 → Step 3
        .to(step2Ref.current, { opacity: 0, scale: 0.95, y: -20, duration: 1 }, 1.5)
        .to(step3Ref.current, { opacity: 1, scale: 1, y: 0, duration: 1 }, 2)

      // Headline text transitions
      if (headlineRef.current) {
        const headlines = headlineRef.current.querySelectorAll('.pin-headline')
        tl.to(headlines[0], { opacity: 0, y: -16, duration: 0.5 }, 0.1)
          .fromTo(
            headlines[1],
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5 },
            0.5
          )
          .to(headlines[1], { opacity: 0, y: -16, duration: 0.5 }, 1.6)
          .fromTo(
            headlines[2],
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5 },
            2
          )
      }
    }

    // ── Feature grid stagger ────────────────────────────────────────────────────
    if (featGridRef.current) {
      gsap.from(featGridRef.current.querySelectorAll('.feat-card'), {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: featGridRef.current,
          start: 'top 80%',
        },
      })
    }

    // ── Generic section reveals ─────────────────────────────────────────────────
    gsap.utils.toArray<HTMLElement>('.gsap-reveal').forEach(el => {
      gsap.from(el, {
        y: 36,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
      })
    })
  }, [prefersReducedMotion])

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        :root {
          --bg: #0a0a0c;
          --bg-elev: #0f0f12;
          --surface: rgba(255,255,255,0.03);
          --surface-hover: rgba(255, 255, 255, 0.05);
          --border: rgba(255,255,255,0.08);
          --border-strong: rgba(255, 255, 255, 0.14);
          --border-amber: rgba(245, 158, 11, 0.2);
          --text: #ededed;
          --text-dim: #999999;
          --text-dimmer: #555555;
          --primary: #f59e0b;
          --primary-light: #fbbf24;
          --primary-glow: #fbbf24;
          --accent: #fde68a;
          --accent-glow: rgba(245, 158, 11, 0.3);
          --primary-subtle: rgba(245, 158, 11, 0.1);
          --primary-glow-color: rgba(245, 158, 11, 0.25);
          --grad-1: linear-gradient(135deg, #f59e0b 0%, #fde68a 100%);
          --grad-text: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%);
          --success: #10b981;
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
          --radius-2xl: 28px;
          --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
          --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        *,
        *::before,
        *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          background: var(--bg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            sans-serif;
          font-feature-settings: 'ss01', 'cv11';
          color: var(--text);
          overflow-x: hidden;
          line-height: 1.5;
        }

        /* ── SCROLL PROGRESS ───────────────────────────────────────── */
        .scroll-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 1.5px;
          background: var(--grad-1);
          transform-origin: 0%;
          z-index: 9999;
          opacity: 0.8;
        }

        /* ── GRAIN NOISE OVERLAY ───────────────────────────────────── */
        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 5;
          opacity: 0.04;
          background-image: ${GRAIN_URL};
          background-size: 200px 200px;
          mix-blend-mode: overlay;
        }

        /* ── NAV ───────────────────────────────────────────────────── */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 52px;
          height: 64px;
          transition: background 0.3s ease, border-color 0.3s ease,
            backdrop-filter 0.3s ease;
        }

        .nav.scrolled {
          background: rgba(10, 10, 12, 0.75);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border-bottom: 1px solid var(--border);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          color: var(--text);
          flex-shrink: 0;
        }

        .nav-logo-text {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.03em;
          display: flex;
          align-items: center;
          gap: 0;
        }

        .nav-links {
          display: flex;
          gap: 32px;
          list-style: none;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .nav-links a {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.2s ease;
          letter-spacing: -0.01em;
        }

        .nav-links a:hover {
          color: var(--text);
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-signin {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.2s ease;
          letter-spacing: -0.01em;
        }

        .nav-signin:hover {
          color: var(--text);
        }

        .btn-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary);
          color: #0a0a0c;
          border: none;
          padding: 10px 22px;
          border-radius: var(--radius-lg);
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          letter-spacing: -0.01em;
          cursor: pointer;
          text-decoration: none;
          overflow: hidden;
          transition: background 0.2s ease, box-shadow 0.2s ease,
            transform 0.15s ease;
          will-change: transform;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12) 0%,
            transparent 100%
          );
          pointer-events: none;
        }

        .btn-primary:hover {
          background: #fbbf24;
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.5),
            0 8px 24px rgba(245, 158, 11, 0.4);
          transform: translateY(-1px);
        }

        .btn-primary-lg {
          padding: 15px 36px;
          font-size: 16px;
          border-radius: var(--radius-xl);
          border-radius: 100px;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--surface);
          color: var(--text-dim);
          border: 1px solid var(--border);
          padding: 10px 22px;
          border-radius: var(--radius-lg);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          letter-spacing: -0.01em;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, border-color 0.2s ease,
            color 0.2s ease, transform 0.15s ease;
          will-change: transform;
        }

        .btn-ghost:hover {
          background: var(--surface-hover);
          border-color: var(--border-strong);
          color: var(--text);
          transform: translateY(-1px);
        }

        .btn-ghost-lg {
          padding: 15px 36px;
          font-size: 16px;
          border-radius: 100px;
        }

        /* ── HERO ──────────────────────────────────────────────────── */
        .hero {
          position: relative;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 140px 24px 80px;
        }

        .hero-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          filter: brightness(0.4) saturate(1.2);
        }

        .hero-video-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            180deg,
            rgba(10, 10, 12, 0.4) 0%,
            rgba(10, 10, 12, 0.85) 70%,
            rgba(10, 10, 12, 1) 100%
          );
        }

        /* Subtle ambient glow orbs — pure CSS, no 3D */
        .hero-orb-1 {
          position: absolute;
          top: -10%;
          right: -8%;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.18) 0%,
            transparent 65%
          );
          pointer-events: none;
          z-index: 2;
          filter: blur(32px);
          animation: orbFloat 14s ease-in-out infinite;
        }

        .hero-orb-2 {
          position: absolute;
          bottom: -5%;
          left: -8%;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(251, 191, 36, 0.12) 0%,
            transparent 65%
          );
          pointer-events: none;
          z-index: 2;
          filter: blur(28px);
          animation: orbFloat 18s ease-in-out infinite reverse;
        }

        @keyframes orbFloat {
          0%, 100% { transform: scale(1) translate(0, 0); }
          33% { transform: scale(1.06) translate(12px, -16px); }
          66% { transform: scale(0.97) translate(-8px, 10px); }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          max-width: 900px;
          width: 100%;
          overflow: hidden;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 100px;
          padding: 7px 18px 7px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--primary-glow);
          letter-spacing: 0.02em;
          margin-bottom: 40px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 10px #f59e0b;
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.65); }
        }

        .hero-headline {
          font-size: clamp(52px, 7vw, 92px);
          font-weight: 600;
          letter-spacing: -0.04em;
          line-height: 1.0;
          margin-bottom: 24px;
          overflow: hidden;
        }

        .hero-headline .static-text {
          color: var(--text);
        }

        .hero-morph {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          transition: opacity 0.35s ease, transform 0.35s var(--ease-out);
        }

        .hero-morph.hidden {
          opacity: 0;
          transform: translateY(-12px);
        }

        .hero-sub {
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 500;
          color: var(--text);
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          line-height: 1.25;
        }

        .hero-body {
          font-size: 16px;
          color: var(--text-dim);
          line-height: 1.65;
          max-width: 500px;
          margin: 0 auto 44px;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .hero-trust {
          font-size: 13px;
          color: var(--text-dimmer);
          letter-spacing: 0.01em;
        }

        /* ── TICKER ────────────────────────────────────────────────── */
        .ticker-section {
          position: relative;
          z-index: 10;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 14px 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
        }

        .ticker-section::before,
        .ticker-section::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 160px;
          z-index: 2;
          pointer-events: none;
        }

        .ticker-section::before {
          left: 0;
          background: linear-gradient(90deg, var(--bg), transparent);
        }

        .ticker-section::after {
          right: 0;
          background: linear-gradient(270deg, var(--bg), transparent);
        }

        .ticker-inner {
          display: flex;
          width: max-content;
          animation: marquee 36s linear infinite;
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-inner { animation: none; }
        }

        .ticker-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 32px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dim);
          white-space: nowrap;
        }

        .ticker-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #f59e0b;
          flex-shrink: 0;
          box-shadow: 0 0 8px #f59e0b;
        }

        /* ── ACTIVITY FEED ─────────────────────────────────────────── */
        .activity-section {
          padding: 80px 24px;
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .activity-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 16px;
        }

        .activity-headline {
          font-size: clamp(32px, 4vw, 44px);
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: var(--text);
        }

        .activity-feed {
          position: relative;
          height: 340px;
          overflow: hidden;
        }

        .activity-feed::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          z-index: 2;
          background: linear-gradient(180deg, var(--bg), transparent);
        }

        .activity-feed::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 56px;
          z-index: 2;
          background: linear-gradient(0deg, var(--bg), transparent);
        }

        .activity-inner {
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: feedScroll 16s linear infinite;
        }

        @keyframes feedScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .activity-inner { animation: none; }
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 14px 18px;
          backdrop-filter: blur(12px);
        }

        .activity-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--success);
          flex-shrink: 0;
          margin-top: 4px;
          animation: pulse 2s ease infinite;
          box-shadow: 0 0 8px var(--success);
        }

        .activity-text {
          flex: 1;
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.5;
        }

        .activity-time {
          font-size: 11px;
          color: var(--text-dimmer);
          white-space: nowrap;
          padding-top: 2px;
        }

        /* ── SECTION COMMON ────────────────────────────────────────── */
        .section-wrap {
          padding: 96px 52px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 18px;
        }

        .section-title {
          font-size: clamp(36px, 4.5vw, 54px);
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.05;
          color: var(--text);
        }

        .section-title em {
          font-style: normal;
          background: var(--grad-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-body {
          font-size: 16px;
          color: var(--text-dim);
          line-height: 1.65;
          max-width: 580px;
          margin-top: 16px;
        }

        .glow-divider {
          height: 1px;
          max-width: 1100px;
          margin: 0 auto;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(245, 158, 11, 0.35),
            rgba(251, 191, 36, 0.2),
            transparent
          );
        }

        /* ── PINNED HOW SECTION ────────────────────────────────────── */
        .pin-section {
          height: 100vh;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 80px;
          padding: 0 52px;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        .pin-left {
          position: relative;
        }

        .pin-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 20px;
        }

        .pin-headline-wrap {
          position: relative;
          min-height: 6em;
        }

        .pin-headline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.2;
          color: var(--text);
          width: 100%;
        }

        .pin-headline:not(:first-child) {
          opacity: 0;
        }

        .pin-headline em {
          font-style: normal;
          background: var(--grad-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pin-body {
          font-size: 16px;
          color: var(--text-dim);
          line-height: 1.7;
          margin-top: 24px;
          max-width: 420px;
        }

        .pin-steps-nav {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 40px;
        }

        .pin-step-dot {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 0;
          border-left: 1.5px solid var(--border);
          padding-left: 20px;
          position: relative;
          cursor: default;
          transition: border-color 0.3s ease;
        }

        .pin-step-dot::before {
          content: '';
          position: absolute;
          left: -5px;
          top: 20px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }

        .pin-step-dot.active {
          border-left-color: #f59e0b;
        }

        .pin-step-dot.active::before {
          background: #f59e0b;
          box-shadow: 0 0 12px #f59e0b;
        }

        .pin-step-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-dim);
          margin-bottom: 4px;
        }

        .pin-step-desc {
          font-size: 13px;
          color: var(--text-dimmer);
          line-height: 1.55;
        }

        .pin-right {
          position: relative;
          height: 520px;
        }

        .pin-card {
          position: absolute;
          inset: 0;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          will-change: opacity, transform;
          overflow: hidden;
        }

        .pin-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: calc(var(--radius-2xl) + 1px);
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.4),
            transparent 50%
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1px;
          pointer-events: none;
          opacity: 0.5;
        }

        .pin-card-step {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pin-card-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary-subtle);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--primary-glow);
        }

        .pin-card-headline {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: var(--text);
          line-height: 1.2;
        }

        .pin-card-body {
          font-size: 15px;
          color: var(--text-dim);
          line-height: 1.65;
          flex: 1;
        }

        /* Dashboard mockup for step 1 */
        .mock-dashboard {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          flex: 1;
        }

        .mock-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          margin-bottom: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
        }

        .mock-row:last-child { margin-bottom: 0; }

        .mock-company {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mock-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--primary-subtle);
          border: 1px solid rgba(245, 158, 11, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-glow);
        }

        .mock-job-info { display: flex; flex-direction: column; gap: 2px; }
        .mock-job-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .mock-job-company { font-size: 11px; color: var(--text-dimmer); }

        .mock-match {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-glow);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 3px 10px;
          border-radius: 100px;
        }

        /* Typing animation for step 2 */
        .mock-letter {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          flex: 1;
          font-size: 13px;
          color: var(--text-dim);
          line-height: 1.7;
          position: relative;
          overflow: hidden;
        }

        .mock-letter-header {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-dimmer);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .typing-cursor::after {
          content: '|';
          animation: blink 1s ease infinite;
          color: #f59e0b;
          font-weight: 300;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Notifications for step 3 */
        .mock-notifications {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mock-notif {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: notifSlide 0.4s ease forwards;
        }

        .mock-notif:nth-child(2) { animation-delay: 0.5s; opacity: 0; }
        .mock-notif:nth-child(3) { animation-delay: 1s; opacity: 0; }

        @keyframes notifSlide {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .notif-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
        }

        .notif-text { flex: 1; }
        .notif-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .notif-sub { font-size: 12px; color: var(--text-dimmer); margin-top: 2px; }

        /* ── SOCIAL PROOF LOGOS ────────────────────────────────────── */
        .logo-marquee-section {
          padding: 64px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          overflow: hidden;
          position: relative;
        }

        .logo-marquee-section::before,
        .logo-marquee-section::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 120px;
          z-index: 2;
          pointer-events: none;
        }

        .logo-marquee-section::before {
          left: 0;
          background: linear-gradient(90deg, var(--bg), transparent);
        }

        .logo-marquee-section::after {
          right: 0;
          background: linear-gradient(270deg, var(--bg), transparent);
        }

        .logo-marquee-label {
          text-align: center;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dimmer);
          margin-bottom: 28px;
        }

        .logo-row {
          display: flex;
          width: max-content;
          gap: 0;
        }

        .logo-row-1 {
          animation: marquee 28s linear infinite;
        }

        .logo-row-2 {
          animation: marquee 36s linear infinite reverse;
          margin-top: 16px;
        }

        .logo-item {
          display: flex;
          align-items: center;
          padding: 0 40px;
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.2);
          letter-spacing: -0.02em;
          white-space: nowrap;
          text-transform: uppercase;
          transition: color 0.3s ease;
        }

        .logo-item:hover {
          color: rgba(255, 255, 255, 0.55);
        }

        /* ── COUNTERS ──────────────────────────────────────────────── */
        .counters-section {
          padding: 80px 52px;
          max-width: 900px;
          margin: 0 auto;
        }

        .counters-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          overflow: hidden;
        }

        .counter-cell {
          background: var(--bg-elev);
          padding: 40px 32px;
          text-align: center;
          transition: background 0.2s ease;
        }

        .counter-cell:hover {
          background: rgba(245, 158, 11, 0.05);
        }

        .counter-number {
          font-size: 52px;
          font-weight: 700;
          letter-spacing: -0.04em;
          background: var(--grad-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
          line-height: 1;
          margin-bottom: 10px;
        }

        .counter-label {
          font-size: 13px;
          color: var(--text-dimmer);
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        /* ── JOB CARDS ─────────────────────────────────────────────── */
        .job-cards-section {
          padding: 0 52px 96px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .job-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 48px;
        }

        .job-card {
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 28px;
          transition: border-color 0.25s ease, box-shadow 0.25s ease,
            transform 0.2s ease;
          position: relative;
          overflow: hidden;
          cursor: default;
          will-change: transform;
        }

        .job-card:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.1),
            0 20px 48px rgba(0, 0, 0, 0.4);
          transform: translateY(-4px);
        }

        .job-hot-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.04em;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
        }

        .job-company-logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 16px;
          background: var(--primary-subtle);
          color: var(--primary-glow);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .job-company-logo.accent {
          background: rgba(245, 158, 11, 0.08);
          color: var(--accent);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .job-title {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--text);
          margin-bottom: 6px;
        }

        .job-company {
          font-size: 13px;
          color: var(--text-dimmer);
          margin-bottom: 16px;
          font-weight: 400;
        }

        .job-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }

        .job-tag {
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 100px;
        }

        .tag-primary {
          background: var(--primary-subtle);
          color: var(--primary-glow);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .tag-accent {
          background: rgba(245, 158, 11, 0.08);
          color: #fde68a;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .tag-neutral {
          background: var(--surface);
          color: var(--text-dim);
          border: 1px solid var(--border);
        }

        .job-match-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .job-match-label {
          font-size: 11px;
          color: var(--text-dimmer);
          margin-top: 2px;
        }

        .job-match-pct {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        /* ── FEATURE GRID ──────────────────────────────────────────── */
        .feat-section {
          padding: 96px 52px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 52px;
        }

        .feat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 32px;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: border-color 0.25s ease, background 0.25s ease,
            transform 0.2s var(--ease-out), box-shadow 0.25s ease;
          will-change: transform;
        }

        .feat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at var(--fx, 50%) var(--fy, 50%),
            rgba(245, 158, 11, 0.08) 0%,
            transparent 60%
          );
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
          border-radius: var(--radius-2xl);
        }

        .feat-card:hover::after {
          opacity: 1;
        }

        .feat-card:hover {
          border-color: rgba(245, 158, 11, 0.28);
          background: rgba(245, 158, 11, 0.04);
          transform: translateY(-4px);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.08),
            0 16px 40px rgba(0, 0, 0, 0.35);
        }

        .feat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-bottom: 20px;
          background: var(--primary-subtle);
          border: 1px solid rgba(245, 158, 11, 0.18);
          transition: transform 0.3s var(--ease-out);
          will-change: transform;
        }

        .feat-card:hover .feat-icon-wrap {
          transform: scale(1.1) rotate(-4deg);
        }

        .feat-card-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .feat-card-body {
          font-size: 14px;
          color: var(--text-dim);
          line-height: 1.65;
          font-weight: 400;
        }

        .feat-tag {
          display: inline-block;
          margin-top: 16px;
          background: var(--primary-subtle);
          border: 1px solid rgba(245, 158, 11, 0.18);
          color: var(--primary-glow);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.02em;
        }

        /* ── PRICING ───────────────────────────────────────────────── */
        .pricing-section {
          padding: 96px 52px;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 52px;
          text-align: left;
        }

        .pricing-card {
          border-radius: var(--radius-2xl);
          padding: 40px;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s var(--ease-out),
            box-shadow 0.3s ease;
          will-change: transform;
        }

        .pricing-card:hover {
          transform: translateY(-6px);
        }

        .pricing-free {
          background: var(--bg-elev);
          border: 1px solid var(--border);
        }

        .pricing-free:hover {
          border-color: var(--border-strong);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.35);
        }

        .pricing-pro {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1) 0%,
            rgba(251, 191, 36, 0.04) 100%
          );
          border: 1px solid rgba(245, 158, 11, 0.4);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.1),
            0 20px 56px rgba(245, 158, 11, 0.12);
        }

        .pricing-pro:hover {
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2),
            0 28px 72px rgba(245, 158, 11, 0.2);
        }

        .pricing-pro::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(245, 158, 11, 0.9),
            rgba(251, 191, 36, 0.7),
            transparent
          );
        }

        .pricing-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--primary);
          color: #0a0a0c;
          font-size: 10px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 100px;
          letter-spacing: 0.06em;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
        }

        .pricing-tier-label {
          font-size: 12px;
          color: var(--text-dimmer);
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .pricing-price {
          font-size: 56px;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--text);
          line-height: 1;
          margin-bottom: 4px;
        }

        .pricing-price.gradient {
          background: var(--grad-1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pricing-period {
          font-size: 13px;
          color: var(--text-dimmer);
          margin-bottom: 28px;
        }

        .pricing-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 24px;
        }

        .pricing-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        .pricing-feature {
          font-size: 13px;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 400;
        }

        .feature-check {
          color: var(--success);
          font-size: 14px;
          flex-shrink: 0;
          font-weight: 600;
        }

        .feature-locked {
          color: var(--text-dimmer);
        }

        .feature-x {
          color: var(--text-dimmer);
          font-size: 14px;
          flex-shrink: 0;
        }

        .pricing-cta-note {
          font-size: 11px;
          color: var(--text-dimmer);
          text-align: center;
          margin-top: 12px;
          letter-spacing: 0.02em;
        }

        /* ── FOUNDER NOTE ──────────────────────────────────────────── */
        .founder-section {
          padding: 80px 52px;
          max-width: 760px;
          margin: 0 auto;
        }

        .founder-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--primary);
          text-align: center;
          margin-bottom: 16px;
        }

        .founder-headline {
          font-size: clamp(28px, 3.5vw, 40px);
          font-weight: 600;
          letter-spacing: -0.03em;
          text-align: center;
          color: var(--text);
          margin-bottom: 44px;
          line-height: 1.2;
        }

        .founder-card {
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 44px;
          position: relative;
          overflow: hidden;
        }

        .founder-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(245, 158, 11, 0.6),
            rgba(251, 191, 36, 0.4),
            transparent
          );
        }

        .founder-quote-mark {
          font-size: 80px;
          font-weight: 700;
          color: rgba(245, 158, 11, 0.15);
          line-height: 0.8;
          margin-bottom: 24px;
          font-family: Georgia, serif;
        }

        .founder-body {
          font-size: 17px;
          line-height: 1.75;
          color: rgba(237, 237, 237, 0.78);
          font-style: italic;
        }

        .founder-body p {
          margin-bottom: 18px;
        }

        .founder-body p:last-of-type {
          margin-bottom: 28px;
        }

        .founder-sig {
          font-size: 14px;
          color: var(--text-dim);
          font-style: normal;
          font-weight: 500;
        }

        .founder-sig small {
          display: block;
          font-size: 12px;
          color: var(--text-dimmer);
          font-weight: 400;
          margin-top: 4px;
        }

        /* ── CTA SECTION ───────────────────────────────────────────── */
        .cta-section {
          padding: 120px 52px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-glow {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 1000px;
          height: 500px;
          background: radial-gradient(
            ellipse,
            rgba(245, 158, 11, 0.14) 0%,
            transparent 65%
          );
          pointer-events: none;
          animation: ctaPulse 7s ease-in-out infinite;
        }

        @keyframes ctaPulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
        }

        .cta-headline {
          position: relative;
          font-size: clamp(36px, 5vw, 68px);
          font-weight: 600;
          letter-spacing: -0.04em;
          line-height: 1.0;
          color: var(--text);
          max-width: 700px;
          margin: 0 auto 20px;
        }

        .cta-sub {
          position: relative;
          font-size: 17px;
          color: var(--text-dim);
          max-width: 440px;
          margin: 0 auto 44px;
          line-height: 1.65;
          font-weight: 400;
        }

        .cta-buttons {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .cta-trust {
          position: relative;
          font-size: 13px;
          color: var(--text-dimmer);
        }

        /* ── FOOTER ────────────────────────────────────────────────── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 44px 52px;
          background: var(--bg-elev);
        }

        .footer-top {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
          margin-bottom: 48px;
        }

        .footer-brand p {
          font-size: 13px;
          color: var(--text-dimmer);
          line-height: 1.65;
          margin-top: 14px;
          max-width: 240px;
        }

        .footer-col-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 10px;
          list-style: none;
        }

        .footer-links a {
          font-size: 13px;
          color: var(--text-dimmer);
          text-decoration: none;
          transition: color 0.2s ease;
          font-weight: 400;
        }

        .footer-links a:hover {
          color: var(--text-dim);
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }

        .footer-copy {
          font-size: 13px;
          color: var(--text-dimmer);
        }

        .footer-legal {
          display: flex;
          gap: 24px;
        }

        .footer-legal a {
          font-size: 13px;
          color: var(--text-dimmer);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-legal a:hover {
          color: var(--text-dim);
        }

        /* ── REVEAL ANIMATIONS ─────────────────────────────────────── */
        .reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.7s var(--ease-out),
            transform 0.7s var(--ease-out);
          will-change: opacity, transform;
        }

        .reveal.in {
          opacity: 1;
          transform: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .hero-orb-1, .hero-orb-2 { animation: none; }
          .cta-glow { animation: none; }
        }

        /* ── FLOATING CARD ─────────────────────────────────────────── */
        .how-floating-card {
          background: rgba(15, 15, 18, 0.92);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 14px 16px;
          backdrop-filter: blur(20px);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.4);
          will-change: transform, opacity;
        }

        .how-floating-card h3 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 5px;
          letter-spacing: -0.02em;
        }

        .how-floating-card p {
          font-size: 12px;
          color: var(--text-dimmer);
          line-height: 1.45;
        }

        /* ── MOBILE ────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .nav { padding: 0 20px; }
          .nav-links { display: none; }

          .hero { padding: 110px 20px 60px; }
          .hero-headline { font-size: clamp(40px, 10vw, 60px); }

          .activity-section {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 60px 20px;
          }

          .pin-section {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 48px 20px;
            min-height: auto;
          }

          .section-wrap { padding: 60px 20px; }

          .feat-section { padding: 60px 20px; }
          .feat-grid { grid-template-columns: 1fr; }

          .counters-section { padding: 60px 20px; }
          .counters-grid { grid-template-columns: 1fr; }

          .job-cards-section { padding: 0 20px 60px; }
          .job-cards-grid { grid-template-columns: 1fr; }

          .pricing-section { padding: 60px 20px; }
          .pricing-grid { grid-template-columns: 1fr; }

          .founder-section { padding: 60px 20px; }
          .founder-card { padding: 28px; }

          .cta-section { padding: 80px 20px; }

          .footer { padding: 40px 20px; }
          .footer-top { grid-template-columns: 1fr 1fr; gap: 28px; }

          .logo-marquee-section { padding: 40px 0; }
        }

        @media (max-width: 480px) {
          .footer-top { grid-template-columns: 1fr; }
          .pricing-price { font-size: 44px; }
        }
      `}</style>

      {/* Grain overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Scroll progress bar */}
      <motion.div
        className="scroll-bar"
        style={{
          scaleX: 0,
          originX: 0,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 0 }}
        // Will be driven by scroll in real impl
      />

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className={`nav${navScrolled ? ' scrolled' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <Link href="/" className="nav-logo" aria-label="Vegaply home">
          <LogoVegaStar size={28} />
          <span className="nav-logo-text">
            <span style={{ color: '#fff', fontWeight: 700 }}>Vega</span>
            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>ply</span>
          </span>
        </Link>

        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#stories">Stories</a>
          </li>
        </ul>

        <div className="nav-right">
          <Link href="/login" className="nav-signin">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="hero" aria-label="Hero">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="hero-video"
          aria-hidden="true"
          onError={(e) => {
            // Fallback source on error
            const target = e.currentTarget
            target.src =
              'https://assets.codepen.io/3364143/abstract-bg.mp4'
          }}
        >
          <source
            src="https://videos.pexels.com/video-files/3129957/3129957-uhd_3840_2160_25fps.mp4"
            type="video/mp4"
          />
        </video>

        {/* Overlay gradient */}
        <div className="hero-video-overlay" aria-hidden="true" />

        {/* Ambient orbs */}
        <div className="hero-orb-1" aria-hidden="true" />
        <div className="hero-orb-2" aria-hidden="true" />

        <div ref={heroContentRef} className="hero-content">
          {/* Eyebrow chip */}
          <div className="hero-eyebrow hero-animate">
            <span className="eyebrow-dot" aria-hidden="true" />
            AI-powered · Now live at vegaply.com
          </div>

          {/* Main headline with morphing word */}
          <h1 ref={heroHeadlineRef} className="hero-headline">
            <span className="static-text">Skip the </span>
            <span
              className={`hero-morph${morphVisible ? '' : ' hidden'}`}
              aria-live="polite"
              aria-label={`Skip the ${morphWord}`}
            >
              {morphWord}
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="hero-sub hero-animate">
            Stop applying. Start getting interviews.
          </p>

          {/* Body */}
          <p className="hero-body hero-animate">
            Vegaply does your entire job search — better, faster, smarter.
          </p>

          {/* CTA row */}
          <div className="hero-cta-row hero-animate">
            <Link href="/signup" className="btn-primary btn-primary-lg">
              Start free →
            </Link>
            <button className="btn-ghost btn-ghost-lg">Watch demo</button>
          </div>

          {/* Trust line */}
          <p className="hero-trust hero-animate">
            Built by an F-1 student · 70+ H1B sponsors verified
          </p>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────────────────────── */}
      <div className="ticker-section" aria-hidden="true">
        <div className="ticker-inner">
          {[...TICKER_DATA, ...TICKER_DATA].map((d, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-dot" />
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* ── ACTIVITY FEED ──────────────────────────────────────────────────────── */}
      <div className="activity-section reveal" id="activity">
        {/* Left: headline */}
        <div>
          <p className="activity-label">Live activity</p>
          <h2 className="activity-headline">
            What&apos;s happening on Vegaply right now.
          </h2>
          <p className="section-body" style={{ marginTop: 16 }}>
            Thousands of students are landing roles at top companies while you
            read this. Join them.
          </p>
        </div>

        {/* Right: feed */}
        <div className="activity-feed" aria-live="polite">
          <div className="activity-inner">
            {[...ACTIVITY_ITEMS, ...ACTIVITY_ITEMS].map((item, i) => (
              <div key={i} className="activity-item">
                <span className="activity-indicator" aria-hidden="true" />
                <span className="activity-text">
                  {item.emoji} {item.text}
                </span>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COUNTERS ───────────────────────────────────────────────────────────── */}
      <div className="counters-section gsap-reveal" id="counters-section">
        <div className="counters-grid">
          <div className="counter-cell">
            <span className="counter-number">{c1}</span>
            <span className="counter-label">Fresh jobs updated daily</span>
          </div>
          <div className="counter-cell">
            <span className="counter-number">{c2}</span>
            <span className="counter-label">Early Bird window</span>
          </div>
          <div className="counter-cell">
            <span className="counter-number">{c3}</span>
            <span className="counter-label">Avg resume tailoring time</span>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── JOB CARDS (Live feed) ──────────────────────────────────────────────── */}
      <div className="job-cards-section reveal" id="features">
        <p className="eyebrow">Live job feed</p>
        <h2 className="section-title">
          Jobs that are <em>actually</em> fresh.
        </h2>
        <p className="section-body">
          We index 70+ H1B sponsoring companies in real time. You see
          listings before most job boards even refresh.
        </p>

        <div className="job-cards-grid">
          {/* Card 1 */}
          <motion.div
            className="job-card"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="job-hot-badge">🔥 HOT</span>
            <div className="job-company-logo">G</div>
            <div className="job-title">Senior ML Engineer</div>
            <div className="job-company">Google · Mountain View, CA</div>
            <div className="job-tags">
              <span className="job-tag tag-primary">2h ago — still early!</span>
              <span className="job-tag tag-accent">H1B Friendly</span>
              <span className="job-tag tag-neutral">$180k–220k</span>
            </div>
            <div className="job-match-row">
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="100.5"
                  transform="rotate(-90 22 22)"
                  initial={{ strokeDashoffset: 100.5 }}
                  animate={{ strokeDashoffset: ringProgress ? 6 : 100.5 }}
                  transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: 0.5 }}
                />
              </svg>
              <div>
                <div className="job-match-pct" style={{ color: '#f59e0b' }}>
                  94%
                </div>
                <div className="job-match-label">Resume match</div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            className="job-card"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="job-company-logo accent">A</div>
            <div className="job-title">Product Designer</div>
            <div className="job-company">Airbnb · Remote</div>
            <div className="job-tags">
              <span className="job-tag tag-accent">Easy Apply</span>
              <span className="job-tag tag-neutral">$130k–160k</span>
            </div>
            <div className="job-match-row">
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="100.5"
                  transform="rotate(-90 22 22)"
                  initial={{ strokeDashoffset: 100.5 }}
                  animate={{ strokeDashoffset: ringProgress ? 25 : 100.5 }}
                  transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: 0.65 }}
                />
              </svg>
              <div>
                <div className="job-match-pct" style={{ color: '#fbbf24' }}>
                  76%
                </div>
                <div className="job-match-label">Resume match</div>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            className="job-card"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="job-hot-badge">🔥 HOT</span>
            <div className="job-company-logo">S</div>
            <div className="job-title">Staff Frontend Eng.</div>
            <div className="job-company">Stripe · New York, NY</div>
            <div className="job-tags">
              <span className="job-tag tag-primary">4h ago — still early!</span>
              <span className="job-tag tag-neutral">$160k–200k</span>
            </div>
            <div className="job-match-row">
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="16"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="100.5"
                  transform="rotate(-90 22 22)"
                  initial={{ strokeDashoffset: 100.5 }}
                  animate={{ strokeDashoffset: ringProgress ? 12 : 100.5 }}
                  transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1], delay: 0.8 }}
                />
              </svg>
              <div>
                <div className="job-match-pct" style={{ color: '#f59e0b' }}>
                  88%
                </div>
                <div className="job-match-label">Resume match</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── PINNED HOW IT WORKS ────────────────────────────────────────────────── */}
      <section
        ref={pinSectionRef}
        className="pin-section"
        id="how"
        aria-label="How it works"
      >
        {/* Left: sticky text */}
        <div ref={pinLeftRef} className="pin-left">
          <p className="pin-eyebrow">How it works</p>

          {/* Switching headlines */}
          <div ref={headlineRef} className="pin-headline-wrap">
            <h2 className="pin-headline">
              We index <em>70+ H1B sponsors</em> and match every job to your
              profile.
            </h2>
            <h2 className="pin-headline">
              We auto-apply with <em>tailored resumes</em> and cover letters.
            </h2>
            <h2 className="pin-headline">
              You get <em>interviews.</em> Not noise.
            </h2>
          </div>

          <p className="pin-body">
            Most job boards only show listings. Vegaply finds fresh roles,
            scores your match, tailors your resume, and applies — all from one
            smart dashboard.
          </p>

          {/* Step progress nav */}
          <div className="pin-steps-nav" role="list">
            <div className="pin-step-dot active" role="listitem">
              <div>
                <div className="pin-step-label">Step 1 — Match</div>
                <div className="pin-step-desc">
                  We index 70+ H1B sponsors and match every job to your profile.
                </div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 2 — Apply</div>
                <div className="pin-step-desc">
                  We auto-apply with tailored resumes and cover letters.
                </div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 3 — Win</div>
                <div className="pin-step-desc">
                  You get interviews. Not noise.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: changing visual cards */}
        <div className="pin-right">
          {/* Step 1: Match — Dashboard mockup */}
          <div ref={step1Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">1</div>
              Match
            </div>
            <h3 className="pin-card-headline">
              70+ H1B sponsors, matched to you.
            </h3>
            <p className="pin-card-body">
              Our AI scores your resume against every fresh listing and surfaces
              only the roles where you actually have a shot.
            </p>
            <div className="mock-dashboard">
              <div className="mock-row">
                <div className="mock-company">
                  <div className="mock-logo">S</div>
                  <div className="mock-job-info">
                    <div className="mock-job-title">Data Analyst</div>
                    <div className="mock-job-company">Stripe · Remote</div>
                  </div>
                </div>
                <span className="mock-match">94% match</span>
              </div>
              <div className="mock-row">
                <div className="mock-company">
                  <div className="mock-logo">G</div>
                  <div className="mock-job-info">
                    <div className="mock-job-title">ML Engineer</div>
                    <div className="mock-job-company">Google · Mountain View</div>
                  </div>
                </div>
                <span className="mock-match">88% match</span>
              </div>
              <div className="mock-row">
                <div className="mock-company">
                  <div className="mock-logo">D</div>
                  <div className="mock-job-info">
                    <div className="mock-job-title">Business Analyst</div>
                    <div className="mock-job-company">Deloitte · Dallas</div>
                  </div>
                </div>
                <span
                  className="mock-match"
                  style={{
                    color: 'var(--text-dim)',
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  76% match
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Apply — Typing cover letter */}
          <div ref={step2Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">2</div>
              Apply
            </div>
            <h3 className="pin-card-headline">
              Tailored cover letter, written instantly.
            </h3>
            <p className="pin-card-body">
              Vegaply rewrites your resume for each opening and generates a
              personalized cover letter — all in one click.
            </p>
            <div className="mock-letter">
              <div className="mock-letter-header">Cover letter · Stripe DA role</div>
              <span className="typing-cursor">
                Dear Hiring Manager, I am excited to apply for the Data
                Analyst role at Stripe. My 3 years of Python and SQL
                experience aligns perfectly with your requirements for
                data-driven decision making...
              </span>
            </div>
          </div>

          {/* Step 3: Win — Interview notifications */}
          <div ref={step3Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">3</div>
              Win
            </div>
            <h3 className="pin-card-headline">
              Interviews arrive. Not silence.
            </h3>
            <p className="pin-card-body">
              Apply faster than the competition, tailored for every role. You
              show up prepared. The offers follow.
            </p>
            <div className="mock-notifications">
              <div className="mock-notif">
                <div className="notif-icon">🎉</div>
                <div className="notif-text">
                  <div className="notif-title">Interview scheduled</div>
                  <div className="notif-sub">Stripe — Data Analyst · Tomorrow 2pm</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon">📞</div>
                <div className="notif-text">
                  <div className="notif-title">Recruiter reached out</div>
                  <div className="notif-sub">Google — ML Engineer · Today</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon">✅</div>
                <div className="notif-text">
                  <div className="notif-title">Offer received</div>
                  <div className="notif-sub">Microsoft · $165k + H1B sponsored</div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating labels */}
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '-130px',
              width: '148px',
              zIndex: 20,
              display: 'none',
            }}
            className="how-floating-side"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`fl-${floatIdx}`}
                className="how-floating-card"
                initial={{ opacity: 0, y: 10, x: -6 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -8, x: 4 }}
                transition={{ duration: 0.44, ease: 'easeInOut' }}
              >
                <h3>
                  {FLOATING_CARDS[floatIdx].icon}{' '}
                  {FLOATING_CARDS[floatIdx].title}
                </h3>
                <p>{FLOATING_CARDS[floatIdx].desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── SOCIAL PROOF LOGO MARQUEE ──────────────────────────────────────────── */}
      <div className="logo-marquee-section" aria-label="Trusted by job seekers at">
        <p className="logo-marquee-label">
          Trusted by job seekers landing roles at
        </p>
        <div style={{ overflow: 'hidden' }}>
          <div className="logo-row logo-row-1">
            {[
              'Google',
              'Meta',
              'Microsoft',
              'Amazon',
              'Apple',
              'Nvidia',
              'Stripe',
              'Vercel',
              'Netflix',
              'Salesforce',
              'Google',
              'Meta',
              'Microsoft',
              'Amazon',
              'Apple',
              'Nvidia',
              'Stripe',
              'Vercel',
              'Netflix',
              'Salesforce',
            ].map((name, i) => (
              <span key={i} className="logo-item">
                {name}
              </span>
            ))}
          </div>
          <div className="logo-row logo-row-2">
            {[
              'Figma',
              'Notion',
              'Linear',
              'Dropbox',
              'Airbnb',
              'Lyft',
              'Coinbase',
              'Robinhood',
              'Databricks',
              'Palantir',
              'Figma',
              'Notion',
              'Linear',
              'Dropbox',
              'Airbnb',
              'Lyft',
              'Coinbase',
              'Robinhood',
              'Databricks',
              'Palantir',
            ].map((name, i) => (
              <span key={i} className="logo-item">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURE GRID ───────────────────────────────────────────────────────── */}
      <div className="feat-section reveal" id="feat-section">
        <p className="eyebrow">Everything you need</p>
        <h2 className="section-title">
          Six tools. One <em>unfair</em> advantage.
        </h2>
        <p className="section-body">
          From discovery to offer, Vegaply handles every step of the modern job
          search so you can focus on preparing.
        </p>

        <div ref={featGridRef} className="feat-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              className="feat-card"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="feat-icon-wrap">{f.icon}</div>
              <h3 className="feat-card-title">{f.name}</h3>
              <p className="feat-card-body">{f.desc}</p>
              <span className="feat-tag">{f.tag}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── FOUNDER NOTE ───────────────────────────────────────────────────────── */}
      <div className="founder-section reveal" id="stories">
        <p className="founder-eyebrow">From the founder</p>
        <h2 className="founder-headline">
          I&apos;m building Vegaply because I needed it.
        </h2>

        <div className="founder-card">
          <div className="founder-quote-mark" aria-hidden="true">
            &ldquo;
          </div>
          <div className="founder-body">
            <p>
              I&rsquo;m Roshan — an F-1 student at the University of Houston. I
              watched my friends pay $300/month to shady WhatsApp &ldquo;career
              consultants&rdquo; who blasted out 40 garbage applications a day
              on their behalf. The applications were generic. The job matches
              were random. The results were brutal.
            </p>
            <p>There had to be a better way. So I built one.</p>
            <div className="founder-sig">
              — Roshan, founder
              <small>F-1 student · University of Houston</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRICING ────────────────────────────────────────────────────────────── */}
      <div className="pricing-section reveal" id="pricing">
        <p className="eyebrow">Pricing</p>
        <h2 className="section-title">
          Simple. <em>Transparent.</em>
        </h2>
        <p className="section-body" style={{ margin: '16px auto 0', textAlign: 'center' }}>
          Start free forever. Upgrade when you want to apply on autopilot.
        </p>

        <div className="pricing-grid">
          {/* FREE */}
          <div className="pricing-card pricing-free">
            <div className="pricing-tier-label">Free forever</div>
            <div className="pricing-price">$0</div>
            <div className="pricing-period">For students testing the water</div>
            <div className="pricing-divider" />
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                750+ fresh jobs daily
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Early Bird mode (24h jobs)
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                AI Resume Match score
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Cover letter generator
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Skill gap analysis
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Interview simulator
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                H1B sponsor filter
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Kanban job tracker
              </li>
              <li className="pricing-feature feature-locked">
                <span className="feature-x">✗</span>
                Smart Apply (auto-prep)
              </li>
              <li className="pricing-feature feature-locked">
                <span className="feature-x">✗</span>
                Under 10 applicants tab
              </li>
              <li className="pricing-feature feature-locked">
                <span className="feature-x">✗</span>
                30 auto-applies per day
              </li>
              <li className="pricing-feature feature-locked">
                <span className="feature-x">✗</span>
                Priority job alerts
              </li>
            </ul>
            <Link
              href="/signup"
              className="btn-ghost"
              style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
            >
              Get Started Free
            </Link>
          </div>

          {/* PRO */}
          <div className="pricing-card pricing-pro">
            <div className="pricing-badge">⚡ Most popular</div>
            <div className="pricing-price gradient">$9.99</div>
            <div className="pricing-period">
              For students serious about landing H1B
            </div>
            <div className="pricing-divider" />
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Everything in Free
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                <strong>Smart Apply</strong> — AI preps full application
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                <strong>Under 10 applicants</strong> tab
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                <strong>30 auto-applies</strong> per day
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Competition radar per job
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Priority email alerts
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Resume version manager
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Early access to new features
              </li>
            </ul>
            <Link
              href="/signup"
              className="btn-primary btn-primary-lg"
              style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
            >
              Start Pro — $9.99/mo
            </Link>
            <p className="pricing-cta-note">
              Coming soon · Join waitlist now
            </p>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── CTA SECTION ────────────────────────────────────────────────────────── */}
      <section className="cta-section reveal" aria-label="Call to action">
        <div className="cta-glow" aria-hidden="true" />
        <h2 className="cta-headline">Stop applying. Start getting interviews.</h2>
        <p className="cta-sub">
          Stop scrolling LinkedIn at 2 AM. Let AI do the heavy lifting while
          you sleep.
        </p>
        <div className="cta-buttons">
          <Link href="/signup" className="btn-primary btn-primary-lg">
            Start free — no credit card
          </Link>
          <Link href="/login" className="btn-ghost btn-ghost-lg">
            Sign in →
          </Link>
        </div>
        <p className="cta-trust">
          ✓ Built by an F-1 student · ✓ 70+ H1B sponsors verified · ✓ Free to
          start
        </p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <footer className="footer" role="contentinfo">
        <div className="footer-top">
          {/* Brand */}
          <div className="footer-brand">
            <Link href="/" className="nav-logo" aria-label="Vegaply home">
              <LogoVegaStar size={24} />
              <span className="nav-logo-text">
                <span style={{ color: '#fff', fontWeight: 700 }}>Vega</span>
                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>ply</span>
              </span>
            </Link>
            <p>
              AI-powered job search for international students. Find, match,
              and apply to H1B-sponsoring roles — faster than anyone else.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="footer-col-label">Product</div>
            <ul className="footer-links">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#how">How it works</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <Link href="/signup">Get started</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <div className="footer-col-label">Resources</div>
            <ul className="footer-links">
              <li>
                <a href="#stories">Stories</a>
              </li>
              <li>
                <a href="#activity">Live feed</a>
              </li>
              <li>
                <Link href="/signup">Join waitlist</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="footer-col-label">Contact</div>
            <ul className="footer-links">
              <li>
                <a href="mailto:support@vegaply.com">support@vegaply.com</a>
              </li>
              <li>
                <Link href="/privacy">Privacy policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of service</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Vegaply</span>
          <div className="footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:support@vegaply.com">Contact</a>
          </div>
        </div>
      </footer>
    </>
  )
}
