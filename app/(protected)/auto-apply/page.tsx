"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { detectApplyMethod, ApplyMethod } from "@/lib/apply/detect-apply-method";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueRow {
  id:                    string;
  job_id:                string;
  job_title:             string | null;
  employer_name:         string | null;
  match_score:           number | null;
  status:                string;
  tailored_resume_text:  string | null;
  cover_letter_text:     string | null;
  applied_at:            string | null;
  apply_clicked_at:      string | null;
  error_message:         string | null;
  job_apply_link:        string | null;
}

interface StatusStyle {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
}

interface MeStatusResult {
  has_active_subscription: boolean;
  plan:                    "free" | "pro";
  daily_limit:             number;
  profile_complete:        boolean;
  missing:                 string[];
  has_queue_today:         boolean;
  queue_count:             number;
  reason: "profile_incomplete" | "queue_not_built" | "ready";
}

// ── Status helper ─────────────────────────────────────────────────────────────

function resolveStatus(status: string, tailored: string | null, clickedAt?: string | null): StatusStyle {
  if (status === "pending" && !tailored)
    return { label: "Pending",       color: "var(--text-secondary)", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.18)" };
  if (status === "pending" && tailored)
    return { label: "Ready",         color: "#06b6d4",               bg: "rgba(6,182,212,0.10)",   border: "rgba(6,182,212,0.25)"  };
  if (status === "applied" && clickedAt)
    return { label: "Clicked Apply", color: "var(--success)",        bg: "var(--success-bg)",      border: "var(--success-border)" };
  if (status === "applied")
    return { label: "Sent",          color: "var(--primary)",        bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.28)" };
  if (status === "failed")
    return { label: "Failed",        color: "var(--error)",          bg: "var(--error-bg)",        border: "var(--error-border)"   };
  if (status === "skipped")
    return { label: "Skipped",       color: "#6b7280",               bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.18)"};
  return   { label: status,          color: "var(--text-secondary)", bg: "rgba(161,161,170,0.06)", border: "rgba(161,161,170,0.16)"};
}

// ── Counts ────────────────────────────────────────────────────────────────────

