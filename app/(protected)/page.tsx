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
const JOBS_PER_PAGE = 8;

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

function getCompetitionLabel(hoursAgo: number): { label: string; color: string; bg: string } {
  if (hoursAgo < 2)  return { label: "Very Low Competition", color: "#f87171", bg: "rgba(248,113,113,0.08)" };
  if (hoursAgo < 6)  return { label: "Still Early", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" };
  if (hoursAgo < 12) return { label: "Act Soon", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
  return { label: "Open", color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.03)" };
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={filled?"#818cf8":"none"} stroke={filled?"#818cf8":"rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>;
}

function ScoreRing({ score }: { score: number }) {
  const r = 18, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ, color = scoreColor(score);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 22 22)"/>
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="'DM Sans',sans-serif">{score}</text>
    </svg>
  );
}

function ResumeMatchPanel({ job, onClose, resumeText }: { job: JobWithMatch; onClose: () => void; resumeText: string }) {
  const [matchResult, setMatchResult] = useState<MatchResult | null>(job.match || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resumeText && !matchResult && !loading) { runMatch(); }
  }, []);

  const runMatch = async () => {
    if (!resumeText) return;
    setLoading(true);
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText, job }) });
      const data: MatchResult = await res.json();
      setMatchResult(data);
    } catch {}
    setLoading(false);
  };

  const color = matchResult ? scoreColor(matchResult.matchScore) : "#818cf8";

  return (
    <div className="match-panel-overlay" onClick={onClose}>
      <div className="match-panel" onClick={(e) => e.stopPropagation()}>
        <div className="match-panel-header">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Resume Analysis</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{job.job_title} · {job.employer_name}</div>
          </div>
          <button className="modal-close" style={{ position: "static" }} onClick={onClose}>✕</button>
        </div>

        {!resumeText && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>No resume uploaded</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Upload your resume PDF in the sidebar first</div>
          </div>
        )}

        {resumeText && loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", gap: 14 }}>
            <div className="spin" style={{ width: 28, height: 28, borderWidth: 2 }} />
            <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 500 }}>Analyzing your resume…</div>
          </div>
        )}

        {resumeText && !loading && matchResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: `${color}0d`, border: `1px solid ${color}20`, borderRadius: 12, padding: "14px 16px" }}>
              <ScoreRing score={matchResult.matchScore} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color, letterSpacing: "-0.3px" }}>{matchResult.matchLabel} Match</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3, lineHeight: 1.5 }}>{matchResult.matchSummary}</div>
              </div>
            </div>

            {job.job_posted_at_datetime_utc && (() => {
              const h = getHoursAgo(job.job_posted_at_datetime_utc);
              const comp = getCompetitionLabel(h);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: comp.bg, border: `1px solid ${comp.color}20`, borderRadius: 8, padding: "9px 12px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: comp.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: comp.color }}>{comp.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>posted {timeAgo(job.job_posted_at_datetime_utc)}</span>
                </div>
              );
            })()}

            {matchResult.matchedSkills.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#34d399", marginBottom: 8 }}>Strengths</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {matchResult.matchedSkills.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 4, background: "rgba(52,211,153,0.08)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {matchResult.missingSkills.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#f87171", marginBottom: 8 }}>Gaps</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {matchResult.missingSkills.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 4, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.12)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "rgba(251,191,36,0.75)", lineHeight: 1.6 }}>
              {matchResult.missingSkills.length > 0
                ? `Highlight experience related to ${matchResult.missingSkills[0]} to improve your match score.`
                : "Your resume aligns well. Customize your cover letter to mention specific company projects."}
            </div>

            {job.job_apply_link && (
              <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{ textAlign: "center", display: "block", textDecoration: "none" }}>
                {isHot(job.job_posted_at_datetime_utc) ? "Apply Now — Beat the Rush" : "Apply Now →"}
              </a>
            )}
          </div>
        )}

        {resumeText && !loading && !matchResult && (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <button className="gradient-btn" onClick={runMatch}>Analyze Match</button>
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
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.12)",borderRadius:8,padding:"9px 11px"}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:20,height:20,background:"rgba(52,211,153,0.2)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div><div style={{fontSize:11,fontWeight:600,color:"#34d399"}}>Resume loaded</div><div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:1,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</div></div>
      </div>
      <button className="ghost-btn" onClick={onClear} style={{fontSize:11,padding:"3px 10px"}}>Change</button>
    </div>
  );
  return (
    <div className={`resume-drop${dragging?" dragging":""}`} onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onClick={()=>inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={(e)=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
      {parsing ? <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#818cf8"}}><div className="spin"/>Parsing…</div> : (<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,0.3)",marginTop:6}}>Drop resume PDF</div><div style={{fontSize:10,color:"rgba(255,255,255,0.15)",marginTop:2}}>or click to browse</div>{error&&<div style={{fontSize:10,color:"#f87171",marginTop:4}}>{error}</div>}</>)}
    </div>
  );
}

function MatchBadge({ match, loading }: { match?: MatchResult; loading?: boolean }) {
  if (loading) return <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#818cf8",fontWeight:500}}><div className="spin-sm"/>Analyzing…</div>;
  if (!match) return null;
  const color = scoreColor(match.matchScore);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,borderRadius:6,padding:"6px 10px",border:`1px solid ${color}18`,background:`${color}08`}}>
      <ScoreRing score={match.matchScore}/>
      <div><div style={{fontSize:12,fontWeight:700,color}}>{match.matchLabel}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:1}}>{match.matchedSkills.slice(0,2).join(" · ")}</div></div>
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
      <div className="modal" style={{maxWidth:680}} onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div style={{width:40,height:40,background:"rgba(129,140,248,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div><h2 className="modal-title">Interview Prep</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div>
        </div>
        {interview.keyThemes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:16}}>{interview.keyThemes.map((t,i)=><span key={i} style={{background:"rgba(129,140,248,0.08)",color:"rgba(129,140,248,0.7)",fontSize:11,fontWeight:500,padding:"3px 10px",borderRadius:4,border:"1px solid rgba(129,140,248,0.12)"}}>{t}</span>)}</div>}
        <div className="modal-tabs">
          <button className={`mtab${tab==="behavioral"?" active":""}`} onClick={()=>setTab("behavioral")}>Behavioral ({allB.length})</button>
          <button className={`mtab${tab==="technical"?" active":""}`} onClick={()=>setTab("technical")}>Technical ({allT.length})</button>
          <button className={`mtab${tab==="ask"?" active":""}`} onClick={()=>setTab("ask")}>Ask Them</button>
          <button className={`mtab${tab==="tips"?" active":""}`} onClick={()=>setTab("tips")}>Watch Out</button>
        </div>
        {(tab==="behavioral"||tab==="technical")&&(
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:12}}>
            {(tab==="behavioral"?allB:allT).map((q,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${expanded===i?"rgba(129,140,248,0.2)":"rgba(255,255,255,0.06)"}`,borderRadius:8,padding:12,cursor:"pointer",transition:"border-color .2s"}} onClick={()=>setExpanded(expanded===i?null:i)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:9,fontWeight:700,background:"rgba(129,140,248,0.08)",color:"#818cf8",padding:"2px 7px",borderRadius:3,whiteSpace:"nowrap",flexShrink:0,marginTop:2,letterSpacing:"0.3px"}}>{q.category}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.7)",lineHeight:1.4}}>{q.question}</span>
                  <span style={{fontSize:9,color:"rgba(255,255,255,0.2)",flexShrink:0,marginTop:3}}>{expanded===i?"▲":"▼"}</span>
                </div>
                {expanded===i&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{fontSize:11,color:"rgba(251,191,36,0.7)",background:"rgba(251,191,36,0.05)",borderRadius:5,padding:"7px 9px",marginBottom:8}}>{q.tip}</div>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:"rgba(255,255,255,0.15)",marginBottom:5}}>Sample Answer</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.6,background:"rgba(255,255,255,0.02)",borderRadius:5,padding:"9px 11px"}}>{q.sampleAnswer}</div>
                </div>}
              </div>
            ))}
          </div>
        )}
        {tab==="ask"&&<div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>{interview.questionsToAsk?.map((q,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(129,140,248,0.04)",borderRadius:8,padding:12,border:"1px solid rgba(129,140,248,0.08)"}}><span style={{width:20,height:20,background:"rgba(129,140,248,0.12)",color:"#818cf8",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</span><span style={{fontSize:13,color:"rgba(255,255,255,0.55)",lineHeight:1.5}}>{q}</span></div>)}</div>}
        {tab==="tips"&&<div style={{marginTop:12}}>{interview.redFlags?.map((r,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(248,113,113,0.04)",borderRadius:7,padding:11,marginBottom:7,border:"1px solid rgba(248,113,113,0.08)"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{r}</span></div>)}</div>}
      </div>
    </div>
  );
}

function AnalyticsView({ apps, savedCount, totalSearched }: { apps: TrackedApp[]; savedCount: number; totalSearched: number }) {
  const sc: Record<AppStatus,number> = {Applied:0,Interviewing:0,Offer:0,Rejected:0};
  apps.forEach(a=>{sc[a.status]=(sc[a.status]||0)+1;});
  const rr = apps.length>0?Math.round(((sc.Interviewing+sc.Offer)/apps.length)*100):0;
  const cards = [
    {label:"Total Applied",value:apps.length,color:"#818cf8"},
    {label:"Interviewing",value:sc.Interviewing,color:"#fbbf24"},
    {label:"Offers",value:sc.Offer,color:"#34d399"},
    {label:"Response Rate",value:`${rr}%`,color:"#ec4899"}
  ];
  const funnel = [
    {label:"Saved",count:savedCount,color:"rgba(255,255,255,0.15)"},
    {label:"Applied",count:sc.Applied+sc.Interviewing+sc.Offer+sc.Rejected,color:"#818cf8"},
    {label:"Interviewing",count:sc.Interviewing+sc.Offer,color:"#fbbf24"},
    {label:"Offers",count:sc.Offer,color:"#34d399"}
  ];
  const mx = funnel[0].count||1;
  const sc2: Record<AppStatus,string> = {Applied:"#818cf8",Interviewing:"#fbbf24",Offer:"#34d399",Rejected:"#f87171"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {cards.map((c,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:`1px solid rgba(255,255,255,0.07)`,borderRadius:10,padding:"16px 18px",borderTop:`2px solid ${c.color}`}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,color:c.color,marginBottom:4,letterSpacing:"-0.5px"}}>{c.value}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:500}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:20}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.25)",marginBottom:16}}>Application Funnel</div>
        {funnel.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<funnel.length-1?12:0}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",width:80,flexShrink:0}}>{f.label}</div>
            <div style={{flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(f.count/mx)*100}%`,background:f.color,borderRadius:3,transition:"width .6s ease"}}/></div>
            <div style={{fontWeight:700,fontSize:13,color:f.color,width:24,textAlign:"right"}}>{f.count}</div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:20}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.25)",marginBottom:14}}>Status Breakdown</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {(Object.entries(sc) as [AppStatus,number][]).map(([s,c])=>(
            <div key={s} style={{background:"rgba(255,255,255,0.02)",border:`1px solid rgba(255,255,255,0.06)`,borderRadius:8,padding:"12px 14px",textAlign:"center",borderTop:`2px solid ${sc2[s]}`}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:sc2[s]}}>{c}</div>
              <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.25)",marginTop:3,letterSpacing:"0.3px"}}>{s.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
      {apps.length===0&&<div className="empty-state"><div style={{fontSize:32,marginBottom:12}}>📊</div><h3>No data yet</h3><p>Start tracking applications to see your analytics.</p></div>}
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
  if(sent)return(<div className="sidebar-card" style={{textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:"#34d399",marginBottom:4}}>Alert sent!</div><div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:10}}>Check {email}</div><button className="ghost-btn" onClick={()=>setSent(false)} style={{fontSize:11}}>Send another</button></div>);
  return(
    <div className="sidebar-card">
      <div className="sidebar-section-title">Email Alert</div>
      <input className="dark-input" type="email" placeholder="you@gmail.com" value={email} onChange={(e)=>setEmail(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()} style={{marginBottom:8}}/>
      {error&&<div style={{fontSize:10,color:"#f87171",marginBottom:8}}>{error}</div>}
      <button className="action-btn" onClick={send} disabled={sending||!jobs.length}>{sending?"Sending…":`Send ${jobs.length} Jobs`}</button>
    </div>
  );
}

