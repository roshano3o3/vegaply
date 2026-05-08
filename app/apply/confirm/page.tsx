"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApplyMethodResult {
  method:    "greenhouse" | "lever" | "ashby" | "workday" | "email" | "manual" | "unknown";
  supported: boolean;
  reason:    string;
}

interface GreenhouseReadiness {
  canAnalyze:                  boolean;
  requiredFields:              string[];
  customQuestions:             string[];
  resumeRequired:              boolean | null;
  coverLetterRequired:         boolean | null;
  sponsorshipQuestionDetected: boolean;
  workAuthQuestionDetected:    boolean;
  missingUserProfileFields?:   string[];
  reason:                      string;
}

interface ConfirmData {
  job_title:             string | null;
  employer_name:         string | null;
  match_score:           number | null;
  cover_letter_text:     string | null;
  tailored_resume_text:  string | null;
  status:                string;
  apply_clicked_at:      string | null;
  apply_method?:         ApplyMethodResult;
  greenhouse_readiness?: GreenhouseReadiness;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreStyle(score: number | null): { bg: string; color: string; border: string } {
  if (score === null) return { bg: "rgba(107,114,128,0.12)", color: "#9ca3af", border: "rgba(107,114,128,0.2)" };
  if (score >= 70)   return { bg: "var(--success-bg)",  color: "var(--success)",  border: "var(--success-border)" };
  if (score >= 50)   return { bg: "var(--gold-subtle)", color: "var(--gold)",     border: "var(--gold-border)" };
  return               { bg: "var(--error-bg)",   color: "var(--error)",   border: "var(--error-border)"  };
}

function methodChipStyle(method: ApplyMethodResult["method"]): { bg: string; color: string; border: string } {
  if (method === "greenhouse" || method === "lever" || method === "ashby" || method === "workday")
    return { bg: "var(--gold-subtle)", color: "var(--gold)",           border: "var(--gold-border)" };
  if (method === "email")
    return { bg: "var(--surface)",    color: "var(--text-secondary)", border: "var(--border)" };
  if (method === "manual")
    return { bg: "var(--gold-subtle)", color: "var(--gold)",           border: "var(--gold-border)" };
  return   { bg: "var(--surface)",    color: "var(--text-dim)",       border: "var(--border)" };
}

function formatBool(val: boolean | null): string {
  if (val === null) return "Unknown";
  return val ? "Yes" : "No";
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{
        fontSize: 9, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: ".09em", color: "rgba(255,255,255,0.22)",
      }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.68)" }}>
        {value}
      </span>
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent fallback */ }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        color:      copied ? "var(--success)" : "var(--gold)",
        background: copied ? "var(--success-bg)" : "var(--gold-bg)",
        border:     `1px solid ${copied ? "var(--success-border)" : "var(--gold-border)"}`,
        borderRadius: "var(--radius-sm)", padding: "4px 12px", cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  .cp-root{min-height:100vh;background:var(--bg);font-family:var(--font-primary);color:var(--text-primary)}
  .cp-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 40px;border-bottom:1px solid var(--border-subtle);position:sticky;top:0;background:rgba(10,10,12,0.92);backdrop-filter:blur(12px);z-index:10}
  .cp-logo{font-size:20px;font-weight:800;color:var(--text-primary);text-decoration:none;letter-spacing:-0.5px}
  .cp-logo em{font-style:italic;color:var(--gold)}
  .cp-back{font-size:13px;color:var(--text-muted);text-decoration:none;transition:color .2s}
  .cp-back:hover{color:var(--text-secondary)}
  .cp-wrap{max-width:680px;margin:0 auto;padding:52px 24px 96px}
  .cp-eyebrow{font-size:10px;font-weight:700;color:var(--gold);letter-spacing:1.6px;text-transform:uppercase;margin-bottom:12px}
  .cp-title{font-size:clamp(26px,4vw,36px);font-weight:700;color:var(--text-primary);letter-spacing:-0.5px;line-height:1.15;margin:0 0 8px}
  .cp-subtitle{font-size:15px;color:var(--text-secondary);line-height:1.65;margin:0 0 36px}
  .cp-job{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:32px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
  .cp-job-title{font-size:18px;font-weight:700;color:var(--text-primary);margin:0 0 4px}
  .cp-job-co{font-size:14px;color:var(--text-secondary);margin:0}
  .cp-badge{display:inline-flex;align-items:center;padding:5px 12px;border-radius:100px;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0}
  .cp-sec{margin-bottom:28px}
  .cp-sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .cp-sec-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted)}
  .cp-textbox{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px 18px;font-size:14px;color:rgba(255,255,255,0.62);line-height:1.75;max-height:280px;overflow-y:auto;white-space:pre-wrap;word-break:break-word}
  .cp-divider{height:1px;background:var(--border-subtle);margin:36px 0}
  .cp-cta-section{margin-top:36px}
  .cp-cta{display:inline-flex;align-items:center;gap:8px;background:var(--gold);color:#000;padding:14px 32px;border-radius:var(--radius-md);font-weight:700;font-size:16px;text-decoration:none;transition:background 0.15s;letter-spacing:-0.2px}
  .cp-cta:hover{background:var(--gold-hover)}
  .cp-cta-note{font-size:12px;color:rgba(255,255,255,0.22);margin-top:10px;line-height:1.5}
  .cp-error{text-align:center;padding:96px 24px}
  .cp-error-icon{font-size:40px;margin-bottom:20px}
  .cp-error-title{font-size:22px;font-weight:700;color:var(--text-primary);margin-bottom:8px}
  .cp-error-msg{font-size:15px;color:var(--text-muted);margin-bottom:28px;line-height:1.6}
  .cp-error-link{font-size:14px;color:var(--gold);text-decoration:none}
  .cp-error-link:hover{text-decoration:underline}
  .cp-loading{text-align:center;padding:96px 24px;color:var(--text-muted);font-size:14px}
  .cp-method{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:28px}
  .cp-method-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,0.25);margin-bottom:8px}
  .cp-method-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;margin-bottom:6px}
  .cp-method-reason{font-size:13px;color:var(--text-muted);line-height:1.55;margin:0}
  @media(max-width:600px){
    .cp-nav{padding:14px 18px}
    .cp-wrap{padding:36px 16px 72px}
    .cp-job{flex-direction:column;gap:10px}
    .cp-cta{width:100%;justify-content:center}
  }