function computeCounts(rows: QueueRow[]) {
  return {
    total:     rows.length,
    pending:   rows.filter(r => r.status === "pending" && !r.tailored_resume_text).length,
    generated: rows.filter(r => r.status === "pending" && !!r.tailored_resume_text).length,
    sentToYou: rows.filter(r => r.status === "applied" && !r.apply_clicked_at).length,
    clicked:   rows.filter(r => r.status === "applied" && !!r.apply_clicked_at).length,
    failed:    rows.filter(r => r.status === "failed").length,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function scoreColor(n: number | null): string {
  if (n === null) return "var(--text-tertiary)";
  if (n >= 70)   return "var(--success)";
  if (n >= 50)   return "var(--primary)";
  return "var(--text-tertiary)";
}

// ── Method chip helpers ───────────────────────────────────────────────────────

const METHOD_LABEL: Record<ApplyMethod, string> = {
  greenhouse: "Greenhouse",
  lever:      "Lever",
  ashby:      "Ashby",
  workday:    "Workday",
  email:      "Email",
  manual:     "Manual",
  unknown:    "Unknown",
};

const METHOD_ICON: Record<ApplyMethod, string> = {
  greenhouse: "🌿",
  lever:      "⚙",
  ashby:      "◈",
  workday:    "☁",
  email:      "✉",
  manual:     "🔗",
  unknown:    "?",
};

function methodChipStyle(method: ApplyMethod): { bg: string; color: string; border: string } {
  if (method === "greenhouse" || method === "lever" || method === "ashby" || method === "workday")
    return { bg: "var(--primary-subtle)", color: "var(--primary-light)", border: "var(--gold-border)" };
  if (method === "email")
    return { bg: "var(--surface)",        color: "var(--text-secondary)", border: "var(--border)"       };
  if (method === "manual")
    return { bg: "var(--gold-bg)",        color: "var(--primary)",        border: "var(--gold-border)"  };
  return   { bg: "var(--surface)",        color: "var(--text-tertiary)",  border: "var(--border-subtle)"};
}

function MethodChip({ link }: { link: string | null }) {
  const m  = detectApplyMethod({ job_apply_link: link });
  const cs = methodChipStyle(m.method);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 5,
      fontFamily: "var(--font-primary)", fontSize: 11, fontWeight: 600,
      background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`,
      whiteSpace: "nowrap",
    }}>
      {METHOD_ICON[m.method]} {METHOD_LABEL[m.method]}
    </span>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, tailored, clickedAt }: { status: string; tailored: string | null; clickedAt?: string | null }) {
  const s = resolveStatus(status, tailored, clickedAt);
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 700, fontFamily: "var(--font-primary)",
      letterSpacing: "0.03em", background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, bg, border, glow, index }: {
  label: string; value: number; color: string; bg: string; border: string;
  glow?: string; index?: number;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: "18px 18px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        boxShadow: glow ? `0 4px 20px ${glow}` : "var(--shadow-card)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        cursor: "default",
        animation: "cardFadeUp 400ms ease both",
        animationDelay: `${(index ?? 0) * 55}ms`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = glow ? `0 8px 28px ${glow}` : "var(--shadow-card-hover)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = glow ? `0 4px 20px ${glow}` : "var(--shadow-card)";
      }}
    >
      <span style={{
        fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
        color, lineHeight: 1, letterSpacing: "-1.2px",
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "var(--font-primary)", fontSize: 10, color: "var(--text-muted)",
        fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em",
      }}>
        {label}
      </span>
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, field, copiedField, onCopy }: {
  text:        string;
  field:       "resume" | "letter";
  copiedField: "resume" | "letter" | null;
  onCopy:      (text: string, field: "resume" | "letter") => void;
}) {
  const copied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(text, field)}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      onMouseEnter={e => {
        if (!copied) {
          const el = e.currentTarget;
          el.style.background = "rgba(255,255,255,0.09)";
          el.style.color = "var(--text-primary)";
          el.style.borderColor = "var(--border-strong)";
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          const el = e.currentTarget;
          el.style.background = "var(--surface)";
          el.style.color = "var(--text-secondary)";
          el.style.borderColor = "var(--border)";
        }
      }}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 12px", borderRadius: "var(--radius-sm)", cursor: "pointer",
        fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 600,
        border: `1px solid ${copied ? "var(--success-border)" : "var(--border)"}`,
        background: copied ? "var(--success-bg)" : "var(--surface)",
        color: copied ? "var(--success)" : "var(--text-secondary)",
        transition: "all 160ms",
      }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ── ContentBlock ──────────────────────────────────────────────────────────────

function ContentBlock({ text, field, copiedField, onCopy, label }: {
  text:        string | null;
  field:       "resume" | "letter";
  copiedField: "resume" | "letter" | null;
  onCopy:      (text: string, field: "resume" | "letter") => void;
  label:       string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontFamily: "var(--font-primary)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)",
        }}>
          {label}
        </span>
        {text && (
          <CopyButton text={text} field={field} copiedField={copiedField} onCopy={onCopy} />
        )}
      </div>
      {text ? (
        <div style={{
          background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8,
          padding: "14px 16px", maxHeight: 280, overflowY: "auto",
          fontFamily: "var(--font-primary)", fontSize: 13, color: "#d4d4d8",
          lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {text}
        </div>
      ) : (
        <div style={{
          background: "var(--bg-elev)", border: "1px dashed var(--border)", borderRadius: 8,
          padding: "20px 16px", textAlign: "center",
          fontFamily: "var(--font-primary)", fontSize: 13, color: "var(--text-tertiary)",
        }}>
          Generated content is not ready yet.
        </div>
      )}
    </div>
  );
}

// ── DetailDrawer ──────────────────────────────────────────────────────────────

function DetailDrawer({ row, onClose, copiedField, onCopy }: {
  row:         QueueRow;
  onClose:     () => void;
  copiedField: "resume" | "letter" | null;
  onCopy:      (text: string, field: "resume" | "letter") => void;
}) {
  const st = resolveStatus(row.status, row.tailored_resume_text, row.apply_clicked_at);

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 49,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail: ${row.job_title ?? "Job"}`}
        style={{
          position:  "fixed",
          top:       0,
          right:     0,
          bottom:    0,
          width:     "min(500px, 95vw)",
          background: "var(--bg-elev)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-12px 0 60px rgba(0,0,0,0.65), -1px 0 0 rgba(245,158,11,0.08)",
          zIndex:    50,
          display:   "flex",
          flexDirection: "column",
          overflowY: "hidden",
        }}
      >
        {/* Drawer header */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid var(--border)",
          background: `linear-gradient(180deg, var(--bg-card) 0%, var(--bg-elev) 100%)`,
          borderLeft: "3px solid rgba(245,158,11,0.50)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
                color: "var(--text-primary)", margin: "0 0 3px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {row.job_title ?? "—"}
              </p>
              <p style={{
                fontFamily: "var(--font-primary)", fontSize: 13, color: "var(--text-secondary)",
                margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {row.employer_name ?? "—"}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close detail panel"
              style={{
                background: "var(--border-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 8, width: 32, height: 32, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-secondary)", fontSize: 16, flexShrink: 0,
                fontFamily: "var(--font-primary)",
              }}
            >
              ✕
            </button>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {row.match_score !== null && (
              <span style={{
                fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                color: scoreColor(row.match_score),
              }}>
                {row.match_score}% match
              </span>
            )}
            <StatusBadge status={row.status} tailored={row.tailored_resume_text} clickedAt={row.apply_clicked_at} />
            {row.applied_at && (
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)" }}>
                Sent {fmtDate(row.applied_at)}
              </span>
            )}
            {row.apply_clicked_at && (
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--success)", fontWeight: 500 }}>
                ↗ Clicked Apply {fmtDate(row.apply_clicked_at)}
              </span>
            )}
          </div>

          {/* Error callout */}
          {row.status === "failed" && row.error_message && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 7,
              background: "var(--error-bg)", border: "1px solid var(--error-border)",
              fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--error)",
            }}>
              {row.error_message}
            </div>
          )}

          {/* Apply button */}
          {row.job_apply_link && (
            <a
              href={`/api/apply-redirect-by-id?id=${encodeURIComponent(row.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14,
                padding: "10px 22px", borderRadius: "var(--radius-md)",
                background: "var(--grad-1)",
                color: "#0a0a0c",
                fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "var(--shadow-amber)",
              }}
            >
              Continue to Company Application →
            </a>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px",
          display: "flex", flexDirection: "column", gap: 28,
        }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <ContentBlock
              label="Tailored Resume"
              field="resume"
              text={row.tailored_resume_text}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px" }}>
            <ContentBlock
              label="Cover Letter"
              field="letter"
              text={row.cover_letter_text}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          </div>

          {/* Submission method */}
          {(() => {
            const m  = detectApplyMethod({ job_apply_link: row.job_apply_link });
            const cs = methodChipStyle(m.method);
            return (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)",
                  display: "block", marginBottom: 8,
                }}>
                  Submission method
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 600,
                  background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`,
                  marginBottom: 8,
                }}>
                  {METHOD_ICON[m.method]} {METHOD_LABEL[m.method]}
                </span>
                <p style={{
                  fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)",
                  margin: 0, lineHeight: 1.6,
                }}>
                  {m.reason}
                </p>
              </div>
            );
          })()}

          {/* Status note for applied rows */}
          {row.status === "applied" && (
            <div style={{
              borderTop: "1px solid var(--border-subtle)", paddingTop: 20,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <p style={{
                fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)",
                margin: 0, lineHeight: 1.6,
              }}>
                These materials were emailed to you. Use the Apply Now link above to open the company&apos;s application page.
              </p>
              {row.apply_clicked_at ? (
                <p style={{
                  fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--success)",
                  margin: 0, lineHeight: 1.6,
                }}>
                  You opened the company application page on {fmtDate(row.apply_clicked_at)}.
                </p>
              ) : (
                <p style={{
                  fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)",
                  margin: 0, lineHeight: 1.6,
                }}>
                  <strong style={{ color: "var(--text-muted)" }}>Clicked Apply</strong> appears here once you open the company&apos;s application page from your Vegaply email.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ meStatus }: { meStatus: MeStatusResult | null }) {
  const glowCard: React.CSSProperties = {
    background: "linear-gradient(145deg, var(--bg-card) 0%, var(--bg-card-end) 100%)",
    border: "1px solid rgba(245,158,11,0.18)",
    borderRadius: 18,
    padding: "72px 40px",
    textAlign: "center",
    boxShadow: "0 4px 40px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
    animation: "cardFadeUp 500ms ease both",
  };
  const iconWrap: React.CSSProperties = {
    width: 64, height: 64,
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 18,
    background: "var(--gold-bg)",
    border: "1px solid var(--gold-border)",
    boxShadow: "0 0 28px rgba(245,158,11,0.10)",
    margin: "0 auto 20px",
    fontSize: 28,
  };
  const title: React.CSSProperties = {
    fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)",
    margin: "0 0 10px", fontWeight: 700, letterSpacing: "-0.3px",
  };
  const body: React.CSSProperties = {
    fontFamily: "var(--font-primary)", fontSize: 14, color: "var(--text-muted)",
    margin: 0, lineHeight: 1.65, maxWidth: 400, marginInline: "auto",
  };

  if (!meStatus) {
    return (
      <div style={glowCard}>
        <div style={iconWrap}>🗂</div>
        <p style={title}>Your queue will appear here once Vegaply prepares today&apos;s packs.</p>
        <p style={body}>AI-matched roles, tailored resumes, and cover letters are built once each morning. Your first pack will be ready tomorrow.</p>
      </div>
    );
  }

  if (meStatus.reason === "profile_incomplete") {
    const packCount = meStatus.daily_limit;
    return (
      <div style={glowCard}>
        <div style={iconWrap}>📝</div>
        <p style={title}>
          Complete your profile to unlock {packCount} free daily pack{packCount !== 1 ? "s" : ""}.
        </p>
        <p style={{ ...body, marginBottom: 20 }}>
          Vegaply needs your target role, location, and resume to build your daily queue.
        </p>
        {meStatus.missing.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {meStatus.missing.map(field => (
              <span
                key={field}
                style={{
                  display: "inline-block", padding: "4px 14px", borderRadius: 100,
                  fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 600,
                  background: "var(--error-bg)", border: "1px solid var(--error-border)",
                  color: "var(--error)",
                }}
              >
                {field}
              </span>
            ))}
          </div>
        )}
        <a href="/profile" style={{
          display: "inline-block", padding: "10px 24px", borderRadius: "var(--radius-md)",
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.32)",
          color: "var(--primary)", fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700,
          textDecoration: "none",
        }}>
          Update Profile →
        </a>
      </div>
    );
  }

  if (meStatus.reason === "queue_not_built") {
    const packCount = meStatus.daily_limit;
    const planLabel = meStatus.plan === "free" ? "Free" : "Pro";
    return (
      <div style={glowCard}>
        <div style={iconWrap}>⏳</div>
        <p style={title}>Your first pack will be ready tomorrow morning.</p>
        <p style={body}>
          {planLabel} plan · {packCount} application pack{packCount !== 1 ? "s" : ""} per day.
          Vegaply builds your queue once each day based on your target roles and resume.
        </p>
      </div>
    );
  }

  // reason === "ready" but rows is empty
  return (
    <div style={glowCard}>
      <div style={iconWrap}>🗂</div>
      <p style={title}>Your queue will appear here once Vegaply prepares today&apos;s packs.</p>
      <p style={body}>AI-matched roles, tailored resumes, and cover letters — ready each morning.</p>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

const COLS = [
  { label: "Job Title",  w: "minmax(160px, 2fr)"  },
  { label: "Company",    w: "minmax(130px, 1.5fr)" },
  { label: "Score",      w: "70px"                 },
  { label: "Status",     w: "140px"                },
  { label: "Method",     w: "102px"                },
  { label: "Generated",  w: "82px"                 },
  { label: "Email Sent", w: "130px"                },
  { label: "Error",      w: "minmax(100px, 1fr)"   },
  { label: "Link",       w: "64px"                 },
] as const;

const GRID = COLS.map(c => c.w).join(" ");

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AutoApplyPage() {
  const [rows,        setRows]        = useState<QueueRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dbError,     setDbError]     = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<QueueRow | null>(null);
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"resume" | "letter" | null>(null);
  const [sending,     setSending]     = useState(false);
  const [sendError,   setSendError]   = useState<string | null>(null);
  const [meStatus,    setMeStatus]    = useState<MeStatusResult | null>(null);

  // Data fetch — extracted so it can be called after "Send Ready Items Now"
  const fetchRows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_queue")
      .select(
        "id, job_id, job_title, employer_name, match_score, status, " +
        "tailored_resume_text, cover_letter_text, applied_at, apply_clicked_at, error_message, job_apply_link",
      )
      .eq("user_id", user.id)
      .eq("queue_date", today)
      .order("match_score", { ascending: false });

    if (error) {
      console.error("[auto-apply] query error:", error.message);
      setDbError(error.message);
    } else {
      const fetched = (data ?? []) as unknown as QueueRow[];
      setRows(fetched);
      try {
        const res = await fetch("/api/daily-queue/me-status");
        if (res.ok) setMeStatus(await res.json() as MeStatusResult);
      } catch { /* non-fatal */ }
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const handleSendReady = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/daily-queue/apply-user", { method: "POST" });
      const body = await res.json().catch(() => ({})) as { error?: string; applied?: number };
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if ((body.applied ?? 0) === 0) {
        setSendError("No generated packs to send yet — packs are built each morning at 8am.");
      }
      await fetchRows();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  // ESC to close drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedRow(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = selectedRow ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedRow]);

  const handleCopy = (text: string, field: "resume" | "letter") => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 56px)", gap: 14,
        fontFamily: "var(--font-primary)",
      }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(245,158,11,0.25)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Loading today&apos;s application pack…</span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (dbError) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "calc(100vh - 56px)",
        fontFamily: "var(--font-primary)", gap: 10,
      }}>
        <span style={{ fontSize: 26 }}>⚠️</span>
        <p style={{ margin: 0, color: "var(--error)", fontSize: 14 }}>Failed to load queue data.</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{dbError}</p>
      </div>
    );
  }

  const counts = computeCounts(rows);

  const summaryCards = [
    { label: "Total",    value: counts.total,     color: "var(--text-primary)", bg: "linear-gradient(145deg,#1a1a21,#111116)", border: "rgba(255,255,255,0.09)", glow: undefined                  },
    { label: "Pending",  value: counts.pending,   color: "var(--text-secondary)", bg: "rgba(161,161,170,0.05)",               border: "rgba(161,161,170,0.14)", glow: undefined                  },
    { label: "Ready",    value: counts.generated, color: "#06b6d4",             bg: "rgba(6,182,212,0.07)",                   border: "rgba(6,182,212,0.22)",   glow: "rgba(6,182,212,0.08)"     },
    { label: "Sent",     value: counts.sentToYou, color: "var(--primary)",      bg: "var(--gold-bg)",                         border: "var(--gold-border)",     glow: "var(--primary-subtle)"    },
    { label: "Clicked",  value: counts.clicked,   color: "var(--success)",      bg: "var(--success-bg)",                      border: "var(--success-border)",  glow: "rgba(16,185,129,0.08)"    },
    { label: "Failed",   value: counts.failed,    color: "var(--error)",        bg: "var(--error-bg)",                        border: "var(--error-border)",    glow: "rgba(239,68,68,0.08)"     },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes cardFadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pageFadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div style={{ minHeight: "100vh", padding: "28px 24px 96px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28, animation: "pageFadeIn 500ms ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <h1 style={{
                fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
                color: "var(--text-primary)", margin: 0, letterSpacing: "-0.6px",
              }}>
                Today&apos;s Application Pack
              </h1>
              {meStatus && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 100,
                  fontFamily: "var(--font-primary)", fontSize: 11, fontWeight: 700,
                  background: meStatus.plan === "pro" ? "rgba(6,182,212,0.10)" : "var(--primary-subtle)",
                  border: `1px solid ${meStatus.plan === "pro" ? "rgba(6,182,212,0.28)" : "var(--gold-border)"}`,
                  color: meStatus.plan === "pro" ? "#22d3ee" : "var(--primary)",
                }}>
                  {meStatus.plan === "pro" ? "Pro" : "Free"} · {meStatus.daily_limit} daily pack{meStatus.daily_limit !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p style={{ fontFamily: "var(--font-primary)", fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
              AI-matched roles, tailored materials, and Gmail-ready application packs for today.
            </p>
          </div>

          {/* ── Summary strip ───────────────────────────────────────── */}
          {rows.length > 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
              gap: 10, marginBottom: 16,
            }}>
              {summaryCards.map((c, i) => <SummaryCard key={c.label} {...c} index={i} />)}
            </div>
          )}

          {/* ── Send Today's Ready Pack ──────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            <button
              onClick={handleSendReady}
              disabled={sending || counts.generated === 0}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 22px", borderRadius: "var(--radius-md)",
                cursor: sending || counts.generated === 0 ? "not-allowed" : "pointer",
                fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700,
                background: sending ? "var(--primary-subtle)" : counts.generated === 0 ? "rgba(245,158,11,0.04)" : "linear-gradient(135deg,rgba(245,158,11,0.20),rgba(251,191,36,0.12))",
                border: `1px solid ${sending || counts.generated === 0 ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.40)"}`,
                color: sending || counts.generated === 0 ? "rgba(245,158,11,0.38)" : "var(--primary)",
                transition: "all 160ms",
                boxShadow: counts.generated > 0 && !sending ? "0 2px 14px rgba(245,158,11,0.12)" : "none",
              }}
            >
              {sending ? (
                <>
                  <span style={{ display: "inline-block", width: 13, height: 13, border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Sending pack…
                </>
              ) : (
                <>✉ Send Today&apos;s Ready Pack</>
              )}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {counts.generated > 0 && !sending && (
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-muted)" }}>
                  Sends generated application packs to your Gmail.
                </span>
              )}
              {counts.generated === 0 && counts.pending > 0 && !sending && (
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
                  Generate materials first before sending.
                </span>
              )}
            </div>
            {sendError && (
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--error)",
                background: "var(--error-bg)", border: "1px solid var(--error-border)",
                borderRadius: "var(--radius-sm)", padding: "5px 10px",
              }}>
                {sendError}
              </span>
            )}
          </div>

          {/* ── Empty state ─────────────────────────────────────────── */}
          {rows.length === 0 ? (
            <EmptyState meStatus={meStatus} />
          ) : (
            /* ── Table ────────────────────────────────────────────── */
            <div style={{
              background: "var(--bg-elev)", border: "1px solid var(--border)",
              borderRadius: 16, overflow: "hidden",
              boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
            }}>
              <div style={{ overflowX: "auto" }}>
                {/* Header row */}
                <div style={{
                  display: "grid", gridTemplateColumns: GRID,
                  gap: 8, padding: "12px 20px",
                  background: "var(--surface)", borderBottom: "1px solid var(--border)",
                  minWidth: 900,
                  position: "sticky", top: 0, zIndex: 1,
                }}>
                  {COLS.map(col => (
                    <span key={col.label} style={{
                      fontFamily: "var(--font-primary)", fontSize: 10, fontWeight: 700,
                      color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>
                      {col.label}
                    </span>
                  ))}
                </div>

                {/* Data rows */}
                {rows.map((row, i) => {
                  const isSelected = selectedRow?.id === row.id;
                  const isHovered  = hoveredId === row.id;

                  let rowBg = "transparent";
                  if (isSelected) rowBg = "rgba(245,158,11,0.08)";
                  else if (isHovered) rowBg = "rgba(255,255,255,0.045)";
                  else if (i % 2 === 1) rowBg = "rgba(255,255,255,0.015)";

                  return (
                    <div
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${row.job_title ?? "job"} at ${row.employer_name ?? "company"}`}
                      onClick={() => setSelectedRow(row)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedRow(row); }}
                      onMouseEnter={() => setHoveredId(row.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: "grid", gridTemplateColumns: GRID,
                        gap: 8, padding: "13px 20px", alignItems: "center",
                        background: rowBg, minWidth: 900, cursor: "pointer",
                        borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        borderLeft: isSelected ? `3px solid var(--primary)` : isHovered ? "3px solid rgba(245,158,11,0.35)" : "3px solid transparent",
                        transition: "background 140ms ease, border-left-color 140ms ease",
                        outline: "none",
                      }}
                    >
                      {/* Job Title */}
                      <span style={{
                        fontFamily: "var(--font-primary)", fontSize: 13,
                        color: "var(--text-primary)", fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={row.job_title ?? undefined}>
                        {row.job_title ?? "—"}
                      </span>

                      {/* Company */}
                      <span style={{
                        fontFamily: "var(--font-primary)", fontSize: 13, color: "var(--text-secondary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={row.employer_name ?? undefined}>
                        {row.employer_name ?? "—"}
                      </span>

                      {/* Score */}
                      <span style={{
                        fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                        color: scoreColor(row.match_score),
                      }}>
                        {row.match_score !== null ? `${row.match_score}%` : "—"}
                      </span>

                      {/* Status */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <StatusBadge status={row.status} tailored={row.tailored_resume_text} clickedAt={row.apply_clicked_at} />
                        {row.apply_clicked_at && (
                          <span style={{ fontFamily: "var(--font-primary)", fontSize: 10, color: "var(--success)" }}>
                            ↗ {fmtDate(row.apply_clicked_at)}
                          </span>
                        )}
                      </div>

                      {/* Method */}
                      <div>
                        <MethodChip link={row.job_apply_link} />
                      </div>

                      {/* Generated */}
                      <span style={{
                        fontFamily: "var(--font-primary)", fontSize: 13,
                        color: row.tailored_resume_text ? "var(--success)" : "var(--text-tertiary)",
                        fontWeight: row.tailored_resume_text ? 600 : 400,
                      }}>
                        {row.tailored_resume_text ? "Yes" : "No"}
                      </span>

                      {/* Applied At */}
                      <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)" }}>
                        {fmtDate(row.applied_at)}
                      </span>

                      {/* Error */}
                      <span style={{
                        fontFamily: "var(--font-primary)", fontSize: 11, color: "var(--error)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={row.status === "failed" && row.error_message ? row.error_message : undefined}>
                        {row.status === "failed" && row.error_message
                          ? row.error_message.slice(0, 55) : ""}
                      </span>

                      {/* Apply link — stop propagation so it doesn't open the drawer */}
                      <div onClick={e => e.stopPropagation()}>
                        {row.job_apply_link ? (
                          <a
                            href={row.job_apply_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 600,
                              color: "var(--primary)", textDecoration: "none",
                              display: "inline-block", padding: "4px 10px",
                              background: "var(--primary-subtle)",
                              border: "1px solid rgba(245,158,11,0.25)",
                              borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
                            }}
                          >
                            Apply →
                          </a>
                        ) : (
                          <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, color: "var(--text-tertiary)" }}>
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{
                padding: "10px 20px", borderTop: "1px solid var(--border-subtle)",
                background: "var(--surface)",
              }}>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, color: "var(--text-tertiary)" }}>
                  {rows.length} job{rows.length !== 1 ? "s" : ""} queued today
                  {selectedRow ? " — click a row to view details" : " — click any row to view details"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      {selectedRow && (
        <DetailDrawer
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          copiedField={copiedField}
          onCopy={handleCopy}
        />
      )}
    </>
  );
}
