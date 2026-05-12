'use client'
import "./landing.css"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { LogoVegaStar } from '@/components/logo/LogoVegaStar'
import { X, Zap, Target, FileText, Mail, Globe2, LayoutGrid } from 'lucide-react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'

const GlobeHero = dynamic(
  () => import('@/components/landing/Globe').then(m => m.GlobeHero),
  { ssr: false }
)
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

// ─── Register GSAP plugins ────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText)
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MORPH_WORDS = [
  'Fresh roles before the crowd',
  'Resume-job match intelligence',
  'Tailored resumes in under 1 minute',
  'Daily Packs ready before sunrise',
  'Applications prepared while you sleep',
]

const TICKER_DATA = [
  'Matched roles, scored against your resume',
  'Tailored resume per job — in under 60s',
  'Daily Pack delivered to Gmail every morning',
  'Early Bird roles surfaced before the crowd',
  'Cover letter generated per application',
  'Application tracking, built in',
  'H1B-friendly roles filtered automatically',
]

const FEATURES = [
  {
    icon: <Zap size={20} />,
    name: 'Early Bird Detection',
    desc: 'Surface roles the moment they post. Be first — not just fast.',
    tag: 'Under 6h old',
  },
  {
    icon: <Target size={20} />,
    name: 'Description Match',
    desc: 'Every role scored against your resume before you see it. Know your fit before you invest a minute.',
    tag: 'Resume-scored',
  },
  {
    icon: <FileText size={20} />,
    name: 'Resume Generator',
    desc: 'Your resume rewritten for each role — keywords aligned, skills surfaced, ATS-ready. In under a minute.',
    tag: 'Per-job tailored',
  },
  {
    icon: <Mail size={20} />,
    name: 'Cover Letter',
    desc: 'A focused, role-specific cover letter alongside your resume. No generic templates.',
    tag: 'Per-job · Instant',
  },
  {
    icon: <Globe2 size={20} />,
    name: 'H1B Role Filter',
    desc: 'One filter shows only H1B-friendly roles. Built for international students who need signal, not noise.',
    tag: 'H1B-friendly',
  },
  {
    icon: <LayoutGrid size={20} />,
    name: 'Application Tracker',
    desc: 'Every pack you review is tracked automatically. See what you opened, clicked, and where you stand.',
    tag: '5-stage board',
  },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'Match',
    desc: 'We scan job sources daily and score every listing against your resume. You see only roles where you have a real shot.',
  },
  {
    num: '02',
    title: 'Tailor',
    desc: 'AI rewrites your resume and cover letter for each role — ATS keywords, skills alignment, tone. No copy-pasting.',
  },
  {
    num: '03',
    title: 'Deliver',
    desc: 'Your Daily Pack arrives in Gmail each morning — tailored materials and a one-click apply link, ready to review.',
  },
  {
    num: '04',
    title: 'Track',
    desc: 'Every application logged. Every click tracked. Your pipeline visible at a glance.',
  },
]

