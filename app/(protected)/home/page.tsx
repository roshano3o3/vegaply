"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Job {
  job_id: string; job_title: string; employer_name: string; employer_logo?: string;
  job_city?: string; job_state?: string; job_country?: string; job_employment_type?: string;
  job_posted_at_datetime_utc?: string; job_description?: string; job_apply_link?: string;
  job_is_remote?: boolean; job_min_salary?: number; job_max_salary?: number;
  job_salary_currency?: string; job_highlights?: { Qualifications?: string[]; Responsibilities?: string[]; Benefits?: string[] };
}
interface MatchResult {
  matchScore: number; matchLabel: "Excellent"|"Strong"|"Good"|"Fair"|"Low";
  matchSummary: string; matchedSkills: string[]; missingSkills: string[]; coverLetter: string;
}
interface TailorResult {
  tailoredBullets: { original: string; tailored: string; reason: string }[];
  keywordsAdded: string[]; atsTip: string;
}
interface InterviewResult {
  likelyQuestions: { question: string; category: string; tip: string; sampleAnswer: string }[];
  technicalQuestions: { question: string; category: string; tip: string; sampleAnswer: string }[];
  questionsToAsk: string[]; keyThemes: string[]; redFlags: string[];
}
interface JobWithMatch extends Job {
  match?: MatchResult; matchLoading?: boolean; tailor?: TailorResult;
  tailorLoading?: boolean; interview?: InterviewResult; interviewLoading?: boolean;
}
type AppStatus = "Applied"|"Interviewing"|"Offer"|"Rejected";
interface TrackedApp { job: Job; status: AppStatus; appliedDate: string; notes: string; id: string; }
type TabType = "results"|"earlybird"|"saved"|"tracker"|"analytics";
const JOBS_PER_PAGE = 6;

function getHoursAgo(d?: string) { return d ? (Date.now() - new Date(d).getTime()) / 3600000 : 999; }
function timeAgo(d?: string) {
  if (!d) return "Recently";
  const h = getHoursAgo(d);
  if (h < 1) return `${Math.floor(h * 60)}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "1 day ago" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}
function isHot(d?: string) { return getHoursAgo(d) < 6; }
function isEarlyBird(d?: string) { return getHoursAgo(d) < 24; }
function empBadge(t?: string) { return ({ FULLTIME: "Full-time", PARTTIME: "Part-time", CONTRACTOR: "Contract", INTERN: "Internship" } as any)[t ?? ""] ?? t ?? null; }
function scoreColor(s: number) { return s >= 80 ? "#34d399" : s >= 65 ? "#818cf8" : s >= 50 ? "#fbbf24" : "#f87171"; }

// --- Competition label based on hours posted ---
function getCompetitionLabel(hoursAgo: number): { label: string; color: string; bg: string } {
  if (hoursAgo < 2)  return { label: "🔥 Very Low Competition", color: "#f87171", bg: "rgba(248,113,113,0.08)" };
  if (hoursAgo < 6)  return { label: "⚡ Still Early", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" };
  if (hoursAgo < 12) return { label: "🕐 Act Soon", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
  return { label: "📅 Open", color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.03)" };
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill={filled?"#818cf8":"none"} stroke={filled?"#818cf8":"rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>;
}
function UploadIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}

function ScoreRing({ score }: { score: number }) {
  const r = 20, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ, color = scoreColor(score);
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 26 26)"/>
      <text x="26" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="'DM Sans',sans-serif">{score}</text>
    </svg>
  );
}

// --- Slide-in Resume Match Panel ---
function ResumeMatchPanel({ job, onClose, resumeText }: { job: JobWithMatch; onClose: () => void; resumeText: string }) {
  const [matchResult, setMatchResult] = useState<MatchResult | null>(job.match || null);
  const [loading, setLoading] = useState(false);

  // Auto-run match on open if resume is ready and no result yet
  useEffect(() => {
    if (resumeText && !matchResult && !loading) {
      runMatch();
    }
  }, []);

  const runMatch = async () => {
    if (!resumeText) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, job }),
      });
      const data: MatchResult = await res.json();
      setMatchResult(data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const color = matchResult ? scoreColor(matchResult.matchScore) : "#818cf8";

  return (
    <div className="match-panel-overlay" onClick={onClose}>
      <div className="match-panel" onClick={(e) => e.stopPropagation()}>
        <div className="match-panel-header">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Resume Match</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{job.job_title} · {job.employer_name}</div>
          </div>
          <button className="modal-close" style={{ position: "static" }} onClick={onClose}>✕</button>
        </div>

        {!resumeText && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>No resume uploaded</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Upload your resume PDF in the sidebar first</div>
          </div>
        )}

        {resumeText && loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", gap: 14 }}>
            <div className="spin" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <div style={{ fontSize: 13, color: "#818cf8", fontWeight: 500 }}>Analyzing your resume…</div>
          </div>
        )}

        {resumeText && !loading && matchResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "4px 0" }}>

            {/* Score */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: `${color}0d`, border: `1px solid ${color}25`, borderRadius: 14, padding: "16px 18px" }}>
              <ScoreRing score={matchResult.matchScore} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'Playfair Display',serif" }}>{matchResult.matchLabel} Match</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3, lineHeight: 1.5 }}>{matchResult.matchSummary}</div>
              </div>
            </div>

            {/* Competition badge */}
            {job.job_posted_at_datetime_utc && (() => {
              const h = getHoursAgo(job.job_posted_at_datetime_utc);
              const comp = getCompetitionLabel(h);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: comp.bg, border: `1px solid ${comp.color}25`, borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: comp.color }}>{comp.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>posted {timeAgo(job.job_posted_at_datetime_utc)}</span>
                </div>
              );
            })()}

            {/* Matched skills */}
            {matchResult.matchedSkills.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#34d399", marginBottom: 8 }}>✅ Your Strengths</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {matchResult.matchedSkills.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing skills */}
            {matchResult.missingSkills.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#f87171", marginBottom: 8 }}>⚠️ Gaps to Address</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {matchResult.missingSkills.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tailoring tip */}
            <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "rgba(251,191,36,0.8)", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700 }}>💡 Tip: </span>
              {matchResult.missingSkills.length > 0
                ? `Highlight experience related to ${matchResult.missingSkills[0]} in your resume to improve your match score.`
                : "Your resume aligns well. Customize your cover letter to mention specific company projects."}
            </div>

            {/* Apply button */}
            {job.job_apply_link && (
              <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
                {isHot(job.job_posted_at_datetime_utc) ? "⚡ Apply Now — Beat the Rush!" : "Apply Now →"}
              </a>
            )}
          </div>
        )}

        {resumeText && !loading && !matchResult && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <button className="gradient-btn" onClick={runMatch}>🔍 Analyze Match</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumePanel({ resumeText, fileName, onResume, onClear }: { resumeText: string; fileName: string; onResume: (t: string, n: string) => void; onClear: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) { setError("PDF only."); return; }
    setError(""); setParsing(true);
    try {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload = () => res(); s.onerror = () => rej(); document.head.appendChild(s); });
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      const ab = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); text += content.items.map((it: any) => it.str).join(" ") + "\n"; }
      if (!text.trim()) { setError("Couldn't extract text."); setParsing(false); return; }
      onResume(text, file.name);
    } catch { setError("Failed to parse PDF."); }
    setParsing(false);
  };
  if (resumeText) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:10,padding:"10px 12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:22,height:22,background:"#34d399",color:"#060608",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>✓</span>
        <div><div style={{fontSize:12,fontWeight:600,color:"#34d399"}}>Resume loaded</div><div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:2}}>{fileName}</div></div>
      </div>
      <button className="ghost-btn" onClick={onClear}>Change</button>
    </div>
  );
  return (
    <div className={`resume-drop${dragging?" dragging":""}`} onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onClick={()=>inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={(e)=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
      {parsing ? <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#818cf8"}}><div className="spin"/>Parsing…</div> : (<><UploadIcon/><div style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.4)",marginTop:8}}>Drop resume PDF</div><div style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:3}}>or click to browse</div>{error&&<div style={{fontSize:11,color:"#f87171",marginTop:6}}>{error}</div>}</>)}
    </div>
  );
}

function UrgencyBar({ hoursAgo }: { hoursAgo: number }) {
  const pct = Math.max(0, Math.min(100, (hoursAgo / 24) * 100));
  const color = hoursAgo < 6 ? "#f87171" : hoursAgo < 12 ? "#fbbf24" : "#34d399";
  const label = hoursAgo < 1 ? "⚡ Just posted!" : hoursAgo < 6 ? `🔥 ${Math.floor(hoursAgo)}h ago — very few applicants` : hoursAgo < 12 ? `⏰ ${Math.floor(hoursAgo)}h ago — still early` : `🕐 ${Math.floor(hoursAgo)}h ago — act soon`;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3,transition:"width .3s"}}/>
      </div>
      <span style={{fontSize:11,fontWeight:600,color}}>{label}</span>
    </div>
  );
}

function MatchBadge({ match, loading }: { match?: MatchResult; loading?: boolean }) {
  if (loading) return <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#818cf8",fontWeight:500}}><div className="spin-sm"/>Analyzing…</div>;
  if (!match) return null;
  const color = scoreColor(match.matchScore);
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:10,padding:"8px 12px",border:`1px solid ${color}25`,background:`${color}0d`}}>
      <ScoreRing score={match.matchScore}/>
      <div><div style={{fontSize:13,fontWeight:700,color}}>{match.matchLabel} Match</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>{match.matchedSkills.slice(0,3).join(" · ")}</div></div>
    </div>
  );
}

function InterviewModal({ job, interview, onClose }: { job: Job; interview: InterviewResult; onClose: () => void }) {
  const [tab, setTab] = useState<"behavioral"|"technical"|"ask"|"tips">("behavioral");
  const [expanded, setExpanded] = useState<number|null>(null);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  const allB = interview.likelyQuestions??[], allT = interview.technicalQuestions??[];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:700}} onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head"><span style={{fontSize:32}}>🤖</span><div><h2 className="modal-title">Interview Prep</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div></div>
        {interview.keyThemes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{interview.keyThemes.map((t,i)=><span key={i} style={{background:"rgba(129,140,248,0.1)",color:"#818cf8",fontSize:12,fontWeight:500,padding:"4px 12px",borderRadius:20,border:"1px solid rgba(129,140,248,0.15)"}}>{t}</span>)}</div>}
        <div className="modal-tabs">
          <button className={`mtab${tab==="behavioral"?" active":""}`} onClick={()=>setTab("behavioral")}>💬 Behavioral ({allB.length})</button>
          <button className={`mtab${tab==="technical"?" active":""}`} onClick={()=>setTab("technical")}>⚙️ Technical ({allT.length})</button>
          <button className={`mtab${tab==="ask"?" active":""}`} onClick={()=>setTab("ask")}>🙋 Ask Them</button>
          <button className={`mtab${tab==="tips"?" active":""}`} onClick={()=>setTab("tips")}>⚠️ Watch Out</button>
        </div>
        {(tab==="behavioral"||tab==="technical")&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
            {(tab==="behavioral"?allB:allT).map((q,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${expanded===i?"rgba(129,140,248,0.3)":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:14,cursor:"pointer",transition:"border-color .2s"}} onClick={()=>setExpanded(expanded===i?null:i)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(129,140,248,0.1)",color:"#818cf8",padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0,marginTop:1}}>{q.category}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>{q.question}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.25)",flexShrink:0,marginTop:2}}>{expanded===i?"▲":"▼"}</span>
                </div>
                {expanded===i&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:12,color:"#fbbf24",background:"rgba(251,191,36,0.07)",borderRadius:6,padding:"8px 10px",marginBottom:10}}>💡 {q.tip}</div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:"rgba(255,255,255,0.2)",marginBottom:6}}>Sample Answer</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.6,background:"rgba(255,255,255,0.03)",borderRadius:6,padding:"10px 12px"}}>{q.sampleAnswer}</div>
                </div>}
              </div>
            ))}
          </div>
        )}
        {tab==="ask"&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>{interview.questionsToAsk?.map((q,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,background:"rgba(129,140,248,0.06)",borderRadius:10,padding:14,border:"1px solid rgba(129,140,248,0.1)"}}><span style={{width:24,height:24,background:"rgba(129,140,248,0.2)",color:"#818cf8",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</span><span style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>{q}</span></div>)}</div>}
        {tab==="tips"&&<div style={{marginTop:12}}><div style={{fontSize:13,fontWeight:600,color:"#f87171",marginBottom:12}}>Things to avoid in this interview:</div>{interview.redFlags?.map((r,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(248,113,113,0.06)",borderRadius:8,padding:12,marginBottom:8}}><span>⚠️</span><span style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>{r}</span></div>)}</div>}
      </div>
    </div>
  );
}

function AnalyticsView({ apps, savedCount, totalSearched }: { apps: TrackedApp[]; savedCount: number; totalSearched: number }) {
  const sc: Record<AppStatus,number> = {Applied:0,Interviewing:0,Offer:0,Rejected:0};
  apps.forEach(a=>{sc[a.status]=(sc[a.status]||0)+1;});
  const rr = apps.length>0?Math.round(((sc.Interviewing+sc.Offer)/apps.length)*100):0;
  const cards = [{label:"Total Applied",value:apps.length,color:"#818cf8",icon:"📋"},{label:"Interviewing",value:sc.Interviewing,color:"#fbbf24",icon:"🎯"},{label:"Offers",value:sc.Offer,color:"#34d399",icon:"🎉"},{label:"Response Rate",value:`${rr}%`,color:"#ec4899",icon:"📈"}];
  const funnel = [{label:"Saved",count:savedCount,color:"rgba(255,255,255,0.15)"},{label:"Applied",count:sc.Applied+sc.Interviewing+sc.Offer+sc.Rejected,color:"#818cf8"},{label:"Interviewing",count:sc.Interviewing+sc.Offer,color:"#fbbf24"},{label:"Offers",count:sc.Offer,color:"#34d399"}];
  const mx = funnel[0].count||1;
  const sc2: Record<AppStatus,string> = {Applied:"#818cf8",Interviewing:"#fbbf24",Offer:"#34d399",Rejected:"#f87171"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div className="analytics-grid">
        {cards.map((c,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${c.color}25`,borderRadius:14,padding:18,textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:c.color,marginBottom:4}}>{c.value}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div className="dark-card">
        <div className="dark-card-title">Application Funnel</div>
        {funnel.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<funnel.length-1?12:0}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.35)",width:90,flexShrink:0}}>{f.label}</div>
            <div style={{flex:1,height:8,background:"rgba(255,255,255,0.06)",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${(f.count/mx)*100}%`,background:f.color,borderRadius:8,transition:"width .6s ease"}}/></div>
            <div style={{fontWeight:700,fontSize:14,color:f.color,width:24,textAlign:"right"}}>{f.count}</div>
          </div>
        ))}
      </div>
      <div className="dark-card">
        <div className="dark-card-title">Status Breakdown</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:4}}>
          {(Object.entries(sc) as [AppStatus,number][]).map(([s,c])=>(
            <div key={s} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${sc2[s]}25`,borderRadius:10,padding:14,textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:sc2[s]}}>{c}</div>
              <div style={{fontSize:12,fontWeight:500,color:sc2[s],marginTop:3,opacity:0.7}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      {apps.length===0&&<div className="empty-state"><div className="empty-icon">📊</div><h3>No data yet</h3><p>Start tracking applications to see your analytics here.</p></div>}
    </div>
  );
}

