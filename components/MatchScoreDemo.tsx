'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'vegaply_demo_uses'
const MAX_USES = 2
const MIN_CHARS = 200
const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 326.73

interface DemoResult {
  matchScore: number
  skillsMatched: number
  skillsTotal: number
  keywordsFound: number
  keywordsTotal: number
  experienceFit: string
  missingItems: string[]
  tailoredBulletBefore: string
  tailoredBulletAfter: string
}

function scoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 80) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'STRONG FIT'
  if (score >= 60) return 'MODERATE FIT'
  return 'WEAK FIT'
}

export function MatchScoreDemo() {
  const [resume, setResume]           = useState('')
  const [jobDesc, setJobDesc]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<DemoResult | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [uses, setUses]               = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const rafRef     = useRef<number>(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Read localStorage usage count and motion preference after hydration
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
      setUses(isNaN(stored) ? 0 : stored)
    } catch { /* storage blocked */ }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
  }, [])

  // Count-up animation when result arrives
  useEffect(() => {
    if (!result) return
    cancelAnimationFrame(rafRef.current)

    if (reducedMotion) {
      setDisplayScore(result.matchScore)
      return
    }

    const target   = result.matchScore
    const duration = 1500
    const start    = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [result, reducedMotion])

  // Scroll results into view
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [result])

  const canAnalyze = resume.length >= MIN_CHARS && jobDesc.length >= MIN_CHARS && !loading
  const exhausted  = uses >= MAX_USES && result === null

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setLoading(true)
    setError(null)
    setResult(null)
    setDisplayScore(0)

    try {
      const res = await fetch('/api/demo-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription: jobDesc }),
      })

      if (!res.ok) throw new Error('api_error')
      const data: DemoResult = await res.json()
      if (typeof data.matchScore !== 'number') throw new Error('bad_response')

      setResult(data)
      try {
        const next = uses + 1
        localStorage.setItem(STORAGE_KEY, String(next))
        setUses(next)
      } catch { /* storage blocked */ }
    } catch {
      setError('Something went wrong analyzing this. Try again or sign up for full access.')
    } finally {
      setLoading(false)
    }
  }

  const tier   = result ? scoreTier(result.matchScore) : 'mid'
  const offset = CIRCUMFERENCE * (1 - displayScore / 100)

  return (
    <section className="section-wrap match-demo-section reveal" id="match-demo">

      {/* ── Header ── */}
      <div className="match-demo-header">
        <p className="eyebrow">TRY IT FREE · NO SIGNUP</p>
        <h2 className="section-title">
          See your <em>match score</em> in 10 seconds.
        </h2>
        <p className="section-body">
          Paste your resume and a job description. Our AI scores the fit, shows
          what&rsquo;s missing, and previews how we&rsquo;d tailor it.
        </p>
      </div>

      {/* ── Used-up gate ── */}
      {exhausted ? (
        <div className="demo-gate-card">
          <p className="eyebrow">FREE PREVIEW USED</p>
          <h3 className="demo-gate-heading">
            You&rsquo;ve seen the magic. Ready for the full thing?
          </h3>
          <p className="demo-gate-body">
            Sign up to tailor unlimited resumes and auto-apply to matched jobs.
          </p>
          <Link href="/signup" className="btn-primary btn-primary-lg">
            Sign up free →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Input grid ── */}
          <div className="demo-input-grid">
            <div className="demo-input-card">
              <p className="demo-input-label">YOUR RESUME</p>
              <textarea
                className="demo-textarea"
                placeholder="Paste your resume text here…"
                aria-label="Your resume text"
                value={resume}
                onChange={e => setResume(e.target.value)}
              />
              <p className="demo-char-counter">
                {resume.length} / {MIN_CHARS} min
              </p>
            </div>

            <div className="demo-input-card">
              <p className="demo-input-label">JOB DESCRIPTION</p>
              <textarea
                className="demo-textarea"
                placeholder="Paste the job description here…"
                aria-label="Job description text"
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
              />
              <p className="demo-char-counter">
                {jobDesc.length} / {MIN_CHARS} min
              </p>
            </div>
          </div>

          {/* ── Analyze button ── */}
          <div className="demo-cta-row">
            <button
              className="btn-primary btn-primary-lg"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              aria-disabled={!canAnalyze}
            >
              {loading ? (
                <>
                  <span className="demo-spinner" aria-hidden="true" />
                  Analyzing your fit…
                </>
              ) : (
                'Analyze match →'
              )}
            </button>
            {uses === 1 && !result && (
              <p className="demo-uses-hint">1 free analysis remaining</p>
            )}
          </div>

          {error && (
            <p className="demo-error" role="alert">{error}</p>
          )}
        </>
      )}

      {/* ── Results panel ── */}
      {result && (
        <div className="demo-results-card" ref={resultsRef}>

          {/* Score ring */}
          <div className="demo-score-wrap">
            <div className="demo-score-ring" style={{ willChange: 'transform' }}>
              <svg
                width="140" height="140" viewBox="0 0 120 120"
                aria-label={`Match score: ${result.matchScore}%`}
                role="img"
              >
                <circle className="demo-ring-track" cx="60" cy="60" r={RADIUS} />
                <circle
                  className={`demo-ring-fill demo-ring-fill--${tier}`}
                  cx="60" cy="60" r={RADIUS}
                  style={{
                    strokeDasharray: CIRCUMFERENCE,
                    strokeDashoffset: offset,
                  }}
                />
              </svg>
              <div className="demo-score-inner">
                <span className={`demo-score-number demo-score-number--${tier}`}>
                  {displayScore}%
                </span>
                <span className="demo-score-label">{scoreLabel(result.matchScore)}</span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="demo-stats-grid">
            <div className="demo-stat-card">
              <span className="demo-stat-value">
                {result.skillsMatched} / {result.skillsTotal}
              </span>
              <span className="demo-stat-label">Skills Matched</span>
            </div>
            <div className="demo-stat-card">
              <span className="demo-stat-value">
                {result.keywordsFound} / {result.keywordsTotal}
              </span>
              <span className="demo-stat-label">Keywords Found</span>
            </div>
            <div className="demo-stat-card">
              <span className="demo-stat-value">{result.experienceFit}</span>
              <span className="demo-stat-label">Experience Fit</span>
            </div>
          </div>

          {/* Gaps */}
          {result.missingItems.length > 0 && (
            <div className="demo-gaps">
              <p className="eyebrow">GAPS TO CLOSE</p>
              <ul className="demo-gaps-list">
                {result.missingItems.map((item, i) => (
                  <li key={i} className="demo-gap-item">
                    <span className="demo-gap-x" aria-hidden="true">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored bullet */}
          {result.tailoredBulletBefore && result.tailoredBulletAfter && (
            <div className="demo-bullet-section">
              <p className="eyebrow">PREVIEW: AI-TAILORED BULLET</p>
              <div className="demo-bullet-grid">
                <div className="demo-bullet-card demo-bullet-before">
                  <p className="demo-bullet-label">Before</p>
                  <p className="demo-bullet-text">{result.tailoredBulletBefore}</p>
                </div>
                <div className="demo-bullet-card demo-bullet-after">
                  <p className="demo-bullet-label">After</p>
                  <p className="demo-bullet-text">{result.tailoredBulletAfter}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results CTA */}
          <div className="demo-results-cta">
            <Link href="/signup" className="btn-primary btn-primary-lg">
              Tailor your full resume + auto-apply →
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
