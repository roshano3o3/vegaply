'use client'
import "./landing.css"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion'
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

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText)
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROOF_PHRASES = [
  'Tailored resume per role — in under 60 seconds',
  'H1B sponsorship filtering built in',
  'Fresh matched roles delivered every morning',
  'AI-generated cover letter included with every pack',
  'Built for F-1, OPT, and H1B candidates',
]

const TICKER_DATA = [
  'Matched roles, scored against your resume',
  'Tailored resume per job — in under 60s',
  'Daily Pack emailed to your inbox every morning',
  'Early Bird roles surfaced before the crowd',
  'Cover letter generated per application',
  'Application board, built in',
  'H1B-friendly roles filtered automatically',
]

const BUILT_FOR = [
  {
    label: 'F-1 / OPT Candidates',
    desc: 'Apply smart during your OPT window',
  },
  {
    label: 'H1B Seekers',
    desc: 'Every role filtered for sponsorship history',
  },
  {
    label: 'International Professionals',
    desc: 'Tailored for candidates navigating both job search and visa requirements',
  },
]

const DAILY_PACK_ROWS = [
  { company: 'S', title: 'Data Analyst', co: 'Stripe · Remote', score: 94, h1b: true },
  { company: 'G', title: 'ML Engineer', co: 'Google · Mountain View', score: 88, h1b: true },
  { company: 'N', title: 'Product Manager', co: 'Notion · SF', score: 81, h1b: false },
  { company: 'M', title: 'Software Engineer', co: 'Meta · NYC', score: 76, h1b: true },
  { company: 'D', title: 'Business Analyst', co: 'Databricks · Remote', score: 71, h1b: true },
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VegaplyLanding() {
  const prefersReducedMotion = useReducedMotion()

  const { scrollY } = useScroll()
  const heroContentY = useTransform(scrollY, [0, 520], [0, -50])
  const heroAtmoY = useTransform(scrollY, [0, 520], [0, -22])

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

  const [showDemo, setShowDemo] = useState(false)
  const [proofPhrase, setProofPhrase] = useState(PROOF_PHRASES[0])
  const [proofVisible, setProofVisible] = useState(true)
  const [navScrolled, setNavScrolled] = useState(false)

  // Demo modal ESC + scroll lock
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

  // Lenis smooth scroll
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
        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add((time: number) => { lenis.raf(time * 1000) })
        gsap.ticker.lagSmoothing(0)
      } catch {
        function raf(time: number) { rafId = requestAnimationFrame(raf) }
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

  // Nav scroll state
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Rotating proof phrase
  useEffect(() => {
    let i = 1
    const interval = setInterval(() => {
      setProofVisible(false)
      setTimeout(() => {
        setProofPhrase(PROOF_PHRASES[i])
        setProofVisible(true)
        i = (i + 1) % PROOF_PHRASES.length
      }, 350)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // Scroll reveal
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

  // Feature card cursor glow
  useEffect(() => {
    const feats = document.querySelectorAll('.feat-card')
    feats.forEach(f => {
      f.addEventListener('mousemove', (e: Event) => {
        const me = e as MouseEvent
        const r = (f as HTMLElement).getBoundingClientRect()
        ;(f as HTMLElement).style.setProperty('--fx', ((me.clientX - r.left) / r.width) * 100 + '%')
        ;(f as HTMLElement).style.setProperty('--fy', ((me.clientY - r.top) / r.height) * 100 + '%')
      })
    })
  }, [])

  // GSAP animations
  useGSAP(() => {
    if (prefersReducedMotion) return
    if (typeof window === 'undefined') return

    // Hero headline split text
    if (heroHeadlineRef.current) {
      const staticEl = heroHeadlineRef.current.querySelector('.static-text') as HTMLElement | null
      const splitTarget = staticEl ?? heroHeadlineRef.current
      try {
        const split = SplitText.create(splitTarget, { type: 'chars,words' })
        gsap.from(split.chars, {
          yPercent: 120,
          opacity: 0,
          duration: 0.85,
          stagger: 0.018,
          ease: 'power3.out',
          delay: 0.2,
        })
      } catch {
        gsap.from(splitTarget, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.2 })
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

    // Pinned How It Works
    if (pinSectionRef.current && step1Ref.current && step2Ref.current && step3Ref.current) {
      gsap.set([step2Ref.current, step3Ref.current], { opacity: 0, scale: 0.95, y: 20 })
      gsap.set(step1Ref.current, { opacity: 1, scale: 1, y: 0 })

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

      tl.to(step1Ref.current, { opacity: 0, scale: 0.95, y: -20, duration: 1 }, 0)
        .to(step2Ref.current, { opacity: 1, scale: 1, y: 0, duration: 1 }, 0.5)
        .to(step2Ref.current, { opacity: 0, scale: 0.95, y: -20, duration: 1 }, 1.5)
        .to(step3Ref.current, { opacity: 1, scale: 1, y: 0, duration: 1 }, 2)

      if (headlineRef.current) {
        const headlines = headlineRef.current.querySelectorAll('.pin-headline')
        tl.to(headlines[0], { opacity: 0, y: -16, duration: 0.5 }, 0.1)
          .fromTo(headlines[1], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.5)
          .to(headlines[1], { opacity: 0, y: -16, duration: 0.5 }, 1.6)
          .fromTo(headlines[2], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, 2)
      }
    }

    // Feature grid stagger
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

    // Generic section reveals
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

    // Built-for chips — staggered cinematic entrance
    gsap.from('.built-for-chip', {
      y: 28,
      opacity: 0,
      duration: 0.65,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.built-for-chips', start: 'top 86%' },
    })

    // Daily pack rows — slide in from left
    gsap.from('.daily-pack-row', {
      x: -16,
      opacity: 0,
      duration: 0.48,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.daily-pack-card', start: 'top 80%' },
    })

    // Resume compare panels — depth reveal
    gsap.from('.resume-compare-panel', {
      y: 28,
      opacity: 0,
      duration: 0.65,
      stagger: 0.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.resume-compare-wrap', start: 'top 82%' },
    })

    // H1B card rows — slide from right
    gsap.from('.h1b-card-row', {
      x: 16,
      opacity: 0,
      duration: 0.44,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.h1b-card', start: 'top 80%' },
    })

    // Pricing cards — scale + fade
    gsap.from('.pricing-card', {
      y: 40,
      opacity: 0,
      scale: 0.97,
      duration: 0.75,
      stagger: 0.14,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.pricing-grid', start: 'top 80%' },
    })

    // Founder card — single premium reveal
    gsap.from('.founder-card', {
      y: 30,
      opacity: 0,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.founder-card', start: 'top 85%' },
    })
  }, [prefersReducedMotion])

  return (
    <div className="landing-wrap">
      {/* Grain overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Scroll progress bar */}
      <motion.div
        className="scroll-bar"
        style={{ scaleX: 0, originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 0 }}
      />

      {/* ── NAV ───────────────────────────────────────────────────────────────── */}
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
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#stories">Stories</a></li>
        </ul>

        <div className="nav-right">
          <Link href="/login" className="nav-signin">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started free</Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="hero" aria-label="Hero">
        {/* Atmospheric base — warm ambient below globe, no JS */}
        <div className="hero-atmo-base" aria-hidden="true" />

        {/* Star layers — CSS dot-field, sits behind globe canvas (z-index 1) */}
        <div className="hero-stars-1" aria-hidden="true" />
        <div className="hero-stars-2" aria-hidden="true" />

        <GlobeHero />

        {/* Rim glow — depth layer between globe and content */}
        <motion.div
          className="hero-rim-glow"
          aria-hidden="true"
          style={prefersReducedMotion ? {} : { y: heroAtmoY }}
        />

        <motion.div
          ref={heroContentRef}
          className="hero-content"
          style={prefersReducedMotion ? {} : { y: heroContentY }}
        >
          <div className="hero-eyebrow hero-animate">
            <span className="eyebrow-dot" aria-hidden="true" />
            Daily Pack · Fresh every morning
          </div>

          <h1 ref={heroHeadlineRef} className="hero-headline">
            <span className="static-text">
              Your job search. Packed and ready by morning.
            </span>
          </h1>

          <p className="hero-body hero-animate">
            Every day, Vegaply delivers <span className="hero-body-highlight">matched roles</span>, <span className="hero-body-highlight">AI-tailored resumes</span>, and <span className="hero-body-highlight">H1B-aware preparation</span> — so when you open your laptop, you&apos;re not building applications from scratch. You&apos;re choosing which ones to send.
          </p>

          <div className="hero-cta-row hero-animate">
            <Link href="/signup" className="btn-primary btn-primary-lg">
              Get Your First Pack
            </Link>
            <a href="#daily-pack" className="btn-ghost btn-ghost-lg">
              See what&apos;s inside
            </a>
          </div>

          <div className="hero-proof-strip hero-animate">
            <span className="hero-proof-dot" aria-hidden="true" />
            <span className={`hero-morph${proofVisible ? '' : ' hidden'}`}>{proofPhrase}</span>
          </div>
        </motion.div>
      </section>

      {/* ── POST-HERO DESCENT ZONE ────────────────────────────────────────────── */}
      <div className="post-hero-zone">

        {/* ── WHO IT'S BUILT FOR ──────────────────────────────────────────────── */}
        <div className="built-for-section reveal">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Built for</p>
          <h2 className="section-title" style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
            Made for candidates the U.S. job market makes work hardest.
          </h2>
          <p className="section-body" style={{ textAlign: 'center', margin: '20px auto 0' }}>
            If you&apos;re on F-1 OPT, navigating H1B sponsorship requirements, or job-hunting with a visa deadline rather than a preference — Vegaply was built for you specifically.
          </p>
          <p className="section-body" style={{ textAlign: 'center', margin: '12px auto 0' }}>
            We filter for companies that sponsor. We know how the timeline pressure feels. We make sure you arrive at every application better prepared than the next candidate.
          </p>
          <div className="built-for-chips">
            {BUILT_FOR.map((b, i) => (
              <div key={i} className="built-for-chip">
                <div className="built-for-chip-label">{b.label}</div>
                <div className="built-for-chip-desc">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TICKER ──────────────────────────────────────────────────────────── */}
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

      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── THE DAILY PACK ───────────────────────────────────────────────────── */}
      <div className="daily-pack-section gsap-reveal" id="daily-pack">
        <p className="eyebrow" style={{ textAlign: 'center' }}>The Daily Pack</p>
        <h2 className="section-title" style={{ textAlign: 'center' }}>
          Every morning, your pack is <em>ready.</em>
        </h2>
        <p className="section-body" style={{ textAlign: 'center', margin: '16px auto 0' }}>
          Before you open your inbox, Vegaply has already worked through today&apos;s job listings. Scored them against your resume. Filtered for H1B eligibility. Generated a tailored resume and cover letter for each strong match.
        </p>
        <p className="section-body" style={{ textAlign: 'center', margin: '10px auto 0', fontStyle: 'italic', color: 'var(--text-dimmer)' }}>
          Not automation. Preparation. The difference is you stay in control.
        </p>

        <div className="daily-pack-card">
          <div className="daily-pack-header">
            <div className="queue-preview-date">
              <span className="queue-preview-dot" />
              Today&apos;s Daily Pack
            </div>
            <div className="daily-pack-sample-badge">Sample — Illustrative</div>
          </div>
          <div className="queue-preview-rows">
            {DAILY_PACK_ROWS.map((row, i) => (
              <div key={i} className="daily-pack-row">
                <div className="queue-preview-logo">{row.company}</div>
                <div className="queue-preview-info">
                  <div className="queue-preview-title">{row.title}</div>
                  <div className="queue-preview-co">{row.co}</div>
                </div>
                {row.h1b && <span className="daily-pack-h1b-badge">H1B</span>}
                <div className="queue-preview-score">{row.score}%</div>
                <div className="daily-pack-action">View Resume</div>
              </div>
            ))}
          </div>
          <div className="queue-preview-footer">
            <span className="queue-preview-footer-text">5 tailored packs · updated daily · you review and apply</span>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── AI RESUME TAILORING ──────────────────────────────────────────────── */}
      <div className="resume-tailor-section reveal" id="resume-tailor">
        <p className="eyebrow">AI Resume Tailoring</p>
        <h2 className="section-title">
          Your resume, rewritten for the role — <em>in under a minute.</em>
        </h2>
        <p className="section-body">
          Paste your resume once. Vegaply matches it to a role, identifies the keywords and requirements that matter, and rewrites the relevant sections to reflect them — using only what&apos;s already in your background.
        </p>
        <p className="section-body" style={{ marginTop: '8px' }}>
          No invented metrics. No hallucinated experience. Your real qualifications, presented in the language of the specific job.
        </p>
        <p className="resume-tailor-meta">
          Match score · Tailored bullets · Skills gap · ATS keywords identified
        </p>

        <div className="resume-compare-wrap">
          <div className="resume-compare-panel">
            <div className="resume-panel-label">Your resume</div>
            <div className="resume-panel-content">
              <p className="resume-bullet">
                Developed and maintained data pipelines to process large datasets for business reporting.
              </p>
            </div>
          </div>
          <div className="resume-compare-arrow" aria-hidden="true">→</div>
          <div className="resume-compare-panel resume-panel-right">
            <div className="resume-panel-label">Tailored for Data Analyst at Stripe</div>
            <div className="resume-panel-content">
              <p className="resume-bullet">
                Built and maintained <mark className="resume-highlight">Python</mark> and <mark className="resume-highlight">SQL</mark> data pipelines processing large transaction datasets, delivering insights to drive <mark className="resume-highlight">Tableau</mark> dashboards for business reporting.
              </p>
            </div>
          </div>
        </div>

        <div className="resume-score-row">
          <div className="resume-score-chip resume-score-strong">
            <span className="resume-score-dot" />
            Strong — 81%
          </div>
          <div className="resume-score-stat">4 keywords added</div>
          <div className="resume-score-stat">2 skills to address</div>
        </div>
        <p className="resume-sample-note">Sample output — illustrative only</p>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── FOUNDER NOTE ─────────────────────────────────────────────────────── */}
      <div className="founder-section reveal" id="stories">
        <p className="founder-eyebrow">From the founder</p>
        <h2 className="founder-headline">
          I built this for people who don&apos;t have time to get it wrong.
        </h2>

        <div className="founder-card">
          <div className="founder-quote-mark" aria-hidden="true">&ldquo;</div>
          <div className="founder-body">
            <p>
              Most job tools help you apply. Vegaply helps you win. Every morning, your inbox has a pack ready to go - best-match roles matched line-by-line to each job description, resumes with an ATS score you can trust, and cover letters that sound like you, not a template. Just hit apply straight from your email and the application&apos;s sent. No portals, no busywork, no blending in. Built for students who&apos;d rather land the job than spend the night chasing it.
            </p>
            <div className="founder-sig">
              Roshan Pellati, Founder
            </div>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── SOCIAL PROOF / LOGO MARQUEE ──────────────────────────────────────── */}
      <div className="logo-marquee-section" aria-label="Applied to by Vegaply users">
        <p className="logo-marquee-label">
          Built for job seekers targeting roles at companies like
        </p>
        <div style={{ overflow: 'hidden' }}>
          <div className="logo-row logo-row-1">
            {[
              'Google', 'Meta', 'Microsoft', 'Amazon', 'Apple',
              'Nvidia', 'Stripe', 'Vercel', 'Netflix', 'Salesforce',
              'Google', 'Meta', 'Microsoft', 'Amazon', 'Apple',
              'Nvidia', 'Stripe', 'Vercel', 'Netflix', 'Salesforce',
            ].map((name, i) => (
              <span key={i} className="logo-item">{name}</span>
            ))}
          </div>
          <div className="logo-row logo-row-2">
            {[
              'Figma', 'Notion', 'Linear', 'Dropbox', 'Airbnb',
              'Lyft', 'Coinbase', 'Robinhood', 'Databricks', 'Palantir',
              'Figma', 'Notion', 'Linear', 'Dropbox', 'Airbnb',
              'Lyft', 'Coinbase', 'Robinhood', 'Databricks', 'Palantir',
            ].map((name, i) => (
              <span key={i} className="logo-item">{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── H1B INTELLIGENCE ─────────────────────────────────────────────────── */}
      <div className="h1b-section reveal" id="h1b">
        <div className="h1b-left">
          <p className="eyebrow">H1B Intelligence</p>
          <h2 className="section-title">
            Know before you apply which companies <em>actually sponsor.</em>
          </h2>
          <p className="section-body">
            Most job boards don&apos;t tell you whether a company will sponsor your visa. You apply, interview three rounds, and find out too late. Vegaply filters for companies with a documented history of H1B sponsorship — so you know before you invest your time.
          </p>
          <p className="section-body" style={{ marginTop: '12px' }}>
            Every role in your Daily Pack is screened. H1B-eligible roles are marked clearly. Non-sponsoring companies are filtered or flagged — your call.
          </p>
        </div>
        <div className="h1b-right">
          <div className="h1b-card">
            <div className="h1b-card-header">H1B Sponsorship Filter</div>
            <div className="h1b-card-rows">
              {[
                { co: 'Stripe', role: 'Data Analyst', sponsor: true },
                { co: 'Google', role: 'ML Engineer', sponsor: true },
                { co: 'Notion', role: 'Product Manager', sponsor: false },
                { co: 'Meta', role: 'Software Engineer', sponsor: true },
              ].map((r, i) => (
                <div key={i} className="h1b-card-row">
                  <div className="h1b-card-co">{r.co}</div>
                  <div className="h1b-card-role">{r.role}</div>
                  <div className={`h1b-card-badge ${r.sponsor ? 'h1b-yes' : 'h1b-unknown'}`}>
                    {r.sponsor ? 'H1B ✓' : 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
            <div className="h1b-card-footer">Sample data — illustrative only</div>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── FEATURE GRID ─────────────────────────────────────────────────────── */}
      <div className="feat-section reveal" id="features">
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

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── PINNED HOW IT WORKS ──────────────────────────────────────────────── */}
      <section
        ref={pinSectionRef}
        className="pin-section"
        id="how"
        aria-label="How it works"
      >
        <div ref={pinLeftRef} className="pin-left">
          <p className="pin-eyebrow">How it works</p>

          <div ref={headlineRef} className="pin-headline-wrap">
            <h2 className="pin-headline">
              We scan job sources and score every listing against <em>your resume.</em>
            </h2>
            <h2 className="pin-headline">
              We tailor your resume <em>for each role</em> and prepare your materials.
            </h2>
            <h2 className="pin-headline">
              You review your pack. <em>You decide</em> which roles to apply to.
            </h2>
          </div>

          <p className="pin-body">
            Most job boards stop at listings. Vegaply scores each role against your resume, rewrites your materials, and sends your Daily Pack to your inbox — ready for you to review every morning.
          </p>

          <div className="pin-steps-nav" role="list">
            <div className="pin-step-dot active" role="listitem">
              <div>
                <div className="pin-step-label">Step 1 — Match</div>
                <div className="pin-step-desc">We scan sources and score every job against your resume.</div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 2 — Tailor</div>
                <div className="pin-step-desc">AI rewrites your resume for each role and prepares your cover letter.</div>
              </div>
            </div>
            <div className="pin-step-dot" role="listitem">
              <div>
                <div className="pin-step-label">Step 3 — Apply</div>
                <div className="pin-step-desc">You review your pack and choose which roles to apply to.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pin-right">
          {/* Step 1: Match */}
          <div ref={step1Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">1</div>
              Match
            </div>
            <h3 className="pin-card-headline">Scored against your resume.</h3>
            <p className="pin-card-body">
              Our AI scores your resume against every fresh listing and surfaces only the roles where you actually have a shot.
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
                  style={{ color: 'var(--text-dim)', background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  76% match
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Tailor */}
          <div ref={step2Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">2</div>
              Tailor
            </div>
            <h3 className="pin-card-headline">Resume rewritten. Materials prepared.</h3>
            <p className="pin-card-body">
              Vegaply rewrites your resume for each opening and prepares a role-specific cover letter — tailored keywords, tone, and structure included.
            </p>
            <div className="mock-letter">
              <div className="mock-letter-header">Daily Pack · Tailored materials · Stripe DA role</div>
              <span className="typing-cursor">
                Resume tailored for Data Analyst at Stripe. Key skills highlighted: Python, SQL, Tableau. ATS keywords matched. Cover letter prepared and ready to review...
              </span>
            </div>
          </div>

          {/* Step 3: Apply */}
          <div ref={step3Ref} className="pin-card">
            <div className="pin-card-step">
              <div className="pin-card-num">3</div>
              Apply
            </div>
            <h3 className="pin-card-headline">You review. You choose. You apply.</h3>
            <p className="pin-card-body">
              Your morning pack is ready — each role with tailored materials prepared. You decide which ones to send. You stay in control.
            </p>
            <div className="mock-notifications">
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
                <div className="notif-text">
                  <div className="notif-title">5 packs ready in your inbox</div>
                  <div className="notif-sub">Stripe, Google, Notion, Meta, Databricks</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
                <div className="notif-text">
                  <div className="notif-title">Tailored resume ready — Stripe DA</div>
                  <div className="notif-sub">Python · SQL · Tableau · ATS-ready</div>
                </div>
              </div>
              <div className="mock-notif">
                <div className="notif-icon"><span className="notif-dot" /></div>
                <div className="notif-text">
                  <div className="notif-title">Cover letter ready — Google ML</div>
                  <div className="notif-sub">Role-specific · Review before sending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <div className="pricing-section reveal" id="pricing">
        <p className="eyebrow">Pricing</p>
        <h2 className="section-title">
          Simple. <em>Transparent.</em>
        </h2>
        <p className="section-body" style={{ margin: '16px auto 0', textAlign: 'center' }}>
          Start free forever. Upgrade when you&apos;re ready to go deeper.
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
                Daily Pack delivered to inbox
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                Early Bird Detection
              </li>
              <li className="pricing-feature">
                <span className="feature-check">✓</span>
                AI Resume Match scoring
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
                Application board
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
            <div className="pricing-price gradient">$9.99/mo</div>
            <div className="pricing-period">
              Billed monthly · For candidates serious about landing their role
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
                Priority email alerts
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
              Get Started with Pro →
            </Link>
          </div>
        </div>
      </div>

      {/* ── GLOW DIVIDER ─────────────────────────────────────────────────────── */}
      <div className="glow-divider" />

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="cta-section reveal" aria-label="Call to action">
        <div className="cta-glow" aria-hidden="true" />
        <h2 className="cta-headline">Your Daily Pack. Every morning.</h2>
        <p className="cta-sub">
          Matched roles. Tailored resume. H1B-aware. Start free, no credit card needed.
        </p>
        <div className="cta-buttons">
          <Link href="/signup" className="btn-primary btn-primary-lg">
            Get Your First Pack
          </Link>
          <Link href="/login" className="btn-ghost btn-ghost-lg">
            Sign in →
          </Link>
        </div>
        <p className="cta-trust">
          ✓ AI resume tailored to every role · ✓ H1B sponsorship filter · ✓ 5 free packs daily
        </p>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="footer" role="contentinfo">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="nav-logo" aria-label="Vegaply home">
              <LogoVegaStar size={24} />
              <span className="nav-logo-text">
                <span style={{ color: '#fff', fontWeight: 700 }}>Vega</span>
                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 700 }}>ply</span>
              </span>
            </Link>
            <p>
              AI-powered job preparation for international candidates. Jobs matched, resumes tailored, Daily Pack delivered every morning.
            </p>
          </div>

          <div>
            <div className="footer-col-label">Product</div>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link href="/signup">Get started</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-label">Resources</div>
            <ul className="footer-links">
              <li><a href="#stories">Founder story</a></li>
              <li><a href="#h1b">H1B intelligence</a></li>
              <li><Link href="/signup">Get started</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-label">Contact</div>
            <ul className="footer-links">
              <li><a href="mailto:support@vegaply.com">support@vegaply.com</a></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of service</Link></li>
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

      {/* ── DEMO MODAL ───────────────────────────────────────────────────────── */}
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
    </div>
  )
}