function AlertPanel({ jobRole, location, jobs }: { jobRole: string; location: string; jobs: any[] }) {
  const [email,setEmail]=useState("");const [sending,setSending]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState("");
  const send=async()=>{
    if(!email||!email.includes("@")){setError("Enter a valid email");return;}
    if(!jobs.length){setError("Search for jobs first");return;}
    setSending(true);setError("");
    try{const res=await fetch("/api/alert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,jobRole,location,jobs})});const data=await res.json();if(data.success)setSent(true);else setError("Failed to send.");}catch{setError("Network error.");}
    setSending(false);
  };
  if(sent)return(<div className="sidebar-card" style={{textAlign:"center"}}><div style={{fontSize:26,marginBottom:6}}>✅</div><div style={{fontSize:13,fontWeight:600,color:"#34d399"}}>Alert sent!</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:3,marginBottom:10}}>Check {email}</div><button className="ghost-btn" onClick={()=>setSent(false)}>Send another</button></div>);
  return(
    <div className="sidebar-card">
      <div className="sidebar-card-title">🔔 Gmail Alert</div>
      <div className="sidebar-card-sub">Email yourself today's results</div>
      <input className="dark-input" type="email" placeholder="you@gmail.com" value={email} onChange={(e)=>setEmail(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()}/>
      {error&&<div style={{fontSize:11,color:"#f87171",marginTop:6}}>{error}</div>}
      <button className="gradient-btn" onClick={send} disabled={sending||!jobs.length} style={{marginTop:10}}>{sending?<><div className="spin-sm"/>Sending…</>:`📧 Send ${jobs.length} Jobs`}</button>
    </div>
  );
}

function JobCard({ job, saved, onToggleSave, onClick, onTailor, onInterview, earlyBirdMode, resumeReady, isTracked, onTrack, onMatchResume }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClick:()=>void;onTailor:()=>void;onInterview:()=>void;earlyBirdMode:boolean;resumeReady:boolean;isTracked:boolean;onTrack:()=>void;onMatchResume:()=>void;
}) {
  const loc=[job.job_city,job.job_state,job.job_country].filter(Boolean).join(", ");
  const badge=empBadge(job.job_employment_type);const hot=isHot(job.job_posted_at_datetime_utc);const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  const comp = getCompetitionLabel(hours);

  return(
    <div className={`job-card${hot&&earlyBirdMode?" job-card-hot":""}${job.match?" job-card-matched":""}`}>
      {hot&&earlyBirdMode&&<div className="hot-ribbon">🔥 HOT — under 6h old</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer",marginTop:hot&&earlyBirdMode?22:0}} onClick={onClick}>
        <div className="employer-logo">{job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>:<span className="logo-letter">{job.employer_name?.[0]??"?"}</span>}</div>
        <button className="save-btn" onClick={(e)=>{e.stopPropagation();onToggleSave();}}><BookmarkIcon filled={saved}/></button>
      </div>
      <div style={{flex:1,cursor:"pointer"}} onClick={onClick}>
        <h3 className="job-title">{job.job_title}</h3>
        <p style={{fontSize:13,color:"#818cf8",fontWeight:500,marginBottom:3}}>{job.employer_name}</p>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>{job.job_is_remote?"🌐 Remote":loc||"Location not specified"}</p>
      </div>

      {/* Competition label — shown on ALL jobs */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,background:comp.bg,border:`1px solid ${comp.color}18`}}>
        <span style={{fontSize:11,fontWeight:700,color:comp.color}}>{comp.label}</span>
      </div>

      <MatchBadge match={job.match} loading={job.matchLoading}/>
      {earlyBirdMode&&<UrgencyBar hoursAgo={hours}/>}

      <div className="card-actions">
        {/* Match Resume button — shown when resume is uploaded */}
        {resumeReady&&(
          <button className={`card-btn match-btn${job.match?" done":""}`} onClick={(e)=>{e.stopPropagation();onMatchResume();}} disabled={job.matchLoading}>
            {job.matchLoading?<><div className="spin-sm"/>Matching…</>:job.match?`✓ ${job.match.matchScore}% Match`:"🔍 Match"}
          </button>
        )}
        {resumeReady&&<button className={`card-btn tailor-btn${job.tailor?" done":""}`} onClick={(e)=>{e.stopPropagation();onTailor();}} disabled={job.tailorLoading}>{job.tailorLoading?<><div className="spin-sm"/>Tailoring…</>:job.tailor?"✓ Tailored":"✂️ Tailor"}</button>}
        <button className={`card-btn interview-btn${job.interview?" done":""}`} onClick={(e)=>{e.stopPropagation();onInterview();}} disabled={job.interviewLoading}>{job.interviewLoading?<><div className="spin-sm"/>Prepping…</>:job.interview?"✓ Prep'd":"🤖 Prep"}</button>
        <button className={`card-btn track-btn${isTracked?" tracked":""}`} onClick={(e)=>{e.stopPropagation();onTrack();}}>{isTracked?"✓":"+"}</button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,cursor:"pointer"}} onClick={onClick}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {badge&&<span className="badge badge-type">{badge}</span>}
          {job.job_is_remote&&<span className="badge badge-remote">Remote</span>}
          {hot&&earlyBirdMode&&<span className="badge badge-hot">🔥</span>}
          {job.match&&job.match.matchScore>=70&&<span className="badge badge-fit">✓ Fit</span>}
        </div>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
      </div>
    </div>
  );
}