function JobRow({ job, saved, onToggleSave, onClick, onTailor, onInterview, earlyBirdMode, resumeReady, isTracked, onTrack, onMatchResume }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClick:()=>void;onTailor:()=>void;onInterview:()=>void;earlyBirdMode:boolean;resumeReady:boolean;isTracked:boolean;onTrack:()=>void;onMatchResume:()=>void;
}) {
  const loc=[job.job_city,job.job_state].filter(Boolean).join(", ")||job.job_country||"";
  const badge=empBadge(job.job_employment_type);
  const hot=isHot(job.job_posted_at_datetime_utc);
  const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  const comp=getCompetitionLabel(hours);

  return(
    <div className={`job-row${hot&&earlyBirdMode?" job-row-hot":""}`}>
      {hot&&earlyBirdMode&&<div className="hot-strip"/>}
      <div style={{display:"flex",alignItems:"center",gap:14,flex:1,cursor:"pointer",minWidth:0}} onClick={onClick}>
        <div className="employer-logo-sm">
          {job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontWeight:700,fontSize:13,color:"rgba(255,255,255,0.4)"}}>{job.employer_name?.[0]??"?"}</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"#fff",letterSpacing:"-0.2px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.job_title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"#818cf8",fontWeight:500}}>{job.employer_name}</span>
            {loc&&<span style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>· {job.job_is_remote?"Remote":loc}</span>}
            {badge&&<span className="badge-xs badge-type-xs">{badge}</span>}
            {job.job_is_remote&&<span className="badge-xs badge-remote-xs">Remote</span>}
          </div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:5,background:comp.bg,border:`1px solid ${comp.color}15`}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:comp.color,flexShrink:0}}/>
          <span style={{fontSize:10,fontWeight:600,color:comp.color,whiteSpace:"nowrap"}}>{comp.label}</span>
        </div>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.2)",whiteSpace:"nowrap",minWidth:50,textAlign:"right"}}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
      </div>

      {job.match&&(
        <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:6,background:`${scoreColor(job.match.matchScore)}0d`,border:`1px solid ${scoreColor(job.match.matchScore)}18`}}>
          <span style={{fontSize:13,fontWeight:700,color:scoreColor(job.match.matchScore)}}>{job.match.matchScore}%</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{job.match.matchLabel}</span>
        </div>
      )}
      {job.matchLoading&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#818cf8",flexShrink:0}}><div className="spin-sm"/>Matching…</div>}

      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {resumeReady&&(
          <button className={`row-btn match-btn${job.match?" done":""}`} onClick={(e)=>{e.stopPropagation();onMatchResume();}} disabled={job.matchLoading} title="Match Resume">
            {job.matchLoading?<div className="spin-sm"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          </button>
        )}
        {resumeReady&&<button className={`row-btn tailor-btn${job.tailor?" done":""}`} onClick={(e)=>{e.stopPropagation();onTailor();}} disabled={job.tailorLoading} title="Tailor Resume">{job.tailorLoading?<div className="spin-sm"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}</button>}
        <button className={`row-btn interview-btn${job.interview?" done":""}`} onClick={(e)=>{e.stopPropagation();onInterview();}} disabled={job.interviewLoading} title="Interview Prep">{job.interviewLoading?<div className="spin-sm"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}</button>
        <button className={`row-btn track-btn${isTracked?" tracked":""}`} onClick={(e)=>{e.stopPropagation();onTrack();}} title={isTracked?"Tracked":"Track"}>
          {isTracked?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        </button>
        <button className="row-btn save-btn-row" onClick={(e)=>{e.stopPropagation();onToggleSave();}} title={saved?"Unsave":"Save"}><BookmarkIcon filled={saved}/></button>
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
        <div className="modal-head">
          <div style={{width:40,height:40,background:"rgba(129,140,248,0.08)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <div><h2 className="modal-title">Resume Tailored</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div>
        </div>
        {tailor.atsTip&&<div style={{background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"rgba(251,191,36,0.7)",marginBottom:14,lineHeight:1.6}}>{tailor.atsTip}</div>}
        {tailor.keywordsAdded?.length>0&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Keywords to include</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{tailor.keywordsAdded.map((k,i)=><span key={i} style={{background:"rgba(129,140,248,0.08)",color:"#818cf8",fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:4}}>{k}</span>)}</div></div>}
        <div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:10}}>Tailored bullet points</div>
          {tailor.tailoredBullets?.map((b,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:12,marginBottom:10,border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",lineHeight:1.5,marginBottom:6}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(255,255,255,0.15)",display:"block",marginBottom:2}}>ORIGINAL</span>{b.original}</div>
              <div style={{fontSize:12,color:"rgba(129,140,248,0.4)",textAlign:"center",margin:"4px 0"}}>↓</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,background:"rgba(52,211,153,0.05)",borderRadius:6,padding:"9px 11px"}}>
                <div><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(52,211,153,0.4)",display:"block",marginBottom:2}}>TAILORED</span><span style={{fontSize:12,color:"#34d399",fontWeight:500,lineHeight:1.5}}>{b.tailored}</span></div>
                <button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,opacity:0.4,flexShrink:0,color:"#fff"}} onClick={()=>{navigator.clipboard.writeText(b.tailored);setCopied(i);setTimeout(()=>setCopied(null),2000);}}>{copied===i?"✓":"⎘"}</button>
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:6,fontStyle:"italic"}}>{b.reason}</div>
            </div>
          ))}
        </div>
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
        {earlyBirdMode&&hot&&<div style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.15)",color:"rgba(248,113,113,0.8)",borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:600,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,borderRadius:"50%",background:"#f87171",animation:"pdot 1s infinite"}}/>Posted less than 6 hours ago — be among the first applicants</div>}
        <div className="modal-head">
          <div className="modal-logo">{job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}}/>:<span style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"rgba(255,255,255,0.3)"}}>{job.employer_name?.[0]??"?"}</span>}</div>
          <div style={{flex:1}}><h2 className="modal-title">{job.job_title}</h2><p className="modal-sub">{job.employer_name}</p><p style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginTop:2}}>{job.job_is_remote?"Remote":loc||"Location not specified"}</p></div>
          {job.match&&<div style={{textAlign:"center",flexShrink:0}}><ScoreRing score={job.match.matchScore}/><div style={{fontSize:10,color:scoreColor(job.match.matchScore),fontWeight:600,marginTop:2}}>{job.match.matchLabel}</div></div>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
          {badge&&<span className="badge-xs badge-type-xs">{badge}</span>}
          {job.job_is_remote&&<span className="badge-xs badge-remote-xs">Remote</span>}
          <span className="badge-xs" style={{background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.3)",border:"1px solid rgba(255,255,255,0.07)"}}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
          {(job.job_min_salary||job.job_max_salary)&&<span className="badge-xs" style={{background:"rgba(52,211,153,0.07)",color:"#34d399",border:"1px solid rgba(52,211,153,0.12)"}}>{job.job_salary_currency??"$"}{job.job_min_salary?.toLocaleString()}–{job.job_max_salary?.toLocaleString()}</span>}
        </div>
        {job.match&&(
          <>
            <div className="modal-tabs" style={{marginTop:12}}>
              <button className={`mtab${tab==="overview"?" active":""}`} onClick={()=>setTab("overview")}>Match Analysis</button>
              <button className={`mtab${tab==="cover"?" active":""}`} onClick={()=>setTab("cover")}>Cover Letter</button>
            </div>
            {tab==="overview"&&<div style={{marginBottom:14}}><p style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.7,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:12,marginBottom:12}}>{job.match.matchSummary}</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#34d399",marginBottom:7}}>Matched Skills</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{job.match.matchedSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:4,background:"rgba(52,211,153,0.08)",color:"#34d399",border:"1px solid rgba(52,211,153,0.12)"}}>{s}</span>)}</div></div><div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#f87171",marginBottom:7}}>Gaps</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{job.match.missingSkills.length>0?job.match.missingSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:4,background:"rgba(248,113,113,0.08)",color:"#f87171",border:"1px solid rgba(248,113,113,0.1)"}}>{s}</span>):<span style={{fontSize:11,color:"#34d399"}}>No major gaps</span>}</div></div></div></div>}
            {tab==="cover"&&<div><div style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.75,whiteSpace:"pre-wrap",background:"rgba(255,255,255,0.02)",borderRadius:8,padding:14,maxHeight:260,overflowY:"auto",border:"1px solid rgba(255,255,255,0.06)"}}>{job.match.coverLetter}</div><button className="ghost-btn" style={{marginTop:8,fontSize:11}} onClick={()=>{if(job.match?.coverLetter){navigator.clipboard.writeText(job.match.coverLetter);setCopied(true);setTimeout(()=>setCopied(false),2000);}}}>{copied?"✓ Copied":"Copy"}</button></div>}
          </>
        )}
        {!job.match&&(
          <>
            {job.job_highlights?.Responsibilities&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Responsibilities</div><ul style={{paddingLeft:16,display:"flex",flexDirection:"column",gap:5}}>{job.job_highlights.Responsibilities.slice(0,5).map((r,i)=><li key={i} style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.55}}>{r}</li>)}</ul></div>}
            {job.job_highlights?.Qualifications&&<div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Qualifications</div><ul style={{paddingLeft:16,display:"flex",flexDirection:"column",gap:5}}>{job.job_highlights.Qualifications.slice(0,5).map((q,i)=><li key={i} style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.55}}>{q}</li>)}</ul></div>}
            {job.job_description&&!job.job_highlights?.Responsibilities&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>About this role</div><p style={{fontSize:12,color:"rgba(255,255,255,0.3)",lineHeight:1.7}}>{job.job_description.slice(0,700)}...</p></div>}
          </>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:18,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap"}}>
          <button className="ghost-btn" style={{display:"flex",alignItems:"center",gap:6,fontSize:12}} onClick={onToggleSave}><BookmarkIcon filled={saved}/>{saved?"Saved":"Save"}</button>
          <button className={`ghost-btn${isTracked?" btn-tracked":""}`} style={{fontSize:12}} onClick={onAddToTracker}>{isTracked?"✓ Tracking":"+ Track"}</button>
          {job.job_apply_link&&<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{fontSize:13}}>{hot&&earlyBirdMode?"Apply Now — First Mover":"Apply Now →"}</a>}
        </div>
      </div>
    </div>
  );
}