const QUEUE_PREVIEW_ROWS = [
  { company: 'S', title: 'Data Analyst', co: 'Stripe · Remote', score: 94, status: 'ready' },
  { company: 'G', title: 'ML Engineer', co: 'Google · Mountain View', score: 88, status: 'ready' },
  { company: 'N', title: 'Product Manager', co: 'Notion · SF', score: 81, status: 'ready' },
  { company: 'M', title: 'Software Engineer', co: 'Meta · NYC', score: 76, status: 'ready' },
  { company: 'D', title: 'Business Analyst', co: 'Databricks · Remote', score: 71, status: 'ready' },
]

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
  const [showDemo, setShowDemo] = useState(false)
  const [morphWord, setMorphWord] = useState(MORPH_WORDS[0])
  const [morphVisible, setMorphVisible] = useState(true)
  const [countersStarted, setCountersStarted] = useState(false)
  const [c1, setC1] = useState('1000+')
  const [c2, setC2] = useState('50+')
  const [c3, setC3] = useState('<1 min')
  const [floatIdx, setFloatIdx] = useState(0)
  const [ringProgress, setRingProgress] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  // ─── Demo modal ESC + scroll lock ────────────────────────────────────────────
  useEffect(() => {
    if (!showDemo) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDemo(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showDemo])

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
    let i = 1
    const interval = setInterval(() => {
      setMorphVisible(false)
      setTimeout(() => {
        setMorphWord(MORPH_WORDS[i])
        setMorphVisible(true)
        i = (i + 1) % MORPH_WORDS.length
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
        if (start === null) start = ts
        const p = Math.min((ts - start) / dur, 1)
        const ease = 1 - Math.pow(1 - p, 4)
        setter(Math.round(ease * target).toString() + suffix)
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !countersStarted) {
          setCountersStarted(true)
          animCount(setC1, 1000, '+')
          animCount(setC2, 50, '+')
        }
      },
      { threshold: 0.1 }
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

    // Hero headline — only split static text so .hero-gradient-text renders intact
    if (heroHeadlineRef.current) {
      const staticEl = heroHeadlineRef.current.querySelector('.static-text') as HTMLElement | null
      const splitTarget = staticEl ?? heroHeadlineRef.current
      try {
        const split = SplitText.create(splitTarget, {
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
            <a href="#how-overview">How it works</a>
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
        {/* Globe hero — premium 3D visual */}
        <GlobeHero />

        <div ref={heroContentRef} className="hero-content">
          {/* Eyebrow chip */}
          <div className="hero-eyebrow hero-animate">
            <span className="eyebrow-dot" aria-hidden="true" />
            AI-powered · Now live at vegaply.com
          </div>

          {/* Main headline */}
          <h1 ref={heroHeadlineRef} className="hero-headline">
            <span className="static-text">
              Matched overnight. Tailored by morning. Ready to apply.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-body hero-animate">
            Vegaply finds <span className="hero-body-highlight">fresh roles early</span>, matches them against your resume, and prepares <span className="hero-body-highlight">tailored Daily Packs</span> before the applicant crowd builds.
          </p>

          {/* Proof strip */}
          <div className="hero-proof-strip hero-animate">
            <span className="hero-proof-dot" aria-hidden="true" />
            <span className={`hero-morph${morphVisible ? '' : ' hidden'}`}>{morphWord}</span>
          </div>

          {/* CTA row */}
          <div className="hero-cta-row hero-animate">
            <Link href="/signup" className="btn-primary btn-primary-lg">
              Start free — 5 daily packs
            </Link>
            <a href="#how-overview" className="btn-ghost btn-ghost-lg">
              See how it works
            </a>
          </div>

          {/* Workflow strip */}
          <div className="hero-workflow-strip hero-animate">
            <span className="workflow-step">Match jobs</span>
            <span className="workflow-arrow" aria-hidden="true">→</span>
            <span className="workflow-step">Tailor materials</span>
            <span className="workflow-arrow" aria-hidden="true">→</span>
            <span className="workflow-step">Send to Gmail</span>
            <span className="workflow-arrow" aria-hidden="true">→</span>
            <span className="workflow-step">Track clicks</span>
          </div>
        </div>

      </section>

      {/* ── POST-HERO DESCENT ZONE ─────────────────────────────────────────────── */}
      <div className="post-hero-zone">

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

      {/* ── HOW IT WORKS OVERVIEW ──────────────────────────────────────────────── */}
      <div className="how-overview-section gsap-reveal" id="how-overview">
        <p className="eyebrow">How it works</p>
        <h2 className="section-title">
          Four steps. One <em>repeatable system.</em>
        </h2>
        <p className="section-body how-overview-body">
          Every morning, before you open a job board, Vegaply has already matched, tailored, and delivered your next applications.
        </p>
        <div className="how-steps-grid">
          {HOW_STEPS.map((s, i) => (
            <div key={i} className="how-step-item">
              <div className="how-step-num">{s.num}</div>
              <h3 className="how-step-title">{s.title}</h3>
              <p className="how-step-desc">{s.desc}</p>
            </div>
          ))}
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
            <span className="counter-label">Early Bird jobs daily</span>
          </div>
          <div className="counter-cell">
            <span className="counter-number">{c3}</span>
            <span className="counter-label">Avg resume tailoring time</span>
          </div>
        </div>
      </div>

      </div>{/* end .post-hero-zone */}

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── JOB CARDS ──────────────────────────────────────────────────────────── */}
      <div className="job-cards-section reveal" id="features">
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
            <span className="job-hot-badge">HOT</span>
            <div className="job-company-logo">G</div>
            <div className="job-title">Senior ML Engineer</div>
            <div className="job-company">Google · Mountain View, CA</div>
            <div className="job-tags">
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
            <span className="job-hot-badge">HOT</span>
            <div className="job-company-logo">S</div>
            <div className="job-title">Staff Frontend Eng.</div>
            <div className="job-company">Stripe · New York, NY</div>
            <div className="job-tags">
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

      {/* ── PINNED HOW IT WORKS DEEP DIVE ─────────────────────────────────────── */}
      <section
        ref={pinSectionRef}
        className="pin-section"
        id="how"
        aria-label="How it works deep dive"
      >
        {/* Left: sticky text */}
        <div ref={pinLeftRef} className="pin-left">
          <p className="pin-eyebrow">How it works</p>

          {/* Switching headlines */}
          <div ref={headlineRef} className="pin-headline-wrap">
            <h2 className="pin-headline">
              We scan <em>5 job sources</em> and score every listing against your profile.
            </h2>
            <h2 className="pin-headline">
              We tailor your resume <em>for each role</em> and deliver it to your Gmail.
            </h2>
            <h2 className="pin-headline">
              You apply with <em>one click.</em> We handle the rest.
            </h2>
          </div>

          <p className="pin-body">
            Most job boards stop at listings. Vegaply scores each role against your resume, rewrites your materials, and sends your Daily Pack to Gmail — automatically, every morning.
          </p>

          {/* Step progress nav */}
          <div className="pin-steps-nav" role="list">
            <div className="pin-step-dot active" role="listitem">
              <div>
                <div className="pin-step-label">Step 1 — Match</div>
                <div className="pin-step-desc">
                  We scan 5 sources and score every job against your resume.
                </div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 2 — Tailor &amp; Send</div>
                <div className="pin-step-desc">
                  AI rewrites your resume for each role and sends it to Gmail.
                </div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 3 — Apply</div>
                <div className="pin-step-desc">
                  You click send. One email. One application. Done.
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
              5 sources. Scored against your resume.
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

          {/* Step 2: Tailor & Send */}
          <div ref={step2Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">2</div>
              Tailor &amp; Send
            </div>
            <h3 className="pin-card-headline">
              Resume rewritten. Delivered to Gmail.
            </h3>
            <p className="pin-card-body">
              Vegaply rewrites your resume for each opening and sends an
              apply-ready email to your inbox — tailored keywords, tone, and cover note included.
            </p>
            <div className="mock-letter">
              <div className="mock-letter-header">Gmail · Tailored pack · Stripe DA role</div>
              <span className="typing-cursor">
                Resume tailored for Data Analyst at Stripe. Key skills
                highlighted: Python, SQL, Tableau. ATS keywords matched.
                One-click apply link included...
              </span>
            </div>
          </div>

          {/* Step 3: Apply */}
          <div ref={step3Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">3</div>
              Apply
            </div>
            <h3 className="pin-card-headline">
              Open Gmail. Click send. Done.
            </h3>
            <p className="pin-card-body">
              Your morning queue arrives in Gmail — each job with a tailored resume
              and cover letter, ready to send. Apply in seconds, not hours.
            </p>
            <div className="mock-notifications">
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
                <div className="notif-text">
                  <div className="notif-title">5 packs ready in Gmail</div>
                  <div className="notif-sub">Stripe, Google, Notion, Meta, Databricks</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
                <div className="notif-text">
                  <div className="notif-title">Interview scheduled</div>
                  <div className="notif-sub">Stripe — Data Analyst · Tomorrow 2pm</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
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
                  {['Fresh Jobs', 'AI Match Score', 'Tailored Resume', 'Interview Prep', 'Tracker'][floatIdx]}
                </h3>
                <p>{['Posted in last 24h', 'Know your fit instantly', 'ATS keywords baked in', 'Likely Q&A generated', 'Applied → Offer pipeline'][floatIdx]}</p>
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
          Used by job seekers applying to companies including
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
        <p className="eyebrow">The system</p>
        <h2 className="section-title">
          One system. <em>No manual work.</em>
        </h2>
        <p className="section-body">
          Vegaply matches, tailors, and delivers — so you spend your time reviewing, not searching.
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

      {/* ── QUEUE PREVIEW ──────────────────────────────────────────────────────── */}
      <div className="queue-preview-section gsap-reveal" id="preview">
        <p className="eyebrow">Product preview</p>
        <h2 className="section-title">
          Your morning queue, <em>ready.</em>
        </h2>
        <p className="section-body queue-preview-body">
          Every morning Vegaply builds your personalized queue — jobs matched, resumes tailored, Gmail emails ready to send.
        </p>
        <div className="queue-preview-card">
          <div className="queue-preview-header">
            <div className="queue-preview-date">
              <span className="queue-preview-dot" />
              Today&apos;s Auto Apply Queue
            </div>
            <div className="queue-preview-plan-badge">Free — 5 packs ready</div>
          </div>
          <div className="queue-preview-rows">
            {QUEUE_PREVIEW_ROWS.map((row, i) => (
              <div key={i} className="queue-preview-row">
                <div className="queue-preview-logo">{row.company}</div>
                <div className="queue-preview-info">
                  <div className="queue-preview-title">{row.title}</div>
                  <div className="queue-preview-co">{row.co}</div>
                </div>
                <div className="queue-preview-score">{row.score}%</div>
                <div className="queue-preview-status">
                  <span className="queue-status-dot" />
                  Ready
                </div>
              </div>
            ))}
          </div>
          <div className="queue-preview-footer">
            <span className="queue-preview-footer-text">5 tailored packs · delivered to Gmail · updated daily</span>
          </div>
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
          Start free forever. Upgrade when you&apos;re ready to apply on autopilot.
        </p>

        <div className="pricing-grid">
          {/* FREE */}
          <div className="pricing-card pricing-free">
            <div className="pricing-tier-label">Free forever</div>
            <div className="pricing-price">$0</div>
            <div className="pricing-period">For students starting their search</div>
            <div className="pricing-divider" />
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                <strong>5 daily application packs</strong>
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                AI-tailored resume per job
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Gmail apply-ready delivery
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                750+ fresh jobs daily
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Early Bird Detection
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                AI Resume Match
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Cover letter generator
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                H1B sponsor filter
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Kanban Tracker
              </li>
              <li className="pricing-feature feature-locked">
                <span className="feature-x">✗</span>
                Under 10 applicants tab
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
            <div className="pricing-badge">Most popular</div>
            <div className="pricing-price gradient">$9.99</div>
            <div className="pricing-period">
              For students serious about landing H1B
            </div>
            <div className="pricing-divider" />
            <ul className="pricing-features">
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                <strong>20 daily application packs</strong>
              </li>
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

          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ───────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── CTA SECTION ────────────────────────────────────────────────────────── */}
      <section className="cta-section reveal" aria-label="Call to action">
        <div className="cta-glow" aria-hidden="true" />
        <h2 className="cta-headline">Your Daily Pack. Every morning.</h2>
        <p className="cta-sub">
          Matched roles. Tailored resume. Gmail-ready. Start free, no credit card needed.
        </p>
        <div className="cta-buttons">
          <Link href="/signup" className="btn-primary btn-primary-lg">
            Start free — 5 daily packs
          </Link>
          <Link href="/login" className="btn-ghost btn-ghost-lg">
            Sign in →
          </Link>
        </div>
        <p className="cta-trust">
          ✓ AI resume tailored to every job · ✓ 5 free packs daily · ✓ No credit card needed
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
              AI-powered job search for international students. Jobs matched,
              resumes tailored, applications sent to Gmail — every morning.
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
                <a href="#how-overview">How it works</a>
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
          <span className="footer-copy">© {new Date().getFullYear()} Vegaply</span>
          <div className="footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:support@vegaply.com">Contact</a>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="demo-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              className="demo-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="demo-modal-close" onClick={() => setShowDemo(false)} aria-label="Close">
                <X size={20} />
              </button>
              <video
                src="https://res.cloudinary.com/dykyvevxx/video/upload/v1777610483/vegaply_brand_film_egmevt.mp4"
                autoPlay
                controls
                playsInline
                className="demo-modal-video"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