function TailorModal({ job, tailor, onClose }: { job: Job; tailor: TailorResult; onClose: () => void }) {
  const [copied,setCopied]=useState<number|null>(null);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head"><span style={{fontSize:32}}>✂️</span><div><h2 className="modal-title">Resume Tailored</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div></div>
        {tailor.atsTip&&<div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:10,padding:"12px 14px",fontSize:13,color:"rgba(251,191,36,0.8)",marginBottom:16,display:"flex",gap:10}}><span>💡</span><div><strong>ATS Tip:</strong> {tailor.atsTip}</div></div>}
        {tailor.keywordsAdded?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Keywords to include</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tailor.keywordsAdded.map((k,i)=><span key={i} style={{background:"rgba(129,140,248,0.1)",color:"#818cf8",fontSize:12,fontWeight:500,padding:"4px 10px",borderRadius:20}}>{k}</span>)}</div></div>}
        <div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:10}}>Tailored bullet points</div>
        {tailor.tailoredBullets?.map((b,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:14,marginBottom:12,border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",lineHeight:1.5,marginBottom:6}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(255,255,255,0.2)",display:"block",marginBottom:2}}>ORIGINAL</span>{b.original}</div>
            <div style={{fontSize:14,color:"rgba(129,140,248,0.5)",textAlign:"center",margin:"4px 0"}}>↓</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,background:"rgba(52,211,153,0.07)",borderRadius:8,padding:"10px 12px"}}>
              <div><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(52,211,153,0.5)",display:"block",marginBottom:2}}>TAILORED</span><span style={{fontSize:13,color:"#34d399",fontWeight:500,lineHeight:1.5}}>{b.tailored}</span></div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:0.5,flexShrink:0,color:"#fff"}} onClick={()=>{navigator.clipboard.writeText(b.tailored);setCopied(i);setTimeout(()=>setCopied(null),2000);}}>{copied===i?"✓":"📋"}</button>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:8,fontStyle:"italic"}}>💬 {b.reason}</div>
          </div>
        ))}</div>
      </div>
    </div>
  );
}

function JobModal({ job, saved, onToggleSave, onClose, earlyBirdMode, onAddToTracker, isTracked }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClose:()=>void;earlyBirdMode:boolean;onAddToTracker:()=>void;isTracked:boolean;
}) {
  const [tab,setTab]=useState<"overview"|"cover">("overview");const [copied,setCopied]=useState(false);
  const loc=[job.job_city,job.job_state,job.job_country].filter(Boolean).join(", ");
  const badge=empBadge(job.job_employment_type);const hot=isHot(job.job_posted_at_datetime_utc);const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {earlyBirdMode&&hot&&<div style={{background:"linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15))",border:"1px solid rgba(251,191,36,0.2)",color:"#fbbf24",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,marginBottom:16,textAlign:"center"}}>🔥 Posted less than 6 hours ago — be among the first!</div>}
        {earlyBirdMode&&!hot&&isEarlyBird(job.job_posted_at_datetime_utc)&&<div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.15)",color:"rgba(251,191,36,0.7)",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:600,marginBottom:16,textAlign:"center"}}>⏰ Posted {Math.floor(hours)}h ago — still early!</div>}
        <div className="modal-head">
          <div className="modal-logo">{job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>:<span className="logo-letter" style={{fontSize:22}}>{job.employer_name?.[0]??"?"}</span>}</div>
          <div style={{flex:1}}><h2 className="modal-title">{job.job_title}</h2><p className="modal-sub">{job.employer_name}</p><p style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:2}}>{job.job_is_remote?"🌐 Remote":loc||"Location not specified"}</p></div>
          {job.match&&<div style={{textAlign:"center",flexShrink:0}}><ScoreRing score={job.match.matchScore}/><div style={{fontSize:11,color:scoreColor(job.match.matchScore),fontWeight:600,marginTop:2}}>{job.match.matchLabel}</div></div>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {badge&&<span className="badge badge-type">{badge}</span>}
          {job.job_is_remote&&<span className="badge badge-remote">Remote</span>}
          <span className="badge badge-time">{timeAgo(job.job_posted_at_datetime_utc)}</span>
          {(job.job_min_salary||job.job_max_salary)&&<span className="badge badge-salary">💰 {job.job_salary_currency??"$"}{job.job_min_salary?.toLocaleString()}–{job.job_max_salary?.toLocaleString()}</span>}
        </div>
        {earlyBirdMode&&<UrgencyBar hoursAgo={hours}/>}
        {job.match&&(
          <>
            <div className="modal-tabs" style={{marginTop:16}}>
              <button className={`mtab${tab==="overview"?" active":""}`} onClick={()=>setTab("overview")}>📊 Match Analysis</button>
              <button className={`mtab${tab==="cover"?" active":""}`} onClick={()=>setTab("cover")}>✉️ Cover Letter</button>
            </div>
            {tab==="overview"&&<div style={{marginBottom:16}}><p style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.7,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:14,marginBottom:14}}>{job.match.matchSummary}</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontSize:12,fontWeight:600,color:"#34d399",marginBottom:8}}>✅ Matched</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{job.match.matchedSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:20,background:"rgba(52,211,153,0.1)",color:"#34d399"}}>{s}</span>)}</div></div><div><div style={{fontSize:12,fontWeight:600,color:"#f87171",marginBottom:8}}>⚠️ Gaps</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{job.match.missingSkills.length>0?job.match.missingSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:20,background:"rgba(248,113,113,0.1)",color:"#f87171"}}>{s}</span>):<span style={{fontSize:12,color:"#34d399",fontStyle:"italic"}}>No major gaps!</span>}</div></div></div></div>}
            {tab==="cover"&&<div><div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.75,whiteSpace:"pre-wrap",background:"rgba(255,255,255,0.03)",borderRadius:10,padding:16,maxHeight:280,overflowY:"auto",border:"1px solid rgba(255,255,255,0.06)"}}>{job.match.coverLetter}</div><button className="ghost-btn" style={{marginTop:10}} onClick={()=>{if(job.match?.coverLetter){navigator.clipboard.writeText(job.match.coverLetter);setCopied(true);setTimeout(()=>setCopied(false),2000);}}}>{copied?"✓ Copied!":"📋 Copy"}</button></div>}
          </>
        )}
        {!job.match&&(
          <>
            {job.job_highlights?.Responsibilities&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Responsibilities</div><ul style={{paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{job.job_highlights.Responsibilities.slice(0,5).map((r,i)=><li key={i} style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.55}}>{r}</li>)}</ul></div>}
            {job.job_highlights?.Qualifications&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Qualifications</div><ul style={{paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{job.job_highlights.Qualifications.slice(0,5).map((q,i)=><li key={i} style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.55}}>{q}</li>)}</ul></div>}
            {job.job_description&&!job.job_highlights?.Responsibilities&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>About this role</div><p style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.7}}>{job.job_description.slice(0,800)}...</p></div>}
          </>
        )}
        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:20,paddingTop:18,borderTop:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap"}}>
          <button className="ghost-btn" style={{display:"flex",alignItems:"center",gap:8}} onClick={onToggleSave}><BookmarkIcon filled={saved}/>{saved?"Saved":"Save"}</button>
          <button className={`ghost-btn${isTracked?" btn-tracked":""}`} onClick={onAddToTracker}>{isTracked?"✓ Tracking":"+ Track"}</button>
          {job.job_apply_link&&<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className={`apply-btn${hot&&earlyBirdMode?" apply-btn-hot":""}`}>{hot&&earlyBirdMode?"⚡ Apply Now!":"Apply Now →"}</a>}
        </div>
      </div>
    </div>
  );
}

