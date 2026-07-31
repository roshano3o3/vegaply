'use client'
import "./landing.css"
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const TICKER_ITEMS = [
  '24-Hour Fresh Jobs','H1B Sponsor Detection','AI Resume Scoring',
  'Auto Apply','Skill Gap Analysis','Interview Prep','Application Tracker','Chrome Extension',
]

const FEATURE_CARDS = [
  {
    num: '01', title: '24-Hour Fresh Jobs.',
    items: ['Jobs posted in last 24 hours only','H1B sponsor verified listings','Real-time filtering by role and location','No stale postings, ever'],
  },
  {
    num: '02', title: 'AI Resume Scoring.',
    items: ['Match score vs job description','Keyword gap analysis','Instant improvement suggestions','Works with any resume format'],
  },
  {
    num: '03', title: 'Auto Apply.',
    items: ['One-click Greenhouse form fill','Chrome extension included','Tracks every application automatically'],
  },
]

const FREE_FEATURES = [
  { text: '5 daily application packs', locked: false },
  { text: 'AI-tailored resume per job', locked: false },
  { text: 'Daily Pack delivered to inbox', locked: false },
  { text: 'Early Bird Detection', locked: false },
  { text: 'AI Resume Match scoring', locked: false },
  { text: 'Cover letter generator', locked: false },
  { text: 'H1B sponsor filter', locked: false },
  { text: 'Application board', locked: false },
  { text: 'Priority job alerts', locked: true },
]