function TrackerView({ apps, onUpdateStatus, onUpdateNotes, onRemove }: { apps: TrackedApp[]; onUpdateStatus: (id:string,s:AppStatus)=>void; onUpdateNotes: (id:string,n:string)=>void; onRemove: (id:string)=>void }) {
  const cols: Record<AppStatus,{color:string;border:string}> = {Applied:{color:"#818cf8",border:"rgba(129,140,248,0.15)"},Interviewing:{color:"#fbbf24",border:"rgba(251,191,36,0.15)"},Offer:{color:"#34d399",border:"rgba(52,211,153,0.15)"},Rejected:{color:"#f87171",border:"rgba(248,113,113,0.15)"}};
  if(apps.length===0)return<div className="empty-state"><div style={{fontSize:32,marginBottom:12}}>📋</div><h3>No applications tracked</h3><p>Click "+" on any job to track it here.</p></div>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"14px 20px",flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:"#fff",display:"block"}}>{apps.length}</span><span style={{fontSize:10,color:"rgba(255,255,255,0.25)",fontWeight:600,letterSpacing:"0.5px"}}>TOTAL</span></div>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
          <><div key={s+"d"} style={{width:1,height:28,background:"rgba(255,255,255,0.07)"}}/><div key={s} style={{textAlign:"center"}}><span style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:cols[s].color,display:"block"}}>{apps.filter(a=>a.status===s).length}</span><span style={{fontSize:10,color:"rgba(255,255,255,0.25)",fontWeight:600,letterSpacing:"0.5px"}}>{s.toUpperCase()}</span></div></>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(col=>(
          <div key={col} style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"1px",padding:"7px 10px",borderRadius:6,border:`1px solid ${cols[col].border}`,color:cols[col].color,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{col.toUpperCase()}<span style={{fontSize:16,fontWeight:800}}>{apps.filter(a=>a.status===col).length}</span></div>
            {apps.filter(a=>a.status===col).map(app=>(
              <div key={app.id} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:10,border:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",gap:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:26,height:26,borderRadius:5,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.03)",flexShrink:0}}>{app.job.employer_logo?<img src={app.job.employer_logo} alt="" onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)"}}>{app.job.employer_name?.[0]}</span>}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.job.job_title}</div><div style={{fontSize:10,color:"#818cf8"}}>{app.job.employer_name}</div></div>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.15)",fontSize:11}} onClick={()=>onRemove(app.id)}>✕</button>
                </div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.15)",letterSpacing:"0.3px"}}>{new Date(app.appliedDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                  {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
                    <button key={s} style={{flex:1,minWidth:50,padding:"2px 1px",border:`1px solid ${app.status===s?cols[s].border:"rgba(255,255,255,0.05)"}`,borderRadius:3,fontSize:8,fontWeight:700,cursor:"pointer",background:app.status===s?cols[s].border:"transparent",color:app.status===s?cols[s].color:"rgba(255,255,255,0.2)",fontFamily:"inherit",letterSpacing:"0.3px"}} onClick={()=>onUpdateStatus(app.id,s)}>{s.toUpperCase()}</button>
                  ))}
                </div>
                <textarea style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:4,padding:"5px 7px",fontSize:10,fontFamily:"inherit",resize:"none",outline:"none",color:"rgba(255,255,255,0.35)"}} placeholder="Add notes…" value={app.notes} onChange={(e)=>onUpdateNotes(app.id,e.target.value)} rows={2}/>
                {app.job.job_apply_link&&<a href={app.job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#818cf8",fontWeight:600,textDecoration:"none"}}>View Job →</a>}
              </div>
            ))}
            {apps.filter(a=>a.status===col).length===0&&<div style={{textAlign:"center",padding:16,color:"rgba(255,255,255,0.1)",fontSize:10,background:"rgba(255,255,255,0.01)",borderRadius:6,border:"1px dashed rgba(255,255,255,0.05)"}}>Empty</div>}
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
  const [showResumeHistory, setShowResumeHistory] = useState(false);
  const [resumeHistory, setResumeHistory] = useState<{id:string;file_name:string;created_at:string;resume_text:string}[]>([]);

  const lsGet = (key: string) => { const uid = localStorage.getItem("applysmart_user_id"); return localStorage.getItem(uid ? `${key}_${uid}` : key); };
  const lsSet = (key: string, val: string) => { const uid = localStorage.getItem("applysmart_user_id"); localStorage.setItem(uid ? `${key}_${uid}` : key, val); };
  const lsRemove = (key: string) => { const uid = localStorage.getItem("applysmart_user_id"); localStorage.removeItem(uid ? `${key}_${uid}` : key); localStorage.removeItem(key); };

  useEffect(()=>{
    setMounted(true);
    const savedRole = localStorage.getItem("applysmart_jobRole");
    const savedLocation = localStorage.getItem("applysmart_location");
    if(savedRole) setJobRole(savedRole);
    if(savedLocation) setLocation(savedLocation);
    import("@/lib/supabase").then(({supabase})=>{
      supabase.auth.getUser().then(({data})=>{
        if(data.user?.email)setUserEmail(data.user.email);
        const uid=data.user?.id;
        if(uid){
          localStorage.setItem("applysmart_user_id",uid);
          const onboarded=localStorage.getItem(`applysmart_onboarded_${uid}`);
          if(!onboarded)setShowOnboard(true);
        }
      });
    });
    import("@/lib/supabase").then(({supabase}) => {
      supabase.auth.getUser().then(async ({ data }) => {
        const currentUserId = data?.user?.id;
        const storedUserId = localStorage.getItem("applysmart_user_id");
        if (!currentUserId) return;
        if (storedUserId && storedUserId !== currentUserId) {
          lsRemove("applysmart_resume"); lsRemove("applysmart_resume_name");
          setResumeText(""); setResumeFileName("");
        } else {
          const savedResume = lsGet("applysmart_resume");
          const savedFileName = lsGet("applysmart_resume_name");
          if (savedResume && savedFileName) { setResumeText(savedResume); setResumeFileName(savedFileName); }
          else {
            const { data: rd } = await supabase.from("resumes").select("resume_text,file_name").eq("user_id", currentUserId).order("created_at",{ascending:false}).limit(1).single();
            if (rd?.resume_text) { setResumeText(rd.resume_text); setResumeFileName(rd.file_name ?? "Resume"); lsSet("applysmart_resume", rd.resume_text); lsSet("applysmart_resume_name", rd.file_name ?? "Resume"); }
          }
        }
        localStorage.setItem("applysmart_user_id", currentUserId);
      });
    });
  },[]);

  const fetchJobs=async(mode:"normal"|"earlybird")=>{
    if(!jobRole||!location)return;
    if(mode==="normal"){setLoading(true);setJobs([]);}else{setEbLoading(true);setEarlyBirdJobs([]);setAutoOpenDone(false);}
    try{const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole,location,earlyBird:mode==="earlybird"})});const data=await res.json();if(mode==="normal")setJobs(data?.data||[]);else setEarlyBirdJobs(data?.data||[]);}catch(err){console.error(err);}
    if(mode==="normal")setLoading(false);else setEbLoading(false);
  };

  const handleSearch=async()=>{
    if(!jobRole||!location){alert("Please enter job role and location");return;}
    localStorage.setItem("applysmart_jobRole", jobRole);
    localStorage.setItem("applysmart_location", location);
    setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);await fetchJobs("normal");
  };
  const handleEarlyBirdSearch=async()=>{
    if(!jobRole||!location){alert("Please enter job role and location first");return;}
    localStorage.setItem("applysmart_jobRole", jobRole);
    localStorage.setItem("applysmart_location", location);
    setHasSearched(true);setActiveTab("earlybird");setCurrentPage(1);await fetchJobs("earlybird");
  };

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

  const handleSingleMatch = async (job: JobWithMatch) => {
    if (job.match) { setMatchPanelJob(job); return; }
    setMatchPanelJob(job);
  };

  const updateJobMatch = (jobId: string, match: MatchResult) => {
    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, match, matchLoading: false } : j));
    setEarlyBirdJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, match, matchLoading: false } : j));
    setMatchPanelJob(prev => prev?.job_id === jobId ? { ...prev, match, matchLoading: false } : prev);
  };

  const handleTailor=async(job:JobWithMatch)=>{
    if(job.tailor){setTailorJob(job);return;}
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
  const totalPages=Math.ceil(displayJobs.length/JOBS_PER_PAGE);
  const paginatedJobs=displayJobs.slice((currentPage-1)*JOBS_PER_PAGE,currentPage*JOBS_PER_PAGE);
  const currentLoading=isEbMode?ebLoading:loading;
  const allJobs=[...jobs,...earlyBirdJobs];
  const totalSearched=allJobs.length;

  const completeOnboarding=async()=>{
    const uid=localStorage.getItem("applysmart_user_id");
    if(uid)localStorage.setItem(`applysmart_onboarded_${uid}`,"true");
    if(onboardRole)setJobRole(onboardRole);
    if(onboardLocation)setLocation(onboardLocation);
    setShowOnboard(false);
  };

  const loadResumeHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("resumes").select("id, file_name, created_at, resume_text").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setResumeHistory(data as any[]);
    setShowResumeHistory(true);
  };

  const handleLogout=async()=>{const {supabase}=await import("@/lib/supabase");await supabase.auth.signOut();lsRemove("applysmart_resume");lsRemove("applysmart_resume_name");lsRemove("applysmart_onboarded");localStorage.removeItem("applysmart_user_id");window.location.href="/login";};
  const avatarLetter=userEmail?userEmail[0].toUpperCase():"?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#07080B;color:#fff;min-height:100vh}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:4px}

        /* TOP BAR */
        .topbar{background:#07080B;border-bottom:1px solid #13151A;padding:0 24px;height:56px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:200}
        .topbar-logo{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;flex-shrink:0;margin-right:8px}
        .topbar-logo span{background:linear-gradient(135deg,#6366f1,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .topbar-search{display:flex;align-items:center;gap:8px;flex:1;max-width:600px}
        .topbar-input{background:#0D0F14;border:1px solid #1A1D24;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit;color:#fff;outline:none;transition:border-color .15s;flex:1}
        .topbar-input::placeholder{color:rgba(255,255,255,0.2)}
        .topbar-input:focus{border-color:rgba(99,102,241,0.4)}
        .topbar-search-btn{background:#6366f1;color:#fff;border:none;border-radius:7px;padding:8px 16px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background .15s}
        .topbar-search-btn:hover{background:#5558e8}
        .topbar-search-btn:disabled{opacity:0.4;cursor:not-allowed}
        .topbar-eb-btn{background:rgba(251,191,36,0.08);color:#fbbf24;border:1px solid rgba(251,191,36,0.15);border-radius:7px;padding:8px 14px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .15s}
        .topbar-eb-btn:hover{background:rgba(251,191,36,0.14)}
        .topbar-eb-btn:disabled{opacity:0.4;cursor:not-allowed}
        .topbar-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0}
        .topbar-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:4px;letter-spacing:"0.3px"}
        .pill-eb{background:rgba(251,191,36,0.08);color:#fbbf24;border:1px solid rgba(251,191,36,0.15)}
        .pill-tracker{background:rgba(99,102,241,0.08);color:#818cf8;border:1px solid rgba(99,102,241,0.15)}
        .pill-saved{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.3);border:1px solid rgba(255,255,255,0.07)}
        .user-avatar{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
        .logout-btn{font-size:11px;font-weight:500;color:rgba(255,255,255,0.25);background:none;border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit;transition:all .15s}
        .logout-btn:hover{color:#f87171;border-color:rgba(248,113,113,0.2)}

        /* MAIN LAYOUT */
        .app-layout{display:flex;min-height:calc(100vh - 56px)}
        .sidebar{width:240px;flex-shrink:0;border-right:1px solid #13151A;padding:20px 14px;display:flex;flex-direction:column;gap:8px;position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto}
        .content{flex:1;min-width:0;padding:20px 24px}

        /* SIDEBAR */
        .sidebar-card{background:#0D0F14;border:1px solid #1A1D24;border-radius:8px;padding:12px}
        .sidebar-section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:"1.2px";color:rgba(255,255,255,0.2);margin-bottom:10px}
        .resume-drop{border:1px dashed rgba(99,102,241,0.2);border-radius:7px;padding:16px 10px;text-align:center;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:3px}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.04)}
        .dark-input{width:100%;background:#0D0F14;border:1px solid #1A1D24;border-radius:6px;padding:8px 10px;font-size:12px;font-family:inherit;color:#fff;outline:none;transition:border-color .15s}
        .dark-input::placeholder{color:rgba(255,255,255,0.15)}
        .dark-input:focus{border-color:rgba(99,102,241,0.3)}
        .action-btn{width:100%;background:#6366f1;color:#fff;border:none;border-radius:6px;padding:9px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s}
        .action-btn:hover{background:#5558e8}
        .action-btn:disabled{opacity:0.35;cursor:not-allowed}
        .gradient-btn{width:100%;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;border-radius:7px;padding:10px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
        .ghost-btn{font-size:11px;font-weight:500;color:rgba(255,255,255,0.35);background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit;transition:all .15s}
        .ghost-btn:hover{color:rgba(255,255,255,0.6);border-color:rgba(255,255,255,0.15)}
        .filter-label{font-size:9px;font-weight:700;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:"0.8px";margin-bottom:5px;margin-top:10px}
        .filter-select{width:100%;background:#0D0F14;border:1px solid #1A1D24;border-radius:6px;padding:7px 9px;font-size:11px;font-family:inherit;color:rgba(255,255,255,0.45);cursor:pointer;outline:none}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.35);margin-top:8px}
        .toggle{width:32px;height:18px;background:rgba(255,255,255,0.08);border-radius:9px;position:relative;cursor:pointer;transition:background .15s;border:none;outline:none}
        .toggle.on{background:#6366f1}
        .toggle::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .15s}
        .toggle.on::after{left:17px}
        .divider{height:1px;background:#13151A;margin:4px 0}

        /* TABS */
        .tabs-row{display:flex;gap:2px;margin-bottom:16px;border-bottom:1px solid #13151A;padding-bottom:0}
        .tab{padding:8px 14px;border:none;border-bottom:2px solid transparent;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .15s;background:transparent;color:rgba(255,255,255,0.3);margin-bottom:-1px}
        .tab.active{color:#fff;border-bottom-color:#6366f1}
        .tab.tab-eb.active{color:#fbbf24;border-bottom-color:#fbbf24}
        .tab.tab-tracker.active{color:#818cf8;border-bottom-color:#818cf8}
        .tab.tab-analytics.active{color:#34d399;border-bottom-color:#34d399}
        .tab:hover:not(.active){color:rgba(255,255,255,0.55)}

        /* JOB ROWS */
        .jobs-list{display:flex;flex-direction:column;gap:2px}
        .job-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#0D0F14;border:1px solid #1A1D24;border-radius:8px;transition:all .15s;position:relative;overflow:hidden}
        .job-row:hover{border-color:#232530;background:#0F1116}
        .job-row-hot{border-left:3px solid rgba(251,191,36,0.5)!important}
        .hot-strip{position:absolute;top:0;left:0;bottom:0;width:3px;background:linear-gradient(180deg,#f87171,#fbbf24)}
        .employer-logo-sm{width:36px;height:36px;border-radius:7px;border:1px solid #1A1D24;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#13151A;flex-shrink:0}
        .badge-xs{font-size:10px;font-weight:600;padding:2px 7px;border-radius:3px}
        .badge-type-xs{background:rgba(99,102,241,0.08);color:rgba(129,140,248,0.7);border:1px solid rgba(99,102,241,0.12)}
        .badge-remote-xs{background:rgba(52,211,153,0.07);color:rgba(52,211,153,0.7);border:1px solid rgba(52,211,153,0.12)}

        /* ROW ACTION BUTTONS */
        .row-btn{width:28px;height:28px;border-radius:5px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1px solid;transition:all .15s}
        .row-btn.match-btn{background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.15);color:#818cf8}
        .row-btn.match-btn:hover{background:rgba(99,102,241,0.12)}
        .row-btn.match-btn.done{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.25)}
        .row-btn.tailor-btn{background:rgba(129,140,248,0.05);border-color:rgba(129,140,248,0.12);color:#818cf8}
        .row-btn.tailor-btn:hover{background:rgba(129,140,248,0.1)}
        .row-btn.tailor-btn.done{background:rgba(129,140,248,0.1)}
        .row-btn.interview-btn{background:rgba(52,211,153,0.05);border-color:rgba(52,211,153,0.12);color:#34d399}
        .row-btn.interview-btn:hover{background:rgba(52,211,153,0.1)}
        .row-btn.interview-btn.done{background:rgba(52,211,153,0.1)}
        .row-btn.track-btn{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.3)}
        .row-btn.track-btn:hover{background:rgba(255,255,255,0.06)}
        .row-btn.track-btn.tracked{background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2);color:#818cf8}
        .row-btn.save-btn-row{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.3)}
        .row-btn.save-btn-row:hover{background:rgba(255,255,255,0.06)}
        .row-btn:disabled{opacity:0.3;cursor:not-allowed}

        /* EARLY BIRD BANNER */
        .eb-banner{background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.1);border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}

        /* PAGINATION */
        .pagination{display:flex;justify-content:center;align-items:center;gap:4px;margin-top:20px}
        .page-btn{width:30px;height:30px;border-radius:5px;border:1px solid #1A1D24;background:#0D0F14;font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;color:rgba(255,255,255,0.3);transition:all .15s}
        .page-btn.active{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.25);color:#818cf8}
        .page-btn:disabled{opacity:.2;cursor:not-allowed}

        /* EMPTY STATE */
        .empty-state{text-align:center;padding:48px 24px;background:#0D0F14;border-radius:8px;border:1px solid #1A1D24}
        .empty-state h3{font-family:'Playfair Display',serif;font-size:16px;color:rgba(255,255,255,0.35);margin-bottom:6px}
        .empty-state p{font-size:12px;color:rgba(255,255,255,0.18)}

        /* SKELETON */
        .skel{background:linear-gradient(90deg,#0D0F14 25%,#13151A 50%,#0D0F14 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:5px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* SPINNERS */
        .spin{width:16px;height:16px;border:2px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        .spin-sm{width:11px;height:11px;border:1.5px solid rgba(255,255,255,0.1);border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* MODAL / OVERLAY */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(8px);animation:fi .15s}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        .modal{background:#0C0D11;border:1px solid #1A1D24;border-radius:12px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;padding:28px;position:relative;animation:su .2s ease;scrollbar-width:thin}
        @keyframes su{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-close{position:absolute;top:12px;right:12px;background:#13151A;border:1px solid #1A1D24;border-radius:6px;width:26px;height:26px;font-size:11px;cursor:pointer;color:rgba(255,255,255,0.3);transition:all .15s;display:flex;align-items:center;justify-content:center}
        .modal-close:hover{background:rgba(248,113,113,0.1);color:#f87171;border-color:rgba(248,113,113,0.2)}
        .modal-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
        .modal-logo{width:48px;height:48px;border-radius:10px;border:1px solid #1A1D24;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#13151A;flex-shrink:0}
        .modal-logo img{width:100%;height:100%;object-fit:contain}
        .modal-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:3px;letter-spacing:-0.3px}
        .modal-sub{font-size:12px;color:#818cf8;font-weight:500}
        .modal-tabs{display:flex;gap:2px;background:#13151A;border-radius:7px;padding:3px;margin-bottom:14px}
        .mtab{flex:1;padding:7px;border:none;border-radius:5px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;background:transparent;color:rgba(255,255,255,0.25);transition:all .15s}
        .mtab.active{background:#0C0D11;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)}
        .apply-btn{background:#6366f1;color:#fff;text-decoration:none;border-radius:7px;padding:9px 20px;font-size:13px;font-weight:600;font-family:inherit;flex:1;text-align:center;transition:background .15s;display:inline-block}
        .apply-btn:hover{background:#5558e8}
        .btn-tracked{background:rgba(99,102,241,0.08)!important;border-color:rgba(99,102,241,0.2)!important;color:#818cf8!important}

        /* MATCH PANEL */
        .match-panel-overlay{position:fixed;inset:0;z-index:250;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);animation:fi .15s}
        .match-panel{position:fixed;top:0;right:0;bottom:0;width:360px;background:#0C0D11;border-left:1px solid #1A1D24;padding:20px;overflow-y:auto;animation:slideIn .22s ease;z-index:251;display:flex;flex-direction:column;gap:14px}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .match-panel-header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid #1A1D24}

        /* ANIMATIONS */
        @keyframes pdot{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:0.6}}

        /* RESPONSIVE */
        @media(max-width:900px){.sidebar{display:none}.content{padding:16px}}
        @media(max-width:768px){.topbar-search{display:none}.app-layout{flex-direction:column}}
      `}</style>

      {/* TOP BAR */}
      <nav className="topbar">
        <div className="topbar-logo">Vega<span>ply</span></div>
        <div className="topbar-search">
          <input className="topbar-input" type="text" placeholder="Job role (e.g. Data Analyst)" value={jobRole} onChange={(e)=>setJobRole(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}/>
          <input className="topbar-input" type="text" placeholder="Location (e.g. New York, US)" value={location} onChange={(e)=>setLocation(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleSearch()}/>
          <button className="topbar-search-btn" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Search"}</button>
          <button className="topbar-eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading}>{ebLoading?"Scanning…":"⚡ Early Bird"}</button>
        </div>
        <div className="topbar-right">
          {mounted&&earlyBirdJobs.length>0&&<span className="topbar-pill pill-eb">⚡ {earlyBirdJobs.length} Early</span>}
          {mounted&&trackedApps.length>0&&<span className="topbar-pill pill-tracker">{trackedApps.length} Tracked</span>}
          {mounted&&savedJobs.size>0&&<span className="topbar-pill pill-saved">{savedJobs.size} Saved</span>}
          {mounted&&userEmail&&<div className="user-avatar" title={userEmail}>{avatarLetter}</div>}
          {mounted&&userEmail&&<span style={{fontSize:11,color:"rgba(255,255,255,0.2)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</span>}
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      <div className="app-layout">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          {/* Resume Section */}
          <div className="sidebar-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sidebar-section-title" style={{margin:0}}>Resume</div>
              <button onClick={loadResumeHistory} style={{fontSize:10,color:"#818cf8",background:"none",border:"1px solid rgba(99,102,241,0.2)",borderRadius:4,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit"}}>History</button>
            </div>
            <ResumePanel
              resumeText={resumeText}
              fileName={resumeFileName}
              onResume={async (t, n) => {
                setResumeText(t); setResumeFileName(n);
                lsSet("applysmart_resume", t); lsSet("applysmart_resume_name", n);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from("resumes").insert([{ user_id: user.id, title: n, file_name: n, resume_text: t }]);
              }}
              onClear={() => { setResumeText(""); setResumeFileName(""); lsRemove("applysmart_resume"); lsRemove("applysmart_resume_name"); }}
            />
          </div>

          {/* Auto-match section */}
          {resumeText && activeTab === "earlybird" && earlyBirdJobs.length > 0 && (
            <div className="sidebar-card">
              <div className="sidebar-section-title">Auto-Apply</div>
              {isMatching ? (
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}><div className="spin"/>  <span style={{fontSize:12,color:"#818cf8"}}>Analyzing {matchProgress}%</span></div>
                  <div style={{height:3,background:"#13151A",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${matchProgress}%`,background:"#6366f1",transition:"width .3s"}}/></div>
                </div>
              ) : (
                <button className="action-btn" onClick={runResumeMatch}>Match & Auto-Apply ({earlyBirdJobs.length})</button>
              )}
              {autoOpenDone && <div style={{fontSize:10,color:"#34d399",textAlign:"center",marginTop:8}}>Opened top matches in new tabs</div>}
            </div>
          )}

          <div className="divider"/>

          {/* Filters */}
          <div className="sidebar-card">
            <div className="sidebar-section-title">Filters</div>
            <div className="filter-label">Job Type</div>
            <select className="filter-select" value={filterType} onChange={(e)=>{setFilterType(e.target.value);setCurrentPage(1);}}>
              <option value="ALL">All Types</option>
              <option value="FULLTIME">Full-time</option>
              <option value="PARTTIME">Part-time</option>
              <option value="CONTRACTOR">Contract</option>
              <option value="INTERN">Internship</option>
            </select>
            <div className="filter-label">Date Posted</div>
            <select className="filter-select" value={filterDate} onChange={(e)=>{setFilterDate(e.target.value);setCurrentPage(1);}}>
              <option value="ANY">Any Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
            </select>
            <div className="toggle-row" style={{marginTop:10}}>
              <span>Remote Only</span>
              <button className={`toggle${filterRemote?" on":""}`} onClick={()=>{setFilterRemote(!filterRemote);setCurrentPage(1);}}/>
            </div>
          </div>

          <div className="divider"/>

          {/* Email Alert */}
          {hasSearched && <AlertPanel jobRole={jobRole} location={location} jobs={allJobs}/>}
        </aside>

        {/* MAIN CONTENT */}
        <main className="content">
          {/* TABS */}
          <div className="tabs-row">
            <button className={`tab${activeTab==="results"?" active":""}`} onClick={()=>{setActiveTab("results");setCurrentPage(1);}}>
              Results {jobs.length>0&&`(${filterJobs(jobs).length})`}
            </button>
            <button className={`tab tab-eb${activeTab==="earlybird"?" active":""}`} onClick={()=>{setActiveTab("earlybird");setCurrentPage(1);}}>
              ⚡ Early Bird {earlyBirdJobs.length>0&&`(${earlyBirdJobs.length})`}
            </button>
            <button className={`tab${activeTab==="saved"?" active":""}`} onClick={()=>{setActiveTab("saved");setCurrentPage(1);}}>
              Saved {savedJobs.size>0&&`(${savedJobs.size})`}
            </button>
            <button className={`tab tab-tracker${activeTab==="tracker"?" active":""}`} onClick={()=>setActiveTab("tracker")}>
              Tracker {trackedApps.length>0&&`(${trackedApps.length})`}
            </button>
            <button className={`tab tab-analytics${activeTab==="analytics"?" active":""}`} onClick={()=>setActiveTab("analytics")}>
              Analytics
            </button>
          </div>

          {/* TRACKER VIEW */}
          {activeTab==="tracker"&&(
            <TrackerView apps={trackedApps} onUpdateStatus={(id,s)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,status:s}:a))} onUpdateNotes={(id,n)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,notes:n}:a))} onRemove={(id)=>setTrackedApps(prev=>prev.filter(a=>a.id!==id))}/>
          )}

          {/* ANALYTICS VIEW */}
          {activeTab==="analytics"&&(
            <AnalyticsView apps={trackedApps} savedCount={savedJobs.size} totalSearched={totalSearched}/>
          )}

          {/* JOBS VIEW */}
          {(activeTab==="results"||activeTab==="earlybird"||activeTab==="saved")&&(
            <>
              {/* Early Bird Banner */}
              {activeTab==="earlybird"&&earlyBirdJobs.length>0&&(
                <div className="eb-banner">
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"rgba(251,191,36,0.8)",marginBottom:2}}>{earlyBirdJobs.length} fresh jobs · Posted today</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.25)"}}>Sorted by newest first — apply before competition builds</div>
                  </div>
                  <div style={{display:"flex",gap:16,flexShrink:0}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:"#f87171",fontFamily:"'Playfair Display',serif"}}>{earlyBirdJobs.filter(j=>isHot(j.job_posted_at_datetime_utc)).length}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.2)",fontWeight:600,letterSpacing:"0.5px"}}>UNDER 6H</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:"#34d399",fontFamily:"'Playfair Display',serif"}}>{earlyBirdJobs.filter(j=>j.match&&j.match.matchScore>=70).length}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.2)",fontWeight:600,letterSpacing:"0.5px"}}>TOP MATCHES</div></div>
                  </div>
                </div>
              )}

              {autoOpenDone&&<div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.12)",borderRadius:7,padding:"10px 14px",marginBottom:12,fontSize:12,fontWeight:500,color:"#34d399",display:"flex",alignItems:"center",gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Opened top 3 matches in new tabs</div>}

              {/* Loading State */}
              {currentLoading&&(
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {[...Array(5)].map((_,i)=>(
                    <div key={i} style={{padding:"12px 14px",background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,display:"flex",alignItems:"center",gap:14}}>
                      <div className="skel" style={{width:36,height:36,borderRadius:7,flexShrink:0}}/>
                      <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                        <div className="skel" style={{height:12,width:"45%"}}/>
                        <div className="skel" style={{height:10,width:"30%"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Jobs List */}
              {!currentLoading&&(
                <>
                  {paginatedJobs.length>0?(
                    <div className="jobs-list">
                      {paginatedJobs.map(job=>(
                        <JobRow
                          key={job.job_id}
                          job={job}
                          saved={savedJobs.has(job.job_id)}
                          onToggleSave={()=>toggleSave(job.job_id)}
                          onClick={()=>setSelectedJob(job)}
                          onTailor={()=>handleTailor(job)}
                          onInterview={()=>handleInterview(job)}
                          earlyBirdMode={isEbMode}
                          resumeReady={!!resumeText}
                          isTracked={!!trackedApps.find(a=>a.job.job_id===job.job_id)}
                          onTrack={()=>addToTracker(job)}
                          onMatchResume={()=>handleSingleMatch(job)}
                        />
                      ))}
                    </div>
                  ):(
                    <div className="empty-state">
                      <div style={{fontSize:28,marginBottom:12}}>
                        {activeTab==="saved"?"🔖":activeTab==="earlybird"?"⚡":"🔍"}
                      </div>
                      <h3>{activeTab==="saved"?"No saved jobs yet":activeTab==="earlybird"?"No early bird jobs":"Start your search"}</h3>
                      <p>{activeTab==="saved"?"Bookmark jobs to save them here":activeTab==="earlybird"?"Click Early Bird to find freshly posted jobs":"Enter a job role and location above"}</p>
                    </div>
                  )}

                  {totalPages>1&&(
                    <div className="pagination">
                      <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                      {[...Array(Math.min(totalPages,7))].map((_,i)=>{
                        const pg=i+1;
                        return <button key={pg} className={`page-btn${currentPage===pg?" active":""}`} onClick={()=>setCurrentPage(pg)}>{pg}</button>;
                      })}
                      <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      {selectedJob&&<JobModal job={selectedJob} saved={savedJobs.has(selectedJob.job_id)} onToggleSave={()=>toggleSave(selectedJob.job_id)} onClose={()=>setSelectedJob(null)} earlyBirdMode={isEbMode} onAddToTracker={()=>addToTracker(selectedJob)} isTracked={!!trackedApps.find(a=>a.job.job_id===selectedJob.job_id)}/>}
      {tailorJob?.tailor&&<TailorModal job={tailorJob} tailor={tailorJob.tailor} onClose={()=>setTailorJob(null)}/>}
      {interviewJob?.interview&&<InterviewModal job={interviewJob} interview={interviewJob.interview} onClose={()=>setInterviewJob(null)}/>}
      {matchPanelJob&&<ResumeMatchPanel job={matchPanelJob} onClose={()=>setMatchPanelJob(null)} resumeText={resumeText}/>}

      {/* ONBOARDING */}
      {showOnboard&&(
        <div style={{position:"fixed",inset:0,background:"rgba(7,8,10,0.97)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#0C0D11",border:"1px solid #1A1D24",borderRadius:16,padding:36,width:"100%",maxWidth:460,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
              {[1,2,3].map(s=><div key={s} style={{width:28,height:3,borderRadius:3,background:s<=onboardStep?"#6366f1":"#1A1D24",transition:"background .2s"}}/>)}
            </div>
            {onboardStep===1&&<>
              <div style={{width:44,height:44,background:"rgba(99,102,241,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              </div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",marginBottom:6,letterSpacing:"-0.3px"}}>Welcome to Vegaply</h2>
              <p style={{color:"rgba(255,255,255,0.3)",fontSize:13,marginBottom:24,lineHeight:1.6}}>What role are you looking for?</p>
              <input value={onboardRole} onChange={e=>setOnboardRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onboardRole.trim()&&setOnboardStep(2)} placeholder="e.g. Data Analyst, Product Manager" style={{width:"100%",background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",marginBottom:14,fontFamily:"inherit"}}/>
              <button onClick={()=>{if(onboardRole.trim())setOnboardStep(2);}} style={{width:"100%",background:"#6366f1",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
            </>}
            {onboardStep===2&&<>
              <div style={{width:44,height:44,background:"rgba(99,102,241,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              </div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",marginBottom:6,letterSpacing:"-0.3px"}}>Where are you looking?</h2>
              <p style={{color:"rgba(255,255,255,0.3)",fontSize:13,marginBottom:24,lineHeight:1.6}}>Enter your preferred job location.</p>
              <input value={onboardLocation} onChange={e=>setOnboardLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onboardLocation.trim()&&setOnboardStep(3)} placeholder="e.g. New York, US or Remote" style={{width:"100%",background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",marginBottom:14,fontFamily:"inherit"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setOnboardStep(1)} style={{flex:1,background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <button onClick={()=>{if(onboardLocation.trim())setOnboardStep(3);}} style={{flex:2,background:"#6366f1",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
              </div>
            </>}
            {onboardStep===3&&<>
              <div style={{width:44,height:44,background:"rgba(99,102,241,0.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#fff",marginBottom:6,letterSpacing:"-0.3px"}}>Upload your resume</h2>
              <p style={{color:"rgba(255,255,255,0.3)",fontSize:13,marginBottom:24,lineHeight:1.6}}>Upload your PDF for AI matching and auto-apply.</p>
              {onboardParsing&&<div style={{color:"#818cf8",fontSize:12,marginBottom:12}}>Parsing resume…</div>}
              <input id="ob-file-input" type="file" accept=".pdf" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0];if(!file)return;
                setOnboardParsing(true);
                try{
                  if(!(window as any).pdfjsLib){await new Promise<void>((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>res();s.onerror=()=>rej();document.head.appendChild(s);});(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";}
                  const ab=await file.arrayBuffer();const pdf=await (window as any).pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;let text="";
                  for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map((it:any)=>it.str).join(" ")+"\n";}
                  if(text.trim()){setResumeText(text);setResumeFileName(file.name);lsSet("applysmart_resume",text);lsSet("applysmart_resume_name",file.name);const {supabase}=await import("@/lib/supabase");const {data:{user}}=await supabase.auth.getUser();if(user)await supabase.from("resumes").insert({user_id:user.id,title:"Resume",file_name:file.name,resume_text:text});}
                }catch(err){console.error(err);}
                setOnboardParsing(false);completeOnboarding();
              }}/>
              <button onClick={()=>document.getElementById("ob-file-input")?.click()} disabled={onboardParsing} style={{width:"100%",background:"#6366f1",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
                {onboardParsing?"Parsing…":"Upload Resume PDF"}
              </button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setOnboardStep(2)} style={{flex:1,background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <button onClick={completeOnboarding} style={{flex:2,background:"#0D0F14",border:"1px solid #1A1D24",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>Skip for now</button>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* RESUME HISTORY MODAL */}
      {showResumeHistory&&(
        <div onClick={()=>setShowResumeHistory(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(8px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0C0D11",border:"1px solid #1A1D24",borderRadius:12,padding:28,width:"100%",maxWidth:500,maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#fff",letterSpacing:"-0.3px"}}>Resume History</h2>
              <button onClick={()=>setShowResumeHistory(false)} style={{background:"#13151A",border:"1px solid #1A1D24",borderRadius:6,width:26,height:26,cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            {resumeHistory.length===0?<p style={{color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"24px 0",fontSize:12}}>No resumes saved yet</p>:resumeHistory.map((r,i)=>(
              <div key={r.id} style={{background:"#0D0F14",border:`1px solid ${i===0?"rgba(99,102,241,0.2)":"#1A1D24"}`,borderRadius:8,padding:14,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:3}}>{r.file_name}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                  {i===0&&<div style={{fontSize:9,color:"#818cf8",fontWeight:700,marginTop:3,letterSpacing:"0.3px"}}>ACTIVE</div>}
                </div>
                <button onClick={()=>{setResumeText(r.resume_text);setResumeFileName(r.file_name);lsSet("applysmart_resume",r.resume_text);lsSet("applysmart_resume_name",r.file_name);setShowResumeHistory(false);}} style={{background:i===0?"rgba(99,102,241,0.08)":"#6366f1",color:i===0?"#818cf8":"#fff",border:i===0?"1px solid rgba(99,102,241,0.2)":"none",borderRadius:6,padding:"7px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {i===0?"Active":"Use This"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
// cache bust