function TrackerView({ apps, onUpdateStatus, onUpdateNotes, onRemove }: { apps: TrackedApp[]; onUpdateStatus: (id:string,s:AppStatus)=>void; onUpdateNotes: (id:string,n:string)=>void; onRemove: (id:string)=>void }) {
  const cols: Record<AppStatus,{color:string;border:string}> = {Applied:{color:"#818cf8",border:"rgba(129,140,248,0.2)"},Interviewing:{color:"#fbbf24",border:"rgba(251,191,36,0.2)"},Offer:{color:"#34d399",border:"rgba(52,211,153,0.2)"},Rejected:{color:"#f87171",border:"rgba(248,113,113,0.2)"}};
  if(apps.length===0)return<div className="empty-state"><div className="empty-icon">📋</div><h3>No applications tracked yet</h3><p>Click "+" on any job card to track it here.</p></div>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"center",gap:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px 24px",flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:"#fff",display:"block"}}>{apps.length}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Total</span></div>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
          <><div key={s+"d"} style={{width:1,height:36,background:"rgba(255,255,255,0.07)"}}/><div key={s} style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:cols[s].color,display:"block"}}>{apps.filter(a=>a.status===s).length}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{s}</span></div></>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(col=>(
          <div key={col} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,fontWeight:700,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${cols[col].border}`,color:cols[col].color,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{col}<span style={{fontSize:16,fontWeight:800}}>{apps.filter(a=>a.status===col).length}</span></div>
            {apps.filter(a=>a.status===col).map(app=>(
              <div key={app.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:12,border:"1px solid rgba(255,255,255,0.07)",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:6,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.04)",flexShrink:0}}>{app.job.employer_logo?<img src={app.job.employer_logo} alt="" onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span className="logo-letter" style={{fontSize:11}}>{app.job.employer_name?.[0]}</span>}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.job.job_title}</div><div style={{fontSize:11,color:"#818cf8",marginTop:1}}>{app.job.employer_name}</div></div>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.2)",fontSize:12}} onClick={()=>onRemove(app.id)}>✕</button>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>Added {new Date(app.appliedDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
                    <button key={s} style={{flex:1,minWidth:55,padding:"3px 2px",border:`1px solid ${app.status===s?cols[s].border:"rgba(255,255,255,0.06)"}`,borderRadius:5,fontSize:9,fontWeight:600,cursor:"pointer",background:app.status===s?cols[s].border:"transparent",color:app.status===s?cols[s].color:"rgba(255,255,255,0.25)",fontFamily:"inherit"}} onClick={()=>onUpdateStatus(app.id,s)}>{s}</button>
                  ))}
                </div>
                <textarea style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"inherit",resize:"none",outline:"none",color:"rgba(255,255,255,0.45)"}} placeholder="Add notes…" value={app.notes} onChange={(e)=>onUpdateNotes(app.id,e.target.value)} rows={2}/>
                {app.job.job_apply_link&&<a href={app.job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#818cf8",fontWeight:600,textDecoration:"none"}}>View Job →</a>}
              </div>
            ))}
            {apps.filter(a=>a.status===col).length===0&&<div style={{textAlign:"center",padding:20,color:"rgba(255,255,255,0.15)",fontSize:11,background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px dashed rgba(255,255,255,0.07)"}}>No {col.toLowerCase()} yet</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [jobRole,setJobRole]=useState("");const [location,setLocation]=useState("");
  const [jobs,setJobs]=useState<JobWithMatch[]>([]);const [earlyBirdJobs,setEarlyBirdJobs]=useState<JobWithMatch[]>([]);
  const [loading,setLoading]=useState(false);const [ebLoading,setEbLoading]=useState(false);
  const [savedJobs,setSavedJobs]=useState<Set<string>>(new Set());
  const [selectedJob,setSelectedJob]=useState<JobWithMatch|null>(null);
  const [tailorJob,setTailorJob]=useState<JobWithMatch|null>(null);
  const [interviewJob,setInterviewJob]=useState<JobWithMatch|null>(null);
  const [matchPanelJob,setMatchPanelJob]=useState<JobWithMatch|null>(null);
  const [activeTab,setActiveTab]=useState<TabType>("results");const [currentPage,setCurrentPage]=useState(1);
  const [hasSearched,setHasSearched]=useState(false);const [filterType,setFilterType]=useState("ALL");
  const [filterRemote,setFilterRemote]=useState(false);const [filterDate,setFilterDate]=useState("ANY");
  const [resumeText,setResumeText]=useState("");const [resumeFileName,setResumeFileName]=useState("");
  const [isMatching,setIsMatching]=useState(false);const [matchProgress,setMatchProgress]=useState(0);
  const [autoOpenDone,setAutoOpenDone]=useState(false);const [trackedApps,setTrackedApps]=useState<TrackedApp[]>([]);
  const [mounted,setMounted]=useState(false);const [userEmail,setUserEmail]=useState("");
  const [showOnboard,setShowOnboard]=useState(false);
  const [onboardStep,setOnboardStep]=useState(1);
  const [onboardRole,setOnboardRole]=useState("");
  const [onboardLocation,setOnboardLocation]=useState("");
  const [onboardParsing,setOnboardParsing]=useState(false);

  useEffect(()=>{
    setMounted(true);
    import("@/lib/supabase").then(({supabase})=>{
      supabase.auth.getUser().then(({data})=>{
        if(data.user?.email)setUserEmail(data.user.email);
        const uid=data.user?.id;
        if(uid){
          localStorage.setItem("Vegaply_user_id",uid);
          const onboarded=localStorage.getItem(`Vegaply_onboarded_${uid}`);
          if(!onboarded)setShowOnboard(true);
        }
      });
    });
    // Restore resume with user isolation
    import("@/lib/supabase").then(({supabase}) => {
      supabase.auth.getUser().then(async ({ data }) => {
        const currentUserId = data?.user?.id;
        const storedUserId = localStorage.getItem("Vegaply_user_id");
        if (!currentUserId) return;
        // Different user - clear everything
        if (storedUserId && storedUserId !== currentUserId) {
          lsRemove("Vegaply_resume");
          lsRemove("Vegaply_resume_name");
          setResumeText(""); setResumeFileName("");
        } else {
          const savedResume = lsGet("Vegaply_resume");
          const savedFileName = lsGet("Vegaply_resume_name");
          if (savedResume && savedFileName) { setResumeText(savedResume); setResumeFileName(savedFileName); }
          else {
            const { data: rd } = await supabase.from("resumes").select("resume_text,file_name").eq("user_id", currentUserId).order("created_at",{ascending:false}).limit(1).single();
            if (rd?.resume_text) { setResumeText(rd.resume_text); setResumeFileName(rd.file_name ?? "Resume"); lsSet("Vegaply_resume", rd.resume_text); lsSet("Vegaply_resume_name", rd.file_name ?? "Resume"); }
          }
        }
        localStorage.setItem("Vegaply_user_id", currentUserId);
      });
    });
  },[]);

  const fetchJobs=async(mode:"normal"|"earlybird")=>{
    if(!jobRole||!location)return;
    if(mode==="normal"){setLoading(true);setJobs([]);}else{setEbLoading(true);setEarlyBirdJobs([]);setAutoOpenDone(false);}
    try{const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole,location,earlyBird:mode==="earlybird"})});const data=await res.json();if(mode==="normal")setJobs(data?.data||[]);else setEarlyBirdJobs(data?.data||[]);}catch(err){console.error(err);}
    if(mode==="normal")setLoading(false);else setEbLoading(false);
  };

  const handleSearch=async()=>{if(!jobRole||!location){alert("Please enter job role and location");return;}setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);await fetchJobs("normal");};
  const handleEarlyBirdSearch=async()=>{if(!jobRole||!location){alert("Please enter job role and location first");return;}setHasSearched(true);setActiveTab("earlybird");setCurrentPage(1);await fetchJobs("earlybird");};

  const runResumeMatch=async()=>{
    if(!resumeText||earlyBirdJobs.length===0)return;
    setIsMatching(true);setMatchProgress(0);setAutoOpenDone(false);
    const results:JobWithMatch[]=[...earlyBirdJobs];setEarlyBirdJobs(results.map(j=>({...j,matchLoading:true})));
    let completed=0;
    for(let i=0;i<results.length;i+=3){
      const batch=results.slice(i,i+3);
      await Promise.all(batch.map(async(job,bi)=>{
        const idx=i+bi;
        try{const res=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});const match:MatchResult=await res.json();results[idx]={...results[idx],match,matchLoading:false};}catch{results[idx]={...results[idx],matchLoading:false};}
        completed++;setMatchProgress(Math.round((completed/results.length)*100));setEarlyBirdJobs([...results]);
      }));
    }
    const top=results.filter(j=>j.match&&j.match.matchScore>=70&&j.job_apply_link).sort((a,b)=>(b.match?.matchScore??0)-(a.match?.matchScore??0)).slice(0,3);
    if(top.length>0){setAutoOpenDone(true);top.forEach(j=>window.open(j.job_apply_link,"_blank"));}
    setIsMatching(false);
  };

  // Match a single job and open the panel
  const handleSingleMatch = async (job: JobWithMatch) => {
    if (job.match) { setMatchPanelJob(job); return; }
    setMatchPanelJob(job);
  };

  // Update a job's match result in whichever list it lives in
  const updateJobMatch = (jobId: string, match: MatchResult) => {
    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, match, matchLoading: false } : j));
    setEarlyBirdJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, match, matchLoading: false } : j));
    setMatchPanelJob(prev => prev?.job_id === jobId ? { ...prev, match, matchLoading: false } : prev);
  };

  const handleTailor=async(job:JobWithMatch)=>{
    if(!resumeText){alert("Upload your resume first!");return;}
    const isEb=activeTab==="earlybird";const setList=isEb?setEarlyBirdJobs:setJobs;const list=isEb?earlyBirdJobs:jobs;
    setList(list.map(j=>j.job_id===job.job_id?{...j,tailorLoading:true}:j));
    try{const res=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});const tailor:TailorResult=await res.json();const updated={...job,tailor,tailorLoading:false};setList(list.map(j=>j.job_id===job.job_id?updated:j));setTailorJob(updated);}catch{setList(list.map(j=>j.job_id===job.job_id?{...j,tailorLoading:false}:j));}
  };

  const handleInterview=async(job:JobWithMatch)=>{
    if(job.interview){setInterviewJob(job);return;}
    const isEb=activeTab==="earlybird";const setList=isEb?setEarlyBirdJobs:setJobs;const list=isEb?earlyBirdJobs:jobs;
    setList(list.map(j=>j.job_id===job.job_id?{...j,interviewLoading:true}:j));
    try{const res=await fetch("/api/interview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job,resumeText})});const interview:InterviewResult=await res.json();const updated={...job,interview,interviewLoading:false};setList(list.map(j=>j.job_id===job.job_id?updated:j));setInterviewJob(updated);}catch{setList(list.map(j=>j.job_id===job.job_id?{...j,interviewLoading:false}:j));}
  };

  const addToTracker=(job:Job)=>{if(trackedApps.find(a=>a.job.job_id===job.job_id))return;setTrackedApps(prev=>[...prev,{job,status:"Applied",appliedDate:new Date().toISOString(),notes:"",id:job.job_id+Date.now()}]);};
  const toggleSave=(jobId:string)=>setSavedJobs(prev=>{const n=new Set(prev);n.has(jobId)?n.delete(jobId):n.add(jobId);return n;});
  const filterJobs=(list:JobWithMatch[])=>list.filter(job=>{
    if(filterType!=="ALL"&&job.job_employment_type!==filterType)return false;
    if(filterRemote&&!job.job_is_remote)return false;
    if(filterDate!=="ANY"&&job.job_posted_at_datetime_utc){const days=(Date.now()-new Date(job.job_posted_at_datetime_utc).getTime())/86400000;if(filterDate==="TODAY"&&days>1)return false;if(filterDate==="WEEK"&&days>7)return false;if(filterDate==="MONTH"&&days>30)return false;}
    return true;
  });

  const allSaved=[...jobs,...earlyBirdJobs].filter((j,i,arr)=>savedJobs.has(j.job_id)&&arr.findIndex(x=>x.job_id===j.job_id)===i);
  const displayJobs=activeTab==="results"?filterJobs(jobs):activeTab==="earlybird"?earlyBirdJobs:allSaved;
  const isEbMode=activeTab==="earlybird";
  const hotCount=earlyBirdJobs.filter(j=>isHot(j.job_posted_at_datetime_utc)).length;
  const matchedCount=earlyBirdJobs.filter(j=>j.match).length;
  const topMatchCount=earlyBirdJobs.filter(j=>j.match&&j.match.matchScore>=70).length;
  const totalPages=Math.ceil(displayJobs.length/JOBS_PER_PAGE);
  const paginatedJobs=displayJobs.slice((currentPage-1)*JOBS_PER_PAGE,currentPage*JOBS_PER_PAGE);
  const currentLoading=isEbMode?ebLoading:loading;
  const allJobs=[...jobs,...earlyBirdJobs];
  // Resume History
  const [showResumeHistory, setShowResumeHistory] = useState(false);
  const [resumeHistory, setResumeHistory] = useState<{id:string;file_name:string;created_at:string;resume_text:string}[]>([]);
  const completeOnboarding=async()=>{
    const uid=localStorage.getItem("Vegaply_user_id");
    if(uid)localStorage.setItem(`Vegaply_onboarded_${uid}`,"true");
    if(onboardRole)setJobRole(onboardRole);
    if(onboardLocation)setLocation(onboardLocation);
    setShowOnboard(false);
  };

  // User-scoped localStorage helpers
  const lsGet = (key: string) => { const uid = localStorage.getItem("Vegaply_user_id"); return localStorage.getItem(uid ? `${key}_${uid}` : key); };
  const lsSet = (key: string, val: string) => { const uid = localStorage.getItem("Vegaply_user_id"); localStorage.setItem(uid ? `${key}_${uid}` : key, val); };
  const lsRemove = (key: string) => { const uid = localStorage.getItem("Vegaply_user_id"); localStorage.removeItem(uid ? `${key}_${uid}` : key); localStorage.removeItem(key); };

  const loadResumeHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("resumes").select("id, file_name, created_at, resume_text").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setResumeHistory(data as any[]);
    setShowResumeHistory(true);
  };
  const handleLogout=async()=>{const {supabase}=await import("@/lib/supabase");await supabase.auth.signOut();lsRemove("Vegaply_resume");lsRemove("Vegaply_resume_name");lsRemove("Vegaply_onboarded");localStorage.removeItem("Vegaply_user_id");window.location.href="/login";};
  const avatarLetter=userEmail?userEmail[0].toUpperCase():"?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#060608;color:#fff;min-height:100vh}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
        .navbar{background:rgba(6,6,8,0.92);border-bottom:1px solid rgba(255,255,255,0.06);padding:0 32px;height:62px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;backdrop-filter:blur(20px)}
        .navbar-logo{font-family:'Playfair Display',serif;font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px}
        .navbar-logo span{background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .navbar-right{display:flex;align-items:center;gap:10px}
        .nav-pill{font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px}
        .pill-eb{background:linear-gradient(135deg,rgba(248,113,113,0.12),rgba(251,191,36,0.12));color:#fbbf24;border:1px solid rgba(251,191,36,0.2);animation:glow 2s infinite}
        .pill-tracker{background:rgba(129,140,248,0.1);color:#818cf8;border:1px solid rgba(129,140,248,0.2)}
        .pill-saved{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.08)}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.3)}50%{box-shadow:0 0 0 5px rgba(251,191,36,0)}}
        .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#ec4899);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
        .logout-btn{font-size:12px;font-weight:500;color:rgba(255,255,255,0.3);background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 14px;cursor:pointer;font-family:inherit;transition:all .2s}
        .logout-btn:hover{color:#f87171;border-color:rgba(248,113,113,0.3);background:rgba(248,113,113,0.05)}
        .hero{position:relative;padding:64px 32px 72px;text-align:center;overflow:hidden}
        .hero::before{content:'';position:absolute;top:-160px;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(99,102,241,0.14) 0%,transparent 70%);pointer-events:none}
        .hero::after{content:'';position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);width:500px;height:300px;background:radial-gradient(ellipse,rgba(236,72,153,0.07) 0%,transparent 70%);pointer-events:none}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:500;color:#a5b4fc;margin-bottom:24px;position:relative;z-index:1}
        .hero-eyebrow::before{content:'';width:6px;height:6px;background:#818cf8;border-radius:50%;animation:pdot 2s ease-in-out infinite}
        @keyframes pdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        .hero-title{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,58px);font-weight:900;color:#fff;line-height:1.05;letter-spacing:-1.5px;margin-bottom:16px;position:relative;z-index:1}
        .hero-title em{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .hero-sub{font-size:15px;color:rgba(255,255,255,0.3);margin-bottom:40px;font-weight:300;position:relative;z-index:1}
        .search-box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 20px;display:flex;gap:12px;max-width:800px;margin:0 auto;backdrop-filter:blur(10px);flex-wrap:wrap;position:relative;z-index:1}
        .search-field{flex:1;min-width:180px;display:flex;flex-direction:column;gap:5px}
        .search-field label{font-size:10px;font-weight:600;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1px}
        .search-input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:11px 14px;font-size:14px;font-family:inherit;font-weight:400;color:#fff;outline:none;transition:all .2s}
        .search-input::placeholder{color:rgba(255,255,255,0.2)}
        .search-input:focus{border-color:rgba(129,140,248,0.5);background:rgba(129,140,248,0.06);box-shadow:0 0 0 3px rgba(129,140,248,0.08)}
        .search-actions{display:flex;flex-direction:column;gap:8px;align-self:flex-end}
        .search-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s}
        .search-btn:hover{opacity:0.9;transform:translateY(-1px)}
        .search-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}
        .eb-btn{background:linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15));color:#fbbf24;border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:11px 24px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s}
        .eb-btn:hover{background:linear-gradient(135deg,rgba(248,113,113,0.25),rgba(251,191,36,0.25))}
        .eb-btn:disabled{opacity:0.4;cursor:not-allowed}
        .main-layout{max-width:1140px;margin:32px auto;padding:0 24px;display:flex;gap:24px}
        .sidebar{width:248px;flex-shrink:0;display:flex;flex-direction:column;gap:12px}
        .content{flex:1;min-width:0}
        .sidebar-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px}
        .sidebar-card-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.65);margin-bottom:4px}
        .sidebar-card-sub{font-size:11px;color:rgba(255,255,255,0.25);margin-bottom:12px}
        .dark-input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:10px 12px;font-size:13px;font-family:inherit;color:#fff;outline:none;transition:all .2s}
        .dark-input::placeholder{color:rgba(255,255,255,0.2)}
        .dark-input:focus{border-color:rgba(129,140,248,0.4);background:rgba(129,140,248,0.06)}
        .gradient-btn{width:100%;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s}
        .gradient-btn:disabled{opacity:0.4;cursor:not-allowed}
        .ghost-btn{font-size:12px;font-weight:500;color:rgba(255,255,255,0.4);background:none;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:5px 12px;cursor:pointer;font-family:inherit;transition:all .2s}
        .ghost-btn:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.2)}
        .resume-drop{border:1.5px dashed rgba(129,140,248,0.2);border-radius:12px;padding:20px 12px;text-align:center;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(129,140,248,0.5);background:rgba(129,140,248,0.05)}
        .filter-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px;position:sticky;top:74px}
        .filter-title{font-size:11px;font-weight:600;color:rgba(255,255,255,0.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .filter-label{font-size:10px;font-weight:600;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
        .filter-select{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:9px 10px;font-size:12px;font-family:inherit;color:rgba(255,255,255,0.55);cursor:pointer;outline:none}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:rgba(255,255,255,0.45)}
        .toggle{width:36px;height:20px;background:rgba(255,255,255,0.1);border-radius:10px;position:relative;cursor:pointer;transition:background .2s;border:none;outline:none}
        .toggle.on{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
        .toggle::after{content:'';position:absolute;width:14px;height:14px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .2s}
        .toggle.on::after{left:19px}
        .filter-disabled{opacity:.25;pointer-events:none}
        .tabs-row{display:flex;gap:3px;margin-bottom:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:4px;width:fit-content;flex-wrap:wrap}
        .tab{padding:8px 14px;border:none;border-radius:9px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s;background:transparent;color:rgba(255,255,255,0.3)}
        .tab.active{background:rgba(255,255,255,0.08);color:#fff}
        .tab.tab-eb.active{background:linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15));color:#fbbf24}
        .tab.tab-tracker.active{background:rgba(129,140,248,0.12);color:#818cf8}
        .tab.tab-analytics.active{background:rgba(52,211,153,0.1);color:#34d399}
        .tab:hover:not(.active){background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.55)}
        .eb-banner{background:linear-gradient(135deg,rgba(248,113,113,0.05),rgba(251,191,36,0.05));border:1px solid rgba(251,191,36,0.12);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
        .jobs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .job-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;cursor:default;transition:all .2s;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden}
        .job-card:hover{border-color:rgba(129,140,248,0.3);background:rgba(129,140,248,0.04);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
        .job-card-hot{border-color:rgba(251,191,36,0.18)!important;background:rgba(251,191,36,0.02)!important}
        .job-card-matched{border-color:rgba(129,140,248,0.22)!important}
        .hot-ribbon{position:absolute;top:0;left:0;right:0;background:linear-gradient(135deg,rgba(248,113,113,0.7),rgba(251,191,36,0.7));color:#fff;font-size:10px;font-weight:700;padding:4px 12px;text-align:center;letter-spacing:.3px}
        .employer-logo{width:44px;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);flex-shrink:0}
        .employer-logo img{width:100%;height:100%;object-fit:contain}
        .logo-letter{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .save-btn{background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;opacity:0.6;transition:opacity .2s}
        .save-btn:hover{opacity:1}
        .job-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:4px}
        .card-actions{display:flex;gap:6px;flex-wrap:wrap}
        .card-btn{flex:1;min-width:60px;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid;transition:all .2s}
        .match-btn{background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2);color:#a5b4fc}
        .match-btn:hover{background:rgba(99,102,241,0.15)}
        .match-btn.done{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.35)}
        .tailor-btn{background:rgba(129,140,248,0.07);border-color:rgba(129,140,248,0.18);color:#818cf8}
        .tailor-btn:hover{background:rgba(129,140,248,0.13)}
        .tailor-btn.done{background:rgba(129,140,248,0.13)}
        .interview-btn{background:rgba(52,211,153,0.06);border-color:rgba(52,211,153,0.18);color:#34d399}
        .interview-btn:hover{background:rgba(52,211,153,0.11)}
        .interview-btn.done{background:rgba(52,211,153,0.11)}
        .track-btn{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.09);color:rgba(255,255,255,0.35);flex:0;padding:7px 12px}
        .track-btn.tracked{background:rgba(129,140,248,0.1);border-color:rgba(129,140,248,0.22);color:#818cf8}
        .card-btn:disabled{opacity:0.35;cursor:not-allowed}
        .badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px}
        .badge-type{background:rgba(129,140,248,0.1);color:#818cf8;border:1px solid rgba(129,140,248,0.15)}
        .badge-remote{background:rgba(52,211,153,0.1);color:#34d399;border:1px solid rgba(52,211,153,0.15)}
        .badge-hot{background:linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15));color:#fbbf24}
        .badge-time{background:rgba(251,191,36,0.07);color:rgba(251,191,36,0.7)}
        .badge-salary{background:rgba(52,211,153,0.07);color:#34d399}
        .badge-fit{background:rgba(129,140,248,0.1);color:#818cf8}
        .auto-toast{background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.18);border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px;font-weight:500;color:#34d399;display:flex;align-items:center;gap:8px}
        .pagination{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:28px}
        .page-btn{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;color:rgba(255,255,255,0.35);transition:all .2s}
        .page-btn.active{background:rgba(129,140,248,0.13);border-color:rgba(129,140,248,0.28);color:#818cf8}
        .page-btn:disabled{opacity:.2;cursor:not-allowed}
        .empty-state{text-align:center;padding:64px 24px;background:rgba(255,255,255,0.02);border-radius:14px;border:1px dashed rgba(255,255,255,0.07)}
        .empty-icon{font-size:40px;margin-bottom:14px}
        .empty-state h3{font-family:'Playfair Display',serif;font-size:18px;color:rgba(255,255,255,0.5);margin-bottom:8px}
        .empty-state p{font-size:13px;color:rgba(255,255,255,0.22)}
        .eb-cta{margin-top:16px;display:inline-block;background:linear-gradient(135deg,rgba(248,113,113,0.15),rgba(251,191,36,0.15));color:#fbbf24;border:1px solid rgba(251,191,36,0.2);border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
        .loading-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .skel-card{background:rgba(255,255,255,0.03);border-radius:14px;padding:18px;border:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;gap:12px}
        .skel{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .spin{width:16px;height:16px;border:2px solid rgba(129,140,248,0.25);border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        .spin-sm{width:12px;height:12px;border:2px solid rgba(255,255,255,0.12);border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(10px);animation:fi .2s}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        .modal{background:#0d0d14;border:1px solid rgba(255,255,255,0.08);border-radius:18px;width:100%;max-width:660px;max-height:88vh;overflow-y:auto;padding:32px;position:relative;animation:su .22s ease;scrollbar-width:thin}
        @keyframes su{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:50%;width:30px;height:30px;font-size:13px;cursor:pointer;color:rgba(255,255,255,0.35);transition:all .2s}
        .modal-close:hover{background:rgba(248,113,113,0.12);color:#f87171}
        .modal-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}
        .modal-logo{width:56px;height:56px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);flex-shrink:0}
        .modal-logo img{width:100%;height:100%;object-fit:contain}
        .modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:4px}
        .modal-sub{font-size:14px;color:#818cf8;font-weight:500}
        .modal-tabs{display:flex;gap:3px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;margin-bottom:16px}
        .mtab{flex:1;padding:8px;border:none;border-radius:7px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;background:transparent;color:rgba(255,255,255,0.28);transition:all .2s}
        .mtab.active{background:rgba(255,255,255,0.08);color:#fff}
        .apply-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;padding:10px 22px;font-size:14px;font-weight:600;font-family:inherit;flex:1;text-align:center;transition:opacity .2s}
        .apply-btn:hover{opacity:0.9}
        .apply-btn-hot{background:linear-gradient(135deg,#f87171,#fbbf24)!important}
        .btn-tracked{background:rgba(129,140,248,0.1)!important;border-color:rgba(129,140,248,0.22)!important;color:#818cf8!important}
        .analytics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .dark-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px}
        .dark-card-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:rgba(255,255,255,0.75);margin-bottom:16px}

        /* Match Panel */
        .match-panel-overlay{position:fixed;inset:0;z-index:250;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);animation:fi .2s}
        .match-panel{position:fixed;top:0;right:0;bottom:0;width:380px;background:#0d0d14;border-left:1px solid rgba(255,255,255,0.08);padding:24px;overflow-y:auto;animation:slideIn .25s ease;z-index:251;display:flex;flex-direction:column;gap:16px}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .match-panel-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06)}

        @media(max-width:900px){.analytics-grid{grid-template-columns:repeat(2,1fr)}.match-panel{width:100%}}
        @media(max-width:768px){.main-layout{flex-direction:column}.sidebar{width:100%}.filter-card{position:static}.jobs-grid,.loading-grid{grid-template-columns:1fr}.hero-title{font-size:32px}.search-box{flex-direction:column}}
      `}</style>

      <nav className="navbar">
        <div className="navbar-logo">Apply<span>Smart</span></div>
        <div className="navbar-right">
          {mounted&&earlyBirdJobs.length>0&&<span className="nav-pill pill-eb">⚡ {earlyBirdJobs.length} Early Bird</span>}
          {mounted&&trackedApps.length>0&&<span className="nav-pill pill-tracker">📋 {trackedApps.length} tracked</span>}
          {mounted&&savedJobs.size>0&&<span className="nav-pill pill-saved">🔖 {savedJobs.size}</span>}
          {mounted&&userEmail&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div className="user-avatar" title={userEmail}>{avatarLetter}</div>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.22)",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</span>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-eyebrow">AI-Powered Job Search</div>
        <h1 className="hero-title">Find your next role<br/><em>before anyone else</em></h1>
        <p className="hero-sub">Real-time jobs · AI resume match · Interview prep · Auto-apply</p>
        <div className="search-box">
          <div className="search-field"><label>Job Role</label><input className="search-input" type="text" placeholder="e.g. Data Analyst" value={jobRole} onChange={(e)=>setJobRole(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}/></div>
          <div className="search-field"><label>Location</label><input className="search-input" type="text" placeholder="e.g. Dallas, TX" value={location} onChange={(e)=>setLocation(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}/></div>
          <div className="search-actions">
            <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Search Jobs"}</button>
            <button className="eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading}>{ebLoading?"Scanning…":"⚡ Early Bird"}</button>
          </div>
        </div>
      </div>

      <div className="main-layout">
        <aside className="sidebar">
          {hasSearched&&<AlertPanel jobRole={jobRole} location={location} jobs={allJobs}/>}
          <div className="sidebar-card">
            <div className="sidebar-card-title">🤖 AI Resume Match</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)"}}>Upload PDF to match</span><button onClick={loadResumeHistory} style={{fontSize:11,color:"#818cf8",background:"none",border:"1px solid rgba(129,140,248,0.3)",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>History</button></div>
            <ResumePanel
              resumeText={resumeText}
              fileName={resumeFileName}
              onResume={async (t, n) => {
                setResumeText(t);
                setResumeFileName(n);
                lsSet("Vegaply_resume", t);
                lsSet("Vegaply_resume_name", n);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { alert("User not logged in"); return; }
                const { error } = await supabase.from("resumes").insert([{ user_id: user.id, title: "Test Resume", file_name: n, resume_text: t }]);
                if (error) { console.error("Resume insert error:", error); alert("Failed to save resume"); }
                else { alert("Resume saved successfully"); }
              }}
              onClear={() => {
                setResumeText("");
                setResumeFileName("");
                lsRemove("Vegaply_resume");
                lsRemove("Vegaply_resume_name");
              }}
            />
            {resumeText&&earlyBirdJobs.length>0&&(
              <>
                <button className="gradient-btn" onClick={runResumeMatch} disabled={isMatching} style={{marginTop:12}}>{isMatching?<><div className="spin"/>Analyzing {matchProgress}%</>:`🚀 Match & Auto-Apply (${earlyBirdJobs.length})`}</button>
                {isMatching&&<div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#818cf8",marginBottom:4}}><span>Analyzing…</span><span>{matchProgress}%</span></div><div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#818cf8,#ec4899)",borderRadius:4,width:`${matchProgress}%`,transition:"width .3s"}}/></div></div>}
              </>
            )}
            {resumeText&&earlyBirdJobs.length===0&&<p style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:10,textAlign:"center"}}>Run ⚡ Early Bird first to auto-apply!</p>}
            {resumeText&&hasSearched&&<p style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:8,textAlign:"center"}}>💡 Click <strong style={{color:"#a5b4fc"}}>🔍 Match</strong> on any job card</p>}
          </div>
          <div className={`filter-card${isEbMode?" filter-disabled":""}`}>
            <div className="filter-title">Filters</div>
            <div style={{marginBottom:14}}><div className="filter-label">Job Type</div><select className="filter-select" value={filterType} onChange={(e)=>{setFilterType(e.target.value);setCurrentPage(1);}}><option value="ALL">All Types</option><option value="FULLTIME">Full-time</option><option value="PARTTIME">Part-time</option><option value="CONTRACTOR">Contract</option><option value="INTERN">Internship</option></select></div>
            <div style={{marginBottom:14}}><div className="filter-label">Date Posted</div><select className="filter-select" value={filterDate} onChange={(e)=>{setFilterDate(e.target.value);setCurrentPage(1);}}><option value="ANY">Any Time</option><option value="TODAY">Today</option><option value="WEEK">Past Week</option><option value="MONTH">Past Month</option></select></div>
            <div style={{marginBottom:14}}><div className="filter-label">Work Mode</div><div className="toggle-row"><span>Remote Only</span><button className={`toggle${filterRemote?" on":""}`} onClick={()=>{setFilterRemote(!filterRemote);setCurrentPage(1);}}/></div></div>
            <button className="ghost-btn" style={{width:"100%",textAlign:"center"}} onClick={()=>{setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);setCurrentPage(1);}}>Clear Filters</button>
          </div>
        </aside>

        <main className="content">
          {hasSearched&&(
            <div className="tabs-row">
              <button className={`tab${activeTab==="results"?" active":""}`} onClick={()=>{setActiveTab("results");setCurrentPage(1);}}>All Results ({filterJobs(jobs).length})</button>
              <button className={`tab tab-eb${activeTab==="earlybird"?" active":""}`} onClick={()=>{if(earlyBirdJobs.length>0||ebLoading){setActiveTab("earlybird");setCurrentPage(1);}else handleEarlyBirdSearch();}}>⚡ Early Bird ({earlyBirdJobs.length})</button>
              <button className={`tab${activeTab==="saved"?" active":""}`} onClick={()=>{setActiveTab("saved");setCurrentPage(1);}}>🔖 Saved ({savedJobs.size})</button>
              <button className={`tab tab-tracker${activeTab==="tracker"?" active":""}`} onClick={()=>{setActiveTab("tracker");setCurrentPage(1);}}>📋 Tracker ({trackedApps.length})</button>
              <button className={`tab tab-analytics${activeTab==="analytics"?" active":""}`} onClick={()=>{setActiveTab("analytics");setCurrentPage(1);}}>📊 Analytics</button>
            </div>
          )}

          {autoOpenDone&&<div className="auto-toast">🚀 Opened top {Math.min(3,topMatchCount)} matches in new tabs!</div>}

          {isEbMode&&earlyBirdJobs.length>0&&!ebLoading&&(
            <div className="eb-banner">
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:28}}>⚡</span>
                <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:"#fbbf24"}}>Early Bird Mode Active</div><div style={{fontSize:12,color:"rgba(251,191,36,0.45)",marginTop:2}}>Jobs posted in the last 24 hours — minimal competition</div></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,display:"block"}}>{earlyBirdJobs.length}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>Fresh Jobs</span></div>
                <div style={{width:1,height:36,background:"rgba(255,255,255,0.07)"}}/>
                <div style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#f87171",display:"block"}}>{hotCount}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>🔥 Under 6h</span></div>
                {matchedCount>0&&<><div style={{width:1,height:36,background:"rgba(255,255,255,0.07)"}}/><div style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#818cf8",display:"block"}}>{topMatchCount}</span><span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>✓ Top Fits</span></div></>}
              </div>
            </div>
          )}

          {activeTab==="tracker"?(
            <TrackerView apps={trackedApps} onUpdateStatus={(id,s)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,status:s}:a))} onUpdateNotes={(id,n)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,notes:n}:a))} onRemove={(id)=>setTrackedApps(prev=>prev.filter(a=>a.id!==id))}/>
          ):activeTab==="analytics"?(
            <AnalyticsView apps={trackedApps} savedCount={savedJobs.size} totalSearched={allJobs.length}/>
          ):currentLoading?(
            <div className="loading-grid">{[...Array(6)].map((_,i)=><div key={i} className="skel-card"><div className="skel" style={{width:44,height:44,borderRadius:10}}/><div className="skel" style={{height:14,width:"65%"}}/><div className="skel" style={{height:11,width:"45%"}}/><div className="skel" style={{height:3,width:"100%",borderRadius:3}}/></div>)}</div>
          ):paginatedJobs.length>0?(
            <>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.22)",marginBottom:16}}>
                Showing <strong style={{color:"rgba(255,255,255,0.45)"}}>{(currentPage-1)*JOBS_PER_PAGE+1}–{Math.min(currentPage*JOBS_PER_PAGE,displayJobs.length)}</strong> of <strong style={{color:"rgba(255,255,255,0.45)"}}>{displayJobs.length}</strong> jobs
                {isEbMode&&<span style={{color:"#fbbf24",fontWeight:600}}> · ⚡ All posted today</span>}
              </p>
              <div className="jobs-grid">
                {paginatedJobs.map((job,idx)=>(
                  <JobCard key={`${job.job_id}-${idx}`} job={job} saved={savedJobs.has(job.job_id)} onToggleSave={()=>toggleSave(job.job_id)} onClick={()=>setSelectedJob(job)}
                    onTailor={()=>{if(job.tailor)setTailorJob(job);else handleTailor(job);}}
                    onInterview={()=>handleInterview(job)}
                    onMatchResume={()=>handleSingleMatch(job)}
                    earlyBirdMode={isEbMode} resumeReady={!!resumeText}
                    isTracked={trackedApps.some(a=>a.job.job_id===job.job_id)}
                    onTrack={()=>addToTracker(job)}/>
                ))}
              </div>
              {totalPages>1&&(
                <div className="pagination">
                  <button className="page-btn" onClick={()=>setCurrentPage(p=>p-1)} disabled={currentPage===1}>‹</button>
                  {[...Array(totalPages)].map((_,i)=><button key={i} className={`page-btn${currentPage===i+1?" active":""}`} onClick={()=>setCurrentPage(i+1)}>{i+1}</button>)}
                  <button className="page-btn" onClick={()=>setCurrentPage(p=>p+1)} disabled={currentPage===totalPages}>›</button>
                </div>
              )}
            </>
          ):hasSearched?(
            <div className="empty-state">
              <div className="empty-icon">{activeTab==="saved"?"🔖":"🔍"}</div>
              <h3>{activeTab==="saved"?"No saved jobs":"No jobs found"}</h3>
              <p>{activeTab==="saved"?"Bookmark jobs to see them here.":"Try adjusting your filters."}</p>
              {activeTab!=="earlybird"&&<button className="eb-cta" onClick={handleEarlyBirdSearch}>⚡ Try Early Bird</button>}
            </div>
          ):(
            <div className="empty-state"><div className="empty-icon">💼</div><h3>Start your search</h3><p>Enter a job role and location to find opportunities.</p></div>
          )}
        </main>
      </div>

      {selectedJob&&<JobModal job={selectedJob} saved={savedJobs.has(selectedJob.job_id)} onToggleSave={()=>toggleSave(selectedJob.job_id)} onClose={()=>setSelectedJob(null)} earlyBirdMode={isEbMode} onAddToTracker={()=>{addToTracker(selectedJob);setSelectedJob(null);setActiveTab("tracker");}} isTracked={trackedApps.some(a=>a.job.job_id===selectedJob.job_id)}/>}
      {tailorJob?.tailor&&<TailorModal job={tailorJob} tailor={tailorJob.tailor} onClose={()=>setTailorJob(null)}/>}
      {interviewJob?.interview&&<InterviewModal job={interviewJob} interview={interviewJob.interview} onClose={()=>setInterviewJob(null)}/>}
      {matchPanelJob&&<ResumeMatchPanel job={matchPanelJob} onClose={()=>setMatchPanelJob(null)} resumeText={resumeText}/>}
      {showOnboard&&(
        <div style={{position:"fixed",inset:0,background:"rgba(6,6,8,0.97)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(20px)"}}>
          <div style={{background:"#0d0d14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:24,padding:40,width:"100%",maxWidth:520,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:32}}>
              {[1,2,3].map(s=><div key={s} style={{width:32,height:4,borderRadius:4,background:s<=onboardStep?"linear-gradient(135deg,#6366f1,#ec4899)":"rgba(255,255,255,0.1)"}}/>)}
            </div>
            {onboardStep===1&&<>
              <div style={{fontSize:32,marginBottom:12}}>??</div>
              <h2 style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#fff",marginBottom:8}}>Welcome to Vegaply!</h2>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:32}}>Let us personalize your job search. What role are you looking for?</p>
              <input value={onboardRole} onChange={e=>setOnboardRole(e.target.value)} placeholder="e.g. Data Analyst, Software Engineer" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px 18px",fontSize:15,color:"#fff",outline:"none",marginBottom:16,fontFamily:"inherit"}}/>
              <button onClick={()=>{if(onboardRole.trim())setOnboardStep(2);}} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue ?</button>
            </>}
            {onboardStep===2&&<>
              <div style={{fontSize:32,marginBottom:12}}>??</div>
              <h2 style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#fff",marginBottom:8}}>Where are you looking?</h2>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:32}}>Enter your preferred job location or country.</p>
              <input value={onboardLocation} onChange={e=>setOnboardLocation(e.target.value)} placeholder="e.g. New York, US or Remote" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px 18px",fontSize:15,color:"#fff",outline:"none",marginBottom:16,fontFamily:"inherit"}}/>
              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>setOnboardStep(1)} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit"}}>? Back</button>
                <button onClick={()=>{if(onboardLocation.trim())setOnboardStep(3);}} style={{flex:2,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue ?</button>
              </div>
            </>}
            {onboardStep===3&&<>
              <div style={{fontSize:32,marginBottom:12}}>??</div>
              <h2 style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:700,color:"#fff",marginBottom:8}}>Upload your resume</h2>
              <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:32}}>Upload your PDF resume for AI matching and auto-apply.</p>
              {onboardParsing&&<div style={{color:"#818cf8",fontSize:14,marginBottom:16}}>? Parsing resume...</div>}
              <input id="ob-file-input" type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0];if(!file)return;
                setOnboardParsing(true);
                const fd=new FormData();fd.append("file",file);
                try{const res=await fetch("/api/parse-resume",{method:"POST",body:fd});const d=await res.json();
                if(d.text){setResumeText(d.text);setResumeFileName(file.name);lsSet("Vegaply_resume",d.text);lsSet("Vegaply_resume_name",file.name);
                const {supabase}=await import("@/lib/supabase");const {data:{user}}=await supabase.auth.getUser();
                if(user)await supabase.from("resumes").insert({user_id:user.id,title:"Resume",file_name:file.name,resume_text:d.text});}}catch(err){console.error(err);}
                setOnboardParsing(false);completeOnboarding();
              }}/>
              <button onClick={()=>document.getElementById("ob-file-input")?.click()} disabled={onboardParsing} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
                {onboardParsing?"Parsing...":"?? Upload Resume PDF"}
              </button>
              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>setOnboardStep(2)} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit"}}>? Back</button>
                <button onClick={completeOnboarding} style={{flex:2,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit"}}>Skip for now</button>
              </div>
            </>}
          </div>
        </div>
      )}
      {showResumeHistory&&(
        <div onClick={()=>setShowResumeHistory(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(10px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0d0d14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:32,width:"100%",maxWidth:560,maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h2 style={{fontFamily:"Playfair Display,serif",fontSize:22,fontWeight:700,color:"#fff"}}>Resume History</h2>
              <button onClick={()=>setShowResumeHistory(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer"}}>x</button>
            </div>
            {resumeHistory.length===0?<p style={{color:"rgba(255,255,255,0.4)",textAlign:"center",padding:"32px 0"}}>No resumes saved yet</p>:resumeHistory.map((r,i)=>(
              <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${i===0?"rgba(129,140,248,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:12,padding:16,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:4}}>{r.file_name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>{i===0&&<div style={{fontSize:10,color:"#818cf8",fontWeight:600,marginTop:4}}>Currently active</div>}</div>
                <button onClick={()=>{setResumeText(r.resume_text);setResumeFileName(r.file_name);lsSet("Vegaply_resume",r.resume_text);lsSet("Vegaply_resume_name",r.file_name);setShowResumeHistory(false);}} style={{background:i===0?"rgba(129,140,248,0.1)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:i===0?"#818cf8":"#fff",border:i===0?"1px solid rgba(129,140,248,0.3)":"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{i===0?"Active":"Use This"}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}