const PRO_FEATURES = [
  '20 daily application packs','Everything in Free','Priority email alerts','Early access to new features',
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

export default function VegaplyLanding() {
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const about = useInView(0.15)
  const featuresHeader = useInView(0.1)
  const card0 = useInView(0.1)
  const card1 = useInView(0.1)
  const card2 = useInView(0.1)
  const card3 = useInView(0.1)
  const pricing = useInView(0.1)
  const footer = useInView(0.05)

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    let rafId = 0
    const tick = () => {
      if (video.duration) {
        const fadeDur = 0.5
        const timeLeft = video.duration - video.currentTime
        if (video.currentTime < fadeDur) {
          video.style.opacity = String(video.currentTime / fadeDur)
        } else if (timeLeft < fadeDur) {
          video.style.opacity = String(timeLeft / fadeDur)
        } else {
          video.style.opacity = '1'
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    const onEnded = () => {
      video.style.opacity = '0'
      setTimeout(() => { video.currentTime = 0; video.play() }, 100)
    }
    video.addEventListener('ended', onEnded)
    video.play().catch(() => {})
    rafId = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafId); video.removeEventListener('ended', onEnded) }
  }, [])

  const cardRefs = [card0, card1, card2, card3]

  const revealStyle = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  })

  return (
    <div style={{ background: '#000000', color: '#E1E0CC', fontFamily: 'var(--font-almarai), system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── 1. HERO ── */}
      <section style={{ minHeight: '100vh', padding: '16px', display: 'flex', flexDirection: 'column', background: '#000' }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', flex: 1, minHeight: '90vh' }}>

          <video
            ref={heroVideoRef}
            className="video-fade"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            autoPlay muted playsInline
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />

          <div className="noise-overlay" style={{ opacity: 0.6, mixBlendMode: 'overlay' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 40%, rgba(0,0,0,0.7))', pointerEvents: 'none' }} />

          {/* Navbar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center' }}>
            <nav className="liquid-glass" style={{ borderRadius: '0 0 20px 20px', padding: '10px 32px', filter: 'drop-shadow(0 4px 24px rgba(222,219,200,0.07))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                {['How it works','Features','Pricing'].map(label => (
                  <a key={label} href={`#${label.toLowerCase().replace(' ','')}`}
                    style={{ color: 'rgba(225,224,204,0.75)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(225,224,204,0.75)')}
                  >{label}</a>
                ))}
                <Link href="/login" style={{ color: 'rgba(225,224,204,0.75)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(225,224,204,0.75)')}
                >Sign in</Link>
                <Link href="/signup" style={{ background: '#DEDBC8', color: '#000', borderRadius: '999px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >Get Started Free</Link>
              </div>
            </nav>
          </div>

          {/* Hero content */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-end', gap: '24px' }}>
              <div>
                <h1
                  className="animate-fade-rise"
                  style={{
                    fontSize: 'clamp(80px, 18vw, 260px)',
                    fontWeight: 500,
                    lineHeight: 0.85,
                    letterSpacing: '-0.05em',
                    color: '#E1E0CC',
                    margin: 0,
                    fontFamily: 'var(--font-almarai), system-ui, sans-serif',
                  }}
                >
                  Vegaply<sup style={{ fontSize: '0.15em', position: 'relative', top: '-0.9em', marginLeft: '4px' }}>*</sup>
                </h1>
              </div>
              <div style={{ maxWidth: '320px', paddingBottom: '8px' }}>
                <p className="animate-fade-rise-delay" style={{ color: 'rgba(225,224,204,0.7)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
                  Your AI-powered job search engine — built for international students, H1B seekers, and ambitious candidates who apply smarter, not harder.
                </p>
                <Link
                  href="/signup"
                  className="animate-fade-rise-delay-2 liquid-glass"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '999px', padding: '12px 24px', fontSize: '14px', fontWeight: 500, color: '#E1E0CC', textDecoration: 'none', transition: 'filter 0.3s' }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 16px rgba(222,219,200,0.2))')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  Start for free
                  <span style={{ background: '#E1E0CC', color: '#000', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TICKER ── */}
      <section style={{ background: '#000', padding: '24px 0', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="ticker-track" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', padding: '0 24px', fontSize: '13px', fontWeight: 500, color: 'rgba(222,219,200,0.55)', flexShrink: 0 }}>
              {item}
              <span style={{ color: 'rgba(222,219,200,0.2)' }}>·</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── 3. ABOUT ── */}
      <section style={{ background: '#000', padding: '120px 24px' }}>
        <div
          ref={about.ref}
          style={{
            background: '#0d0d0d',
            borderRadius: '28px',
            maxWidth: '1000px',
            margin: '0 auto',
            padding: 'clamp(40px, 6vw, 80px) clamp(24px, 6vw, 80px)',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.06)',
            ...revealStyle(about.visible),
          }}
        >
          <span style={{ display: 'inline-block', color: 'rgba(222,219,200,0.5)', fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '32px', padding: '6px 16px', border: '1px solid rgba(222,219,200,0.12)', borderRadius: '999px' }}>
            AI-Powered Job Search
          </span>

          <h2 style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', lineHeight: 0.95, maxWidth: '820px', margin: '0 auto 40px', letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: 'var(--font-almarai)', color: '#E1E0CC', fontWeight: 400 }}>Land your dream job, </span>
            <span style={{ fontFamily: 'var(--font-instrument-serif)', fontStyle: 'italic', color: 'rgba(222,219,200,0.4)' }}>faster than ever. </span>
            <span style={{ fontFamily: 'var(--font-almarai)', color: '#E1E0CC', fontWeight: 400 }}>We find the jobs nobody else shows you.</span>
          </h2>

          <p style={{ color: 'rgba(222,219,200,0.55)', fontSize: '15px', lineHeight: 1.8, maxWidth: '580px', margin: '0 auto 48px' }}>
            Over three years, thousands of international students and H1B applicants have used Vegaply to find jobs posted in the last 24 hours, score their resumes with AI, and auto-apply — all before the competition even opens LinkedIn.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            {[['10,000+','Students helped'],['24hrs','Job freshness'],['3×','More interviews']].map(([num, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: '#E1E0CC', letterSpacing: '-0.03em', lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: '12px', color: 'rgba(222,219,200,0.4)', marginTop: '6px', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURES ── */}
      <section id="features" style={{ background: '#000', padding: '120px 24px', position: 'relative' }}>
        <div className="bg-noise" style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          <div ref={featuresHeader.ref} style={revealStyle(featuresHeader.visible)}>
            <p style={{ color: 'rgba(222,219,200,0.35)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>What we do</p>
            <h2 style={{ color: '#E1E0CC', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 400, maxWidth: '640px', marginBottom: '16px', lineHeight: 1.05, letterSpacing: '-0.02em', fontFamily: 'var(--font-almarai)' }}>
              Studio-grade job search for ambitious candidates.
            </h2>
            <p style={{ color: 'rgba(222,219,200,0.3)', fontSize: '18px', marginBottom: '72px' }}>Built for speed. Powered by AI.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1 — Video */}
            <div ref={card0.ref} style={{ borderRadius: '20px', overflow: 'hidden', position: 'relative', minHeight: '440px', ...revealStyle(card0.visible, 0) }}>
              <video style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted playsInline
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4"
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px' }}>
                <p style={{ color: '#E1E0CC', fontSize: '16px', fontWeight: 500, lineHeight: 1.3 }}>Your job search,<br/>supercharged.</p>
              </div>
            </div>

            {/* Cards 2–4 */}
            {FEATURE_CARDS.map((card, i) => (
              <div
                key={card.num}
                ref={cardRefs[i + 1].ref}
                style={{
                  background: '#111',
                  borderRadius: '20px',
                  padding: '28px',
                  minHeight: '440px',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s, opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                  ...revealStyle(cardRefs[i + 1].visible, (i + 1) * 100),
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(222,219,200,0.12)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(222,219,200,0.06)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(222,219,200,0.4)', fontSize: '11px', fontWeight: 600 }}>{card.num}</span>
                </div>
                <p style={{ color: '#E1E0CC', fontSize: '16px', fontWeight: 500, marginBottom: '20px', lineHeight: 1.3 }}>{card.title}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {card.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'rgba(222,219,200,0.5)' }}>
                      <span style={{ color: '#4ade80', fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
                <button type="button" style={{ marginTop: '24px', color: 'rgba(222,219,200,0.35)', fontSize: '12px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(222,219,200,0.35)')}
                >Learn more →</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ── */}
      <section id="pricing" style={{ background: '#000', padding: '120px 24px' }}>
        <div ref={pricing.ref} style={{ maxWidth: '800px', margin: '0 auto', ...revealStyle(pricing.visible) }}>
          <p style={{ color: 'rgba(222,219,200,0.35)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>Pricing</p>
          <h2 style={{ color: '#E1E0CC', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 400, marginBottom: '12px', fontFamily: 'var(--font-almarai)', letterSpacing: '-0.02em' }}>Simple pricing.</h2>
          <p style={{ color: 'rgba(222,219,200,0.4)', fontSize: '16px', marginBottom: '64px' }}>No hidden fees. Cancel anytime.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

            {/* Free */}
            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '36px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: 'rgba(222,219,200,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '24px' }}>Free forever</p>
              <p style={{ fontSize: 'clamp(48px, 8vw, 64px)', fontWeight: 700, color: '#E1E0CC', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '8px' }}>$0</p>
              <p style={{ color: 'rgba(222,219,200,0.4)', fontSize: '14px', marginBottom: '32px' }}>For students starting their search</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px', marginBottom: '32px' }}>
                {FREE_FEATURES.map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', marginBottom: '12px', color: item.locked ? 'rgba(222,219,200,0.2)' : 'rgba(222,219,200,0.65)' }}>
                    <span style={{ color: item.locked ? 'rgba(222,219,200,0.2)' : '#4ade80', flexShrink: 0, fontSize: '12px' }}>{item.locked ? '✗' : '✓'}</span>
                    {item.locked ? <span style={{ textDecoration: 'line-through' }}>{item.text}</span> : item.text}
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', borderRadius: '999px', padding: '14px', fontSize: '14px', fontWeight: 500, color: '#E1E0CC', textDecoration: 'none', border: '1px solid rgba(222,219,200,0.2)', transition: 'border-color 0.2s, background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(222,219,200,0.4)'; e.currentTarget.style.background = 'rgba(222,219,200,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(222,219,200,0.2)'; e.currentTarget.style.background = 'transparent' }}
              >Get Started Free</Link>
            </div>

            {/* Pro */}
            <div style={{ background: '#0d0d0d', borderRadius: '24px', padding: '36px', border: '1px solid rgba(245,158,11,0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f59e0b', borderRadius: '999px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: '#000', marginBottom: '24px' }}>★ PRO</div>
              <p style={{ fontSize: 'clamp(48px, 8vw, 64px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '8px', background: 'linear-gradient(135deg, #f59e0b, #fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$9.99/mo</p>
              <p style={{ color: 'rgba(222,219,200,0.4)', fontSize: '14px', marginBottom: '32px' }}>Billed monthly · For candidates serious about landing their role</p>
              <div style={{ borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '24px', marginBottom: '32px' }}>
                {PRO_FEATURES.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', marginBottom: '12px', color: 'rgba(222,219,200,0.65)' }}>
                    <span style={{ color: '#4ade80', flexShrink: 0, fontSize: '12px' }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{ display: 'block', textAlign: 'center', borderRadius: '999px', padding: '14px', fontSize: '14px', fontWeight: 600, color: '#000', textDecoration: 'none', background: '#f59e0b', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >Get Started with Pro →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ── */}
      <footer ref={footer.ref} style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '80px 24px 48px', ...revealStyle(footer.visible) }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', marginBottom: '64px' }} className="grid grid-cols-2 md:grid-cols-4">

            <div style={{ gridColumn: 'span 1' }}>
              <p style={{ color: '#E1E0CC', fontSize: '16px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.01em' }}>Vegaply</p>
              <p style={{ color: 'rgba(222,219,200,0.35)', fontSize: '13px', lineHeight: 1.7 }}>AI-powered job preparation for international candidates. Jobs matched, resumes tailored, delivered every morning.</p>
            </div>

            {[
              { title: 'Product', links: [{ label: 'Features', href: '#features' },{ label: 'How it works', href: '#how' },{ label: 'Pricing', href: '#pricing' },{ label: 'Get started', href: '/signup' }] },
              { title: 'Resources', links: [{ label: 'Founder story', href: '#stories' },{ label: 'H1B intelligence', href: '#h1b' },{ label: 'Get started', href: '/signup' }] },
              { title: 'Contact', links: [{ label: 'support@vegaply.com', href: 'mailto:support@vegaply.com' },{ label: 'Privacy policy', href: '/privacy' },{ label: 'Terms of service', href: '/terms' }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ color: 'rgba(222,219,200,0.6)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>{col.title}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a href={link.href} style={{ color: 'rgba(222,219,200,0.4)', fontSize: '14px', lineHeight: 2.2, display: 'block', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(222,219,200,0.4)')}
                      >{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ color: 'rgba(222,219,200,0.3)', fontSize: '13px' }}>© {new Date().getFullYear()} Vegaply. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '32px' }}>
              {[{ label: 'Privacy', href: '/privacy' },{ label: 'Terms', href: '/terms' },{ label: 'Contact', href: 'mailto:support@vegaply.com' }].map(link => (
                <a key={link.label} href={link.href} style={{ color: 'rgba(222,219,200,0.3)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(222,219,200,0.3)')}
                >{link.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