`;

// ── Main content ──────────────────────────────────────────────────────────────

function ConfirmContent() {
  const params   = useSearchParams();
  const token    = params.get("token") ?? "";
  const [data,   setData]   = useState<ConfirmData | null>(null);
  const [err,    setErr]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setErr("missing_token"); setLoading(false); return; }
    fetch(`/api/apply-confirm?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((d: ConfirmData & { error?: string }) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch(() => setErr("network_error"))
      .finally(() => setLoading(false));
  }, [token]);

  const badge        = scoreStyle(data?.match_score ?? null);
  const redirectHref = token
    ? `/api/apply-redirect?token=${encodeURIComponent(token)}`
    : "#";

  return (
    <div className="cp-root">
      <style>{CSS}</style>

      <nav className="cp-nav">
        <Link href="/" className="cp-logo">Vega<em>ply</em></Link>
        <a href="/home" className="cp-back">← Dashboard</a>
      </nav>

      {loading && (
        <div className="cp-loading">Loading your application…</div>
      )}

      {!loading && err && (
        <div className="cp-error">
          <div className="cp-error-icon">
            {err === "network_error" ? "📡" : "🔒"}
          </div>
          <div className="cp-error-title">
            {err === "missing_token"
              ? "Missing apply token"
              : err === "network_error"
                ? "Could not load application"
                : "Apply link expired"}
          </div>
          <div className="cp-error-msg">
            {err === "missing_token"
              ? "This link is incomplete. Please open the latest Vegaply email and try again."
              : err === "network_error"
                ? "Please check your connection and refresh this page."
                : "This apply link is invalid or expired. Open the latest Vegaply email for a fresh link."}
          </div>
          <a href="/home" className="cp-error-link">← Go to dashboard</a>
        </div>
      )}

      {!loading && data && (
        <div className="cp-wrap">
          <div className="cp-eyebrow">Auto-apply · Vegaply</div>
          <h1 className="cp-title">Your application is ready</h1>
          <p className="cp-subtitle">
            Review your generated materials below, then continue to the company application page.
          </p>

          {/* Job card */}
          <div className="cp-job">
            <div>
              <p className="cp-job-title">{data.job_title ?? "Unknown Role"}</p>
              <p className="cp-job-co">{data.employer_name ?? "Unknown Company"}</p>
            </div>
            {data.match_score !== null && (
              <span
                className="cp-badge"
                style={{
                  background: badge.bg,
                  color:      badge.color,
                  border:     `1px solid ${badge.border}`,
                }}
              >
                {data.match_score}% match
              </span>
            )}
          </div>

          {/* Cover letter */}
          {data.cover_letter_text && (
            <div className="cp-sec">
              <div className="cp-sec-header">
                <span className="cp-sec-label">Cover Letter</span>
                <CopyButton text={data.cover_letter_text} />
              </div>
              <div className="cp-textbox">{data.cover_letter_text}</div>
            </div>
          )}

          {/* Resume summary */}
          {data.tailored_resume_text && (
            <div className="cp-sec">
              <div className="cp-sec-header">
                <span className="cp-sec-label">Tailored Resume Summary</span>
                <CopyButton text={data.tailored_resume_text} />
              </div>
              <div className="cp-textbox">{data.tailored_resume_text}</div>
            </div>
          )}

          {/* Submission method */}
          {data.apply_method && (
            <div
              className="cp-method"
              style={data.apply_method.method === "greenhouse" ? {
                background:  "var(--primary-subtle)",
                borderColor: "var(--gold-border)",
              } : {}}
            >
              <div className="cp-method-label">Submission method</div>
              <div
                className="cp-method-chip"
                style={{
                  background: methodChipStyle(data.apply_method.method).bg,
                  color:      methodChipStyle(data.apply_method.method).color,
                  border:     `1px solid ${methodChipStyle(data.apply_method.method).border}`,
                }}
              >
                {data.apply_method.method === "greenhouse" && "🌿 "}
                {data.apply_method.method === "lever"      && "⚙ "}
                {data.apply_method.method === "ashby"      && "◈ "}
                {data.apply_method.method === "workday"    && "☁ "}
                {data.apply_method.method === "email"      && "✉ "}
                {data.apply_method.method === "manual"     && "🔗 "}
                {data.apply_method.method.charAt(0).toUpperCase() + data.apply_method.method.slice(1)}
              </div>
              {data.apply_method.method === "greenhouse" ? (
                <>
                  <p style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                    color: "rgba(255,255,255,0.75)", margin: "0 0 4px", lineHeight: 1.5,
                  }}>
                    Greenhouse detected
                  </p>
                  <p className="cp-method-reason" style={{ marginBottom: 14 }}>
                    Automatic submission is not enabled yet. Vegaply can use this source for assisted apply in a future step.
                  </p>

                  {/* Readiness section */}
                  {data.greenhouse_readiness && (
                    <>
                      <div style={{
                        borderTop: "1px solid var(--border-subtle)", marginBottom: 12,
                      }} />
                      <div style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: ".1em", color: "rgba(255,255,255,0.22)", marginBottom: 10,
                      }}>
                        Greenhouse readiness
                      </div>

                      {data.greenhouse_readiness.canAnalyze ? (
                        <>
                          {/* Stat pills */}
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12 }}>
                            <StatPill
                              label="Required fields"
                              value={data.greenhouse_readiness.requiredFields.length > 0
                                ? String(data.greenhouse_readiness.requiredFields.length)
                                : "—"}
                            />
                            <StatPill
                              label="Resume"
                              value={formatBool(data.greenhouse_readiness.resumeRequired)}
                            />
                            <StatPill
                              label="Cover letter"
                              value={formatBool(data.greenhouse_readiness.coverLetterRequired)}
                            />
                            {data.greenhouse_readiness.customQuestions.length > 0 && (
                              <StatPill
                                label="Custom questions"
                                value={String(data.greenhouse_readiness.customQuestions.length)}
                              />
                            )}
                          </div>

                          {/* Work auth / sponsorship warning */}
                          {(data.greenhouse_readiness.sponsorshipQuestionDetected ||
                            data.greenhouse_readiness.workAuthQuestionDetected) && (
                            <div style={{
                              fontSize: 12, color: "var(--gold)",
                              background: "var(--gold-bg)",
                              border: "1px solid var(--gold-border)",
                              borderRadius: "var(--radius-sm)", padding: "6px 10px", marginBottom: 10,
                            }}>
                              ⚠ This application may require work authorization answers.
                            </div>
                          )}

                          {/* Profile completeness */}
                          {(data.greenhouse_readiness.missingUserProfileFields ?? []).length > 0 ? (
                            <div style={{
                              background: "var(--warning-bg)",
                              border: "1px solid var(--gold-border)",
                              borderRadius: 8, padding: "10px 12px", marginBottom: 10,
                            }}>
                              <p style={{
                                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                                color: "var(--gold)", margin: "0 0 4px", lineHeight: 1.4,
                              }}>
                                Complete your profile before assisted apply.
                              </p>
                              <p style={{
                                fontFamily: "inherit", fontSize: 12,
                                color: "rgba(245,158,11,0.7)", margin: "0 0 8px", lineHeight: 1.5,
                              }}>
                                Missing: {(data.greenhouse_readiness.missingUserProfileFields ?? []).join(", ")}
                              </p>
                              <a
                                href="/profile"
                                style={{
                                  fontSize: 12, fontWeight: 600,
                                  color: "var(--gold)", textDecoration: "none",
                                }}
                              >
                                Update Profile →
                              </a>
                            </div>
                          ) : (
                            <p style={{
                              fontFamily: "inherit", fontSize: 12,
                              color: "rgba(16,185,129,0.7)", margin: "0 0 10px", lineHeight: 1.5,
                            }}>
                              ✓ Your profile has the standard fields needed for this application.
                            </p>
                          )}

                          <p style={{
                            fontFamily: "inherit", fontSize: 11,
                            color: "rgba(255,255,255,0.25)", margin: 0, lineHeight: 1.55,
                          }}>
                            Vegaply is analyzing this application type for future assisted apply.
                          </p>
                        </>
                      ) : (
                        <p style={{
                          fontFamily: "inherit", fontSize: 12,
                          color: "rgba(255,255,255,0.28)", margin: 0, lineHeight: 1.5,
                        }}>
                          {data.greenhouse_readiness.reason}
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="cp-method-reason">{data.apply_method.reason}</p>
              )}
            </div>
          )}

          <div className="cp-divider" />

          {/* CTA */}
          <div className="cp-cta-section">
            <a
              href={redirectHref}
              target="_blank"
              rel="noopener noreferrer"
              className="cp-cta"
            >
              Continue to Company Application →
            </a>
            <p className="cp-cta-note">
              Opens in a new tab. Copy your materials above before clicking — you can reference
              them while filling in the company&apos;s form.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page export (Suspense required for useSearchParams) ───────────────────────

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: "100vh", background: "var(--bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontFamily: "var(--font-primary)", fontSize: 14,
        }}>
          Loading…
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
