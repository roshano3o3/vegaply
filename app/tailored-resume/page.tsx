"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TailoredResumePage() {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("tailoredResume") || sessionStorage.getItem("tailoredResume");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRaw(parsed);
        // Handle both {resume: {...}} and flat structure
        const r = parsed.resume ?? parsed;
        setData({ resume: r, jobTitle: parsed.jobTitle ?? "", company: parsed.company ?? "" });
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
  }, []);

  const copyResume = () => {
    if (!data?.resume) return;
    const r = data.resume;
    let t = "";
    if (r.candidateName) t += r.candidateName + "\n" + "─".repeat(50) + "\n\n";
    if (r.tailoredSummary) t += "PROFESSIONAL SUMMARY\n" + r.tailoredSummary + "\n\n";
    if (r.skills?.length) t += "CORE SKILLS\n" + r.skills.join("  |  ") + "\n\n";
    if (r.experience?.length) {
      t += "WORK EXPERIENCE\n";
      r.experience.forEach((e: any) => {
        t += "\n" + (e.title||"") + "  |  " + (e.company||"") + "  |  " + (e.dates||"") + "\n";
        (e.bullets||[]).forEach((b: string) => { t += "• " + b + "\n"; });
      });
      t += "\n";
    }
    if (r.education?.length) {
      t += "EDUCATION\n";
      r.education.forEach((e: any) => {
        t += (e.degree||"") + "  |  " + (e.school||"") + "  |  " + (e.dates||"") + "\n";
      });
    }
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!data) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", gap: 16, padding: 40, textAlign: "center", background: "#f9f9f7" }}>
      <div style={{ fontSize: 52 }}>📄</div>
      <h2 style={{ fontSize: 22, color: "#1a1a1a" }}>No tailored resume found</h2>
      <p style={{ color: "#888", fontSize: 14, maxWidth: 320 }}>Go back and click "✂️ Tailor Resume" on a job card first.</p>
      <button onClick={() => router.push("/")} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back to Vegaply</button>
    </div>
  );

  const r = data.resume;

  // Show raw data debug if all main fields are empty
  const isEmpty = !r.tailoredSummary && !r.skills?.length && !r.experience?.length;

  return (
    <div style={{ background: "#f0efe9", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* Top Bar */}
      <div style={{ background: "#1a1a2e", padding: "0 32px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#fff" }}>← Back</button>
          <div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Tailored Resume</span>
            {data.jobTitle && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginLeft: 10 }}>Optimized for {data.jobTitle} at {data.company}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyResume} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#fff" }}>{copied ? "✓ Copied!" : "📋 Copy Text"}</button>
          <button onClick={() => window.print()} style={{ background: "#2563eb", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#fff" }}>🖨️ Download PDF</button>
        </div>
      </div>

      {/* AI Tips */}
      {(r.atsTip || r.matchBoost || r.keywordsAdded?.length > 0) && (
        <div style={{ background: "#1e3a5f", padding: "10px 40px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {r.matchBoost && <div style={{ fontSize: 12, color: "#93c5fd" }}>💡 <b style={{ color: "#bfdbfe" }}>Boost:</b> {r.matchBoost}</div>}
          {r.atsTip && <div style={{ fontSize: 12, color: "#86efac" }}>🎯 <b style={{ color: "#bbf7d0" }}>ATS:</b> {r.atsTip}</div>}
          {r.keywordsAdded?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 600 }}>Keywords added:</span>
              {r.keywordsAdded.map((k: string, i: number) => <span key={i} style={{ background: "rgba(139,92,246,0.3)", color: "#ddd6fe", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>{k}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Debug panel — shown only if data is empty */}
      {isEmpty && (
        <div style={{ maxWidth: 860, margin: "20px auto", padding: "0 20px" }}>
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: 16 }}>
            <b>⚠️ Resume data looks empty.</b> The AI returned data but it may be structured differently.
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 13 }}>Click to see raw response</summary>
              <pre style={{ fontSize: 11, marginTop: 8, overflow: "auto", maxHeight: 200, background: "#f8f8f8", padding: 8, borderRadius: 6 }}>{JSON.stringify(raw, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}

      {/* Resume Paper */}
      <div style={{ maxWidth: 860, margin: "28px auto 60px", padding: "0 20px" }}>
        <div style={{ background: "#fff", boxShadow: "0 4px 30px rgba(0,0,0,.12)", borderRadius: 4 }}>

          {/* Header */}
          <div style={{ padding: "44px 56px 28px", borderBottom: "3px solid #1a1a2e" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", letterSpacing: "1.5px", textTransform: "uppercase", margin: 0, fontFamily: "Arial, sans-serif" }}>
              {r.candidateName || "YOUR NAME"}
            </h1>
            {data.jobTitle && <div style={{ marginTop: 5, fontSize: 14, color: "#2563eb", fontWeight: 600, letterSpacing: ".3px" }}>{data.jobTitle}</div>}
          </div>

          {/* Body */}
          <div style={{ padding: "28px 56px 48px" }}>

            {/* Summary */}
            {r.tailoredSummary && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#1a1a2e", borderBottom: "2px solid #1a1a2e", paddingBottom: 4, marginBottom: 10 }}>Professional Summary</div>
                <p style={{ fontSize: 13.5, color: "#333", lineHeight: 1.75, margin: 0 }}>{r.tailoredSummary}</p>
              </div>
            )}

            {/* Skills */}
            {r.skills?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#1a1a2e", borderBottom: "2px solid #1a1a2e", paddingBottom: 4, marginBottom: 12 }}>Core Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 14px" }}>
                  {r.skills.map((s: string, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#222" }}>
                      <span style={{ color: "#2563eb", fontSize: 14, fontWeight: 700 }}>▪</span>{s}
                      {i < r.skills.length - 1 && <span style={{ color: "#ddd", marginLeft: 8 }}>|</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {r.experience?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#1a1a2e", borderBottom: "2px solid #1a1a2e", paddingBottom: 4, marginBottom: 14 }}>Work Experience</div>
                {r.experience.map((exp: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < r.experience.length - 1 ? 20 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{exp.title}</div>
                        <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>{exp.company}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>{exp.dates}</div>
                    </div>
                    {exp.bullets?.length > 0 && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                        {exp.bullets.map((b: string, j: number) => (
                          <li key={j} style={{ fontSize: 13, color: "#333", lineHeight: 1.65 }}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {r.education?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#1a1a2e", borderBottom: "2px solid #1a1a2e", paddingBottom: 4, marginBottom: 12 }}>Education</div>
                {r.education.map((edu: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{edu.degree}</div>
                      <div style={{ fontSize: 13, color: "#555" }}>{edu.school}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>{edu.dates}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback if no sections */}
            {isEmpty && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                <p style={{ fontSize: 14 }}>Resume sections are empty. Try clicking ✂️ Tailor Resume again on a job card.</p>
              </div>
            )}

          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 14 }}>Click "Download PDF" to save · Use Chrome for best print quality</p>
      </div>

      <style>{`@media print{body{background:#fff!important}div[style*="sticky"]{display:none!important}div[style*="1e3a5f"]{display:none!important}}`}</style>
    </div>
  );
}
