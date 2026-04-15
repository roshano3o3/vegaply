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
function scoreColor(s: number) { return s >= 80 ? "#10b981" : s >= 65 ? "#06b6d4" : s >= 50 ? "#f59e0b" : "#ef4444"; }

function getCompetitionLabel(h: number) {
  if (h < 2)  return { label: "🔥 Very Low Competition", color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  if (h < 6)  return { label: "⚡ Still Early", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
  if (h < 12) return { label: "⏰ Act Soon", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)" };
  return { label: "📅 Open", color: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.02)" };
}

function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ, color = scoreColor(score);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)"/>
      <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="800" fill={color} fontFamily="'Inter',sans-serif">{score}</text>
    </svg>
  );
}

// WELCOME TOUR MODAL
function WelcomeTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: "⚡",
      title: "Early Bird Mode",
      desc: "Find jobs posted in the last 24 hours before hundreds of others apply. The earlier you apply, the better your chances.",
      highlight: "Click ⚡ Early Bird in the top bar to activate it."
    },
    {
      icon: "🎯",
      title: "AI Resume Match",
      desc: "Upload your resume PDF and our AI instantly scores how well you match each job — including ATS keywords and skill gaps.",
      highlight: "Click 'Match Resume' on any job card to see your score."
    },
    {
      icon: "✂️",
      title: "Resume Tailoring",
      desc: "AI rewrites your resume bullets to match the exact job description, boosting your ATS score automatically.",
      highlight: "Click 'Tailor Resume' on any job card."
    },
    {
      icon: "🤖",
      title: "Interview Prep",
      desc: "Get AI-generated behavioral and technical questions specific to each job, plus sample answers and red flags to watch for.",
      highlight: "Click 'Interview Prep' on any job card."
    },
    {
      icon: "📋",
      title: "Application Tracker",
      desc: "Track every application with a Kanban board — Applied, Interviewing, Offer, Rejected. Never lose track of where you stand.",
      highlight: "Click the Tracker tab or hit '+' on any job card."
    },
  ];
  const current = steps[step];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(5,8,16,0.97)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(20px)"}}>
      <div style={{background:"#0a0f1e",border:"1px solid rgba(6,182,212,0.2)",borderRadius:20,padding:40,width:"100%",maxWidth:480,textAlign:"center",boxShadow:"0 0 60px rgba(6,182,212,0.08)"}}>
        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:32}}>
          {steps.map((_, i) => (
            <div key={i} style={{height:3,borderRadius:3,transition:"all .3s",background:i===step?"#06b6d4":i<step?"rgba(6,182,212,0.4)":"rgba(255,255,255,0.08)",width:i===step?28:8}}/>
          ))}
        </div>
        <div style={{fontSize:48,marginBottom:16}}>{current.icon}</div>
        <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:10,letterSpacing:"-0.3px"}}>{current.title}</div>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,lineHeight:1.7,marginBottom:16}}>{current.desc}</p>
        <div style={{background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.15)",borderRadius:10,padding:"10px 16px",fontSize:13,color:"#06b6d4",marginBottom:28}}>💡 {current.highlight}</div>
        <div style={{display:"flex",gap:10}}>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>}
          {step < steps.length - 1
            ? <button onClick={()=>setStep(s=>s+1)} style={{flex:2,background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
            : <button onClick={onClose} style={{flex:2,background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Let's Go 🚀</button>
          }
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"rgba(255,255,255,0.25)",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>✕</button>
        </div>
      </div>
    </div>
  );
}

// FLOATING HELP BUTTON + PANEL
function HelpPanel() {
  const [open, setOpen] = useState(false);
  const features = [
    { icon:"⚡", name:"Early Bird", desc:"Jobs posted < 24h ago — low competition" },
    { icon:"🎯", name:"Match Resume", desc:"AI scores your resume vs job (ATS + skills)" },
    { icon:"✂️", name:"Tailor Resume", desc:"AI rewrites your bullets for the job" },
    { icon:"🤖", name:"Interview Prep", desc:"AI questions + sample answers per job" },
    { icon:"📋", name:"Tracker", desc:"Kanban board to track all applications" },
    { icon:"📊", name:"Analytics", desc:"Your response rate, funnel & stats" },
    { icon:"🔔", name:"Gmail Alert", desc:"Email yourself today's top jobs" },
    { icon:"🚀", name:"Auto-Apply", desc:"Match + open top 3 jobs automatically" },
  ];
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:24,right:24,width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",cursor:"pointer",fontSize:18,color:"#fff",zIndex:400,boxShadow:"0 4px 20px rgba(6,182,212,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,transition:"transform .2s"}} title="Feature Guide">?</button>
      {open && (
        <div style={{position:"fixed",bottom:76,right:24,width:300,background:"#0a0f1e",border:"1px solid rgba(6,182,212,0.2)",borderRadius:16,padding:16,zIndex:400,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"su .18s ease"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#06b6d4",marginBottom:14,letterSpacing:"0.3px"}}>FEATURE GUIDE</div>
          {features.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<features.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <span style={{fontSize:16,flexShrink:0}}>{f.icon}</span>
              <div><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.75)"}}>{f.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>{f.desc}</div></div>
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{width:"100%",marginTop:12,background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.15)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,color:"#06b6d4",cursor:"pointer",fontFamily:"inherit"}}>Close</button>
        </div>
      )}
    </>
  );
}

function ResumeMatchPanel({ job, onClose, resumeText }: { job: JobWithMatch; onClose: () => void; resumeText: string }) {
  const [matchResult, setMatchResult] = useState<MatchResult | null>(job.match || null);
  const [loading, setLoading] = useState(false);
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
  useEffect(() => { if (resumeText && !matchResult && !loading) runMatch(); }, []);
  const color = matchResult ? scoreColor(matchResult.matchScore) : "#06b6d4";
  return (
    <div className="overlay" onClick={onClose} style={{zIndex:250}}>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,background:"#070c19",borderLeft:"1px solid rgba(6,182,212,0.12)",padding:24,overflowY:"auto",display:"flex",flexDirection:"column",gap:16,animation:"slideIn .25s ease",zIndex:251}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Resume Analysis</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>{job.job_title} · {job.employer_name}</div></div>
          <button className="modal-close" style={{position:"static"}} onClick={onClose}>✕</button>
        </div>
        {!resumeText&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Upload your resume first</div></div>}
        {resumeText&&loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",gap:14}}><div className="spin" style={{width:32,height:32}}/><div style={{fontSize:13,color:"#06b6d4"}}>Analyzing your resume…</div></div>}
        {resumeText&&!loading&&matchResult&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14,background:`${color}0d`,border:`1px solid ${color}25`,borderRadius:14,padding:"16px 18px"}}>
              <ScoreRing score={matchResult.matchScore}/>
              <div><div style={{fontSize:18,fontWeight:800,color,letterSpacing:"-0.5px"}}>{matchResult.matchLabel} Match</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:3,lineHeight:1.5}}>{matchResult.matchSummary}</div></div>
            </div>
            {matchResult.matchedSkills.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#10b981",marginBottom:8}}>✅ Strengths</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{matchResult.matchedSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:6,background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.15)"}}>{s}</span>)}</div></div>}
            {matchResult.missingSkills.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#ef4444",marginBottom:8}}>⚠️ Gaps</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{matchResult.missingSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.15)"}}>{s}</span>)}</div></div>}
            <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"rgba(245,158,11,0.8)",lineHeight:1.6}}>{matchResult.missingSkills.length>0?`💡 Highlight experience with ${matchResult.missingSkills[0]} to improve your score.`:"💡 Great match! Personalize your cover letter for best results."}</div>
            {job.job_apply_link&&<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{textAlign:"center",display:"block",textDecoration:"none"}}>{isHot(job.job_posted_at_datetime_utc)?"⚡ Apply Now — Beat the Rush!":"Apply Now →"}</a>}
          </div>
        )}
        {resumeText&&!loading&&!matchResult&&<div style={{textAlign:"center",padding:"32px 20px"}}><button className="gradient-btn" onClick={runMatch}>🔍 Analyze Match</button></div>}
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
      if (!text.trim()) { setError("Could not extract text."); setParsing(false); return; }
      onResume(text, file.name);
    } catch { setError("Failed to parse PDF."); }
    setParsing(false);
  };
  if (resumeText) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.18)",borderRadius:10,padding:"10px 12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:26,height:26,background:"rgba(16,185,129,0.12)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div><div style={{fontSize:11,fontWeight:700,color:"#10b981"}}>Resume loaded</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:1,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</div></div>
      </div>
      <button className="ghost-btn" onClick={onClear} style={{fontSize:10}}>Change</button>
    </div>
  );
  return (
    <div className={`resume-drop${dragging?" dragging":""}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onClick={()=>inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
      {parsing?<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#06b6d4"}}><div className="spin"/>Parsing…</div>:(<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(6,182,212,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.3)",marginTop:6}}>Drop resume PDF here</div><div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:2}}>or click to browse</div>{error&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{error}</div>}</>)}
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
      <div className="modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div style={{width:48,height:48,background:"rgba(6,182,212,0.08)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24}}>🤖</div>
          <div><h2 className="modal-title">Interview Prep</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div>
        </div>
        {interview.keyThemes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{interview.keyThemes.map((t,i)=><span key={i} style={{background:"rgba(6,182,212,0.08)",color:"#06b6d4",fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:6,border:"1px solid rgba(6,182,212,0.15)"}}>{t}</span>)}</div>}
        <div className="modal-tabs">
          {[["behavioral",`💬 Behavioral (${allB.length})`],["technical",`⚙️ Technical (${allT.length})`],["ask","🙋 Ask Them"],["tips","⚠️ Watch Out"]].map(([k,label])=>(
            <button key={k} className={`mtab${tab===k?" active":""}`} onClick={()=>{setTab(k as any);setExpanded(null);}}>{label}</button>
          ))}
        </div>
        {(tab==="behavioral"||tab==="technical")&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
            {(tab==="behavioral"?allB:allT).map((q,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${expanded===i?"rgba(6,182,212,0.25)":"rgba(255,255,255,0.06)"}`,borderRadius:8,padding:14,cursor:"pointer"}} onClick={()=>setExpanded(expanded===i?null:i)}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:9,fontWeight:700,background:"rgba(6,182,212,0.08)",color:"#06b6d4",padding:"3px 8px",borderRadius:4,whiteSpace:"nowrap",flexShrink:0,marginTop:1}}>{q.category}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.7)",lineHeight:1.4}}>{q.question}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",flexShrink:0}}>{expanded===i?"▲":"▼"}</span>
                </div>
                {expanded===i&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.06)",borderRadius:6,padding:"8px 10px",marginBottom:10}}>💡 {q.tip}</div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:"rgba(255,255,255,0.2)",marginBottom:6}}>Sample Answer</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.6,background:"rgba(255,255,255,0.02)",borderRadius:6,padding:"10px 12px"}}>{q.sampleAnswer}</div>
                </div>}
              </div>
            ))}
          </div>
        )}
        {tab==="ask"&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>{interview.questionsToAsk?.map((q,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,background:"rgba(6,182,212,0.04)",borderRadius:8,padding:14,border:"1px solid rgba(6,182,212,0.1)"}}><span style={{width:22,height:22,background:"rgba(6,182,212,0.15)",color:"#06b6d4",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</span><span style={{fontSize:13,color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>{q}</span></div>)}</div>}
        {tab==="tips"&&<div style={{marginTop:12}}>{interview.redFlags?.map((r,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(239,68,68,0.05)",borderRadius:8,padding:12,marginBottom:8,border:"1px solid rgba(239,68,68,0.1)"}}><span>⚠️</span><span style={{fontSize:13,color:"rgba(255,255,255,0.45)"}}>{r}</span></div>)}</div>}
      </div>
    </div>
  );
}

function TailorModal({ job, tailor, onClose }: { job: Job; tailor: TailorResult; onClose: () => void }) {
  const [copied,setCopied]=useState<number|null>(null);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head"><div style={{fontSize:32}}>✂️</div><div><h2 className="modal-title">Resume Tailored</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div></div>
        {tailor.atsTip&&<div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:8,padding:"12px 14px",fontSize:13,color:"rgba(245,158,11,0.8)",marginBottom:16,lineHeight:1.6}}>💡 <strong>ATS Tip:</strong> {tailor.atsTip}</div>}
        {tailor.keywordsAdded?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Keywords to include</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tailor.keywordsAdded.map((k,i)=><span key={i} style={{background:"rgba(6,182,212,0.08)",color:"#06b6d4",fontSize:12,fontWeight:500,padding:"4px 10px",borderRadius:6}}>{k}</span>)}</div></div>}
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:10}}>Tailored bullet points</div>
        {tailor.tailoredBullets?.map((b,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:14,marginBottom:12,border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.25)",lineHeight:1.5,marginBottom:6}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(255,255,255,0.18)",display:"block",marginBottom:2}}>ORIGINAL</span>{b.original}</div>
            <div style={{fontSize:12,color:"rgba(6,182,212,0.35)",textAlign:"center",margin:"4px 0"}}>↓</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,background:"rgba(16,185,129,0.06)",borderRadius:6,padding:"10px 12px"}}>
              <div><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(16,185,129,0.5)",display:"block",marginBottom:2}}>TAILORED</span><span style={{fontSize:13,color:"#10b981",fontWeight:500,lineHeight:1.5}}>{b.tailored}</span></div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:0.5,flexShrink:0,color:"#fff"}} onClick={()=>{navigator.clipboard.writeText(b.tailored);setCopied(i);setTimeout(()=>setCopied(null),2000);}}>{copied===i?"✓":"📋"}</button>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.2)",marginTop:8,fontStyle:"italic"}}>{b.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JobModal({ job, saved, onToggleSave, onClose, earlyBirdMode, onAddToTracker, isTracked }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClose:()=>void;earlyBirdMode:boolean;onAddToTracker:()=>void;isTracked:boolean;
}) {
  const [tab,setTab]=useState<"overview"|"cover">("overview");const [copied,setCopied]=useState(false);
  const loc=[job.job_city,job.job_state,job.job_country].filter(Boolean).join(", ");
  const badge=empBadge(job.job_employment_type);const hot=isHot(job.job_posted_at_datetime_utc);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {earlyBirdMode&&hot&&<div style={{background:"linear-gradient(135deg,rgba(239,68,68,0.1),rgba(245,158,11,0.1))",border:"1px solid rgba(245,158,11,0.18)",color:"#f59e0b",borderRadius:8,padding:"10px 14px",fontSize:13,fontWeight:600,marginBottom:16,textAlign:"center"}}>🔥 Posted less than 6 hours ago — be among the first!</div>}
        <div className="modal-head">
          <div className="modal-logo">{job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>:<span style={{fontSize:20,fontWeight:700,color:"rgba(255,255,255,0.25)"}}>{job.employer_name?.[0]??"?"}</span>}</div>
          <div style={{flex:1}}><h2 className="modal-title">{job.job_title}</h2><p className="modal-sub">{job.employer_name}</p><p style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:2}}>{job.job_is_remote?"🌐 Remote":loc||"Location not specified"}</p></div>
          {job.match&&<div style={{textAlign:"center",flexShrink:0}}><ScoreRing score={job.match.matchScore}/><div style={{fontSize:11,color:scoreColor(job.match.matchScore),fontWeight:600,marginTop:2}}>{job.match.matchLabel}</div></div>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {badge&&<span className="badge badge-type">{badge}</span>}
          {job.job_is_remote&&<span className="badge badge-remote">Remote</span>}
          <span className="badge badge-time">{timeAgo(job.job_posted_at_datetime_utc)}</span>
          {(job.job_min_salary||job.job_max_salary)&&<span className="badge badge-salary">💰 {job.job_salary_currency??"$"}{job.job_min_salary?.toLocaleString()}–{job.job_max_salary?.toLocaleString()}</span>}
        </div>
        {job.match&&(
          <>
            <div className="modal-tabs" style={{marginTop:16}}>
              <button className={`mtab${tab==="overview"?" active":""}`} onClick={()=>setTab("overview")}>📊 Match Analysis</button>
              <button className={`mtab${tab==="cover"?" active":""}`} onClick={()=>setTab("cover")}>✉️ Cover Letter</button>
            </div>
            {tab==="overview"&&<div style={{marginBottom:16}}><p style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.7,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:14,marginBottom:14}}>{job.match.matchSummary}</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div><div style={{fontSize:12,fontWeight:600,color:"#10b981",marginBottom:8}}>✅ Matched</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{job.match.matchedSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:6,background:"rgba(16,185,129,0.08)",color:"#10b981"}}>{s}</span>)}</div></div><div><div style={{fontSize:12,fontWeight:600,color:"#ef4444",marginBottom:8}}>⚠️ Gaps</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{job.match.missingSkills.length>0?job.match.missingSkills.map((s,i)=><span key={i} style={{fontSize:11,fontWeight:500,padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",color:"#ef4444"}}>{s}</span>):<span style={{fontSize:12,color:"#10b981",fontStyle:"italic"}}>No major gaps!</span>}</div></div></div></div>}
            {tab==="cover"&&<div><div style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.75,whiteSpace:"pre-wrap",background:"rgba(255,255,255,0.02)",borderRadius:8,padding:16,maxHeight:280,overflowY:"auto",border:"1px solid rgba(255,255,255,0.05)"}}>{job.match.coverLetter}</div><button className="ghost-btn" style={{marginTop:10}} onClick={()=>{if(job.match?.coverLetter){navigator.clipboard.writeText(job.match.coverLetter);setCopied(true);setTimeout(()=>setCopied(false),2000);}}}>{copied?"✓ Copied!":"📋 Copy"}</button></div>}
          </>
        )}
        {!job.match&&(
          <>
            {job.job_highlights?.Responsibilities&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Responsibilities</div><ul style={{paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{job.job_highlights.Responsibilities.slice(0,5).map((r,i)=><li key={i} style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.55}}>{r}</li>)}</ul></div>}
            {job.job_highlights?.Qualifications&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Qualifications</div><ul style={{paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{job.job_highlights.Qualifications.slice(0,5).map((q,i)=><li key={i} style={{fontSize:13,color:"rgba(255,255,255,0.4)",lineHeight:1.55}}>{q}</li>)}</ul></div>}
            {job.job_description&&!job.job_highlights?.Responsibilities&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>About this role</div><p style={{fontSize:13,color:"rgba(255,255,255,0.35)",lineHeight:1.7}}>{job.job_description.slice(0,800)}...</p></div>}
          </>
        )}
        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:20,paddingTop:18,borderTop:"1px solid rgba(255,255,255,0.05)",flexWrap:"wrap"}}>
          <button className="ghost-btn" style={{display:"flex",alignItems:"center",gap:8}} onClick={onToggleSave}>{saved?"🔖 Saved":"Save"}</button>
          <button className={`ghost-btn${isTracked?" btn-tracked":""}`} onClick={onAddToTracker}>{isTracked?"✓ Tracking":"+ Track"}</button>
          {job.job_apply_link&&<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className={`apply-btn${hot&&earlyBirdMode?" apply-btn-hot":""}`} style={{textDecoration:"none"}}>{hot&&earlyBirdMode?"⚡ Apply Now!":"Apply Now →"}</a>}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ apps, savedCount, totalSearched }: { apps: TrackedApp[]; savedCount: number; totalSearched: number }) {
  const sc: Record<AppStatus,number> = {Applied:0,Interviewing:0,Offer:0,Rejected:0};
  apps.forEach(a=>{sc[a.status]=(sc[a.status]||0)+1;});
  const rr = apps.length>0?Math.round(((sc.Interviewing+sc.Offer)/apps.length)*100):0;
  const cards = [{label:"Total Applied",value:apps.length,color:"#06b6d4",icon:"📋"},{label:"Interviewing",value:sc.Interviewing,color:"#f59e0b",icon:"🎯"},{label:"Offers",value:sc.Offer,color:"#10b981",icon:"🎉"},{label:"Response Rate",value:`${rr}%`,color:"#0ea5e9",icon:"📈"}];
  const funnel = [{label:"Jobs Scanned",count:totalSearched,color:"rgba(255,255,255,0.15)"},{label:"Saved",count:savedCount,color:"#06b6d4"},{label:"Applied",count:sc.Applied+sc.Interviewing+sc.Offer+sc.Rejected,color:"#f59e0b"},{label:"Offers",count:sc.Offer,color:"#10b981"}];
  const mx = Math.max(funnel[0].count,1);
  const sc2: Record<AppStatus,string> = {Applied:"#06b6d4",Interviewing:"#f59e0b",Offer:"#10b981",Rejected:"#ef4444"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {cards.map((c,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${c.color}20`,borderRadius:12,padding:20,textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
            <div style={{fontSize:30,fontWeight:800,color:c.color,marginBottom:4,fontFamily:"'Inter',sans-serif"}}>{c.value}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:16,textTransform:"uppercase",letterSpacing:"0.5px"}}>Application Funnel</div>
        {funnel.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<funnel.length-1?12:0}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",width:100,flexShrink:0}}>{f.label}</div>
            <div style={{flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${(f.count/mx)*100}%`,background:f.color,borderRadius:6,transition:"width .6s ease"}}/></div>
            <div style={{fontWeight:700,fontSize:13,color:f.color,width:24,textAlign:"right"}}>{f.count}</div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:16,textTransform:"uppercase",letterSpacing:"0.5px"}}>Status Breakdown</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {(Object.entries(sc) as [AppStatus,number][]).map(([s,c])=>(
            <div key={s} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${sc2[s]}20`,borderRadius:8,padding:14,textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,color:sc2[s]}}>{c}</div>
              <div style={{fontSize:11,fontWeight:500,color:sc2[s],marginTop:3,opacity:0.7}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
      {apps.length===0&&<div style={{textAlign:"center",padding:"48px 24px",background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px dashed rgba(255,255,255,0.06)"}}><div style={{fontSize:36,marginBottom:14}}>📊</div><h3 style={{fontSize:16,color:"rgba(255,255,255,0.4)",marginBottom:8}}>No data yet</h3><p style={{fontSize:13,color:"rgba(255,255,255,0.2)"}}>Start tracking applications to see your analytics here.</p></div>}
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
  if(sent)return(<div className="sidebar-card" style={{textAlign:"center"}}><div style={{fontSize:22,marginBottom:6}}>✅</div><div style={{fontSize:12,fontWeight:600,color:"#10b981"}}>Alert sent!</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:3,marginBottom:10}}>{email}</div><button className="ghost-btn" onClick={()=>setSent(false)}>Send another</button></div>);
  return(
    <div className="sidebar-card">
      <div className="sidebar-card-title">🔔 Gmail Alert</div>
      <div className="sidebar-card-sub">Email yourself today's top jobs</div>
      <input className="dark-input" type="email" placeholder="you@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
      {error&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{error}</div>}
      <button className="gradient-btn" onClick={send} disabled={sending||!jobs.length} style={{marginTop:10}}>{sending?<><div className="spin-sm"/>Sending…</>:`📧 Send ${jobs.length} Jobs`}</button>
    </div>
  );
}

function TrackerView({ apps, onUpdateStatus, onUpdateNotes, onRemove }: { apps: TrackedApp[]; onUpdateStatus: (id:string,s:AppStatus)=>void; onUpdateNotes: (id:string,n:string)=>void; onRemove: (id:string)=>void }) {
  const cols: Record<AppStatus,{color:string;border:string}> = {Applied:{color:"#06b6d4",border:"rgba(6,182,212,0.2)"},Interviewing:{color:"#f59e0b",border:"rgba(245,158,11,0.2)"},Offer:{color:"#10b981",border:"rgba(16,185,129,0.2)"},Rejected:{color:"#ef4444",border:"rgba(239,68,68,0.2)"}};
  if(apps.length===0)return<div style={{textAlign:"center",padding:"64px 24px",background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px dashed rgba(255,255,255,0.06)"}}><div style={{fontSize:36,marginBottom:14}}>📋</div><h3 style={{fontSize:16,color:"rgba(255,255,255,0.4)",marginBottom:8}}>No applications tracked yet</h3><p style={{fontSize:13,color:"rgba(255,255,255,0.2)"}}>Click "+" on any job card to track it here.</p></div>;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",alignItems:"center",gap:20,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px 24px",flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}><span style={{fontSize:26,fontWeight:800,color:"#fff",display:"block"}}>{apps.length}</span><span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>Total</span></div>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
          <><div key={s+"d"} style={{width:1,height:32,background:"rgba(255,255,255,0.06)"}}/><div key={s} style={{textAlign:"center"}}><span style={{fontSize:26,fontWeight:800,color:cols[s].color,display:"block"}}>{apps.filter(a=>a.status===s).length}</span><span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{s}</span></div></>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(col=>(
          <div key={col} style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:11,fontWeight:700,padding:"7px 12px",borderRadius:6,border:`1.5px solid ${cols[col].border}`,color:cols[col].color,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{col}<span style={{fontSize:15,fontWeight:800}}>{apps.filter(a=>a.status===col).length}</span></div>
            {apps.filter(a=>a.status===col).map(app=>(
              <div key={app.id} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:12,border:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:6,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.03)",flexShrink:0}}>{app.job.employer_logo?<img src={app.job.employer_logo} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)"}}>{app.job.employer_name?.[0]}</span>}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.job.job_title}</div><div style={{fontSize:10,color:"#06b6d4",marginTop:1}}>{app.job.employer_name}</div></div>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.15)",fontSize:11}} onClick={()=>onRemove(app.id)}>✕</button>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.18)"}}>Added {new Date(app.appliedDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {(["Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
                    <button key={s} style={{flex:1,minWidth:55,padding:"3px 2px",border:`1px solid ${app.status===s?cols[s].border:"rgba(255,255,255,0.05)"}`,borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",background:app.status===s?cols[s].border:"transparent",color:app.status===s?cols[s].color:"rgba(255,255,255,0.2)",fontFamily:"inherit"}} onClick={()=>onUpdateStatus(app.id,s)}>{s}</button>
                  ))}
                </div>
                <textarea style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"inherit",resize:"none",outline:"none",color:"rgba(255,255,255,0.4)"}} placeholder="Add notes…" value={app.notes} onChange={e=>onUpdateNotes(app.id,e.target.value)} rows={2}/>
                {app.job.job_apply_link&&<a href={app.job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#06b6d4",fontWeight:600,textDecoration:"none"}}>View Job →</a>}
              </div>
            ))}
            {apps.filter(a=>a.status===col).length===0&&<div style={{textAlign:"center",padding:20,color:"rgba(255,255,255,0.12)",fontSize:11,background:"rgba(255,255,255,0.01)",borderRadius:6,border:"1px dashed rgba(255,255,255,0.05)"}}>No {col.toLowerCase()} yet</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// JOB CARD — 2x3 grid, highlighted Match + Prep
function JobCard({ job, saved, onToggleSave, onClick, onTailor, onInterview, earlyBirdMode, resumeReady, isTracked, onTrack, onMatchResume }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClick:()=>void;onTailor:()=>void;onInterview:()=>void;earlyBirdMode:boolean;resumeReady:boolean;isTracked:boolean;onTrack:()=>void;onMatchResume:()=>void;
}) {
  const loc=[job.job_city,job.job_state].filter(Boolean).join(", ")||job.job_country||"";
  const badge=empBadge(job.job_employment_type);
  const hot=isHot(job.job_posted_at_datetime_utc);
  const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  const comp=getCompetitionLabel(hours);

  return(
    <div className={`job-card${hot&&earlyBirdMode?" job-card-hot":""}`} style={{display:"flex",flexDirection:"column",gap:12,position:"relative",overflow:"hidden"}}>
      {/* HOT BANNER */}
      {hot&&earlyBirdMode&&<div style={{position:"absolute",top:0,left:0,right:0,background:"linear-gradient(135deg,rgba(239,68,68,0.65),rgba(245,158,11,0.65))",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",textAlign:"center",letterSpacing:".3px"}}>🔥 HOT — under 6h old</div>}

      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginTop:hot&&earlyBirdMode?18:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}} onClick={onClick}>
          <div style={{width:42,height:42,borderRadius:8,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.03)",flexShrink:0}}>
            {job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:17,fontWeight:700,color:"rgba(6,182,212,0.5)"}}>{job.employer_name?.[0]??"?"}</span>}
          </div>
          <div style={{minWidth:0}}>
            <h3 style={{fontSize:14,fontWeight:700,color:"#fff",lineHeight:1.3,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.job_title}</h3>
            <p style={{fontSize:12,color:"#06b6d4",fontWeight:500,marginBottom:1}}>{job.employer_name}</p>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{job.job_is_remote?"🌐 Remote":loc||"Location not specified"}</p>
          </div>
        </div>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.5,flexShrink:0}} onClick={e=>{e.stopPropagation();onToggleSave();}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved?"#06b6d4":"none"} stroke={saved?"#06b6d4":"rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </button>
      </div>

      {/* COMPETITION + TIME ROW */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:6,background:comp.bg,border:`1px solid ${comp.color}18`}}>
          <span style={{fontSize:10,fontWeight:700,color:comp.color}}>{comp.label}</span>
        </div>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
      </div>

      {/* MATCH SCORE (if available) */}
      {(job.match||job.matchLoading)&&(
        <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:8,padding:"8px 12px",border:`1px solid ${job.match?scoreColor(job.match.matchScore)+"22":"rgba(6,182,212,0.15)"}`,background:job.match?scoreColor(job.match.matchScore)+"07":"rgba(6,182,212,0.04)"}}>
          {job.matchLoading?<><div className="spin-sm"/><span style={{fontSize:11,color:"#06b6d4"}}>Analyzing…</span></>:<><ScoreRing score={job.match!.matchScore}/><div><div style={{fontSize:12,fontWeight:700,color:scoreColor(job.match!.matchScore)}}>{job.match!.matchLabel} Match — {job.match!.matchScore}%</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:1}}>{job.match!.matchedSkills.slice(0,2).join(" · ")}</div></div></>}
        </div>
      )}

      {/* NO RESUME PLACEHOLDER */}
      {!job.match&&!job.matchLoading&&!resumeReady&&(
        <div style={{display:"flex",alignItems:"center",gap:8,borderRadius:8,padding:"7px 12px",border:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.02)"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>-- Match</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.15)"}}>· Upload resume to see your score</span>
        </div>
      )}

      {/* BADGES */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {badge&&<span className="badge badge-type">{badge}</span>}
        {job.job_is_remote&&<span className="badge badge-remote">Remote</span>}
        {(job.job_min_salary||job.job_max_salary)&&<span className="badge badge-salary">💰 {job.job_salary_currency??"$"}{job.job_min_salary?.toLocaleString()}–{job.job_max_salary?.toLocaleString()}</span>}
      </div>

      {/* ACTION BUTTONS — Match & Prep highlighted */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:10,display:"flex",gap:5,flexWrap:"wrap"}}>
        {/* MATCH — PRIMARY HIGHLIGHT */}
        <button className={`action-card-btn match-btn${job.match?" done":""}`} onClick={e=>{e.stopPropagation();onMatchResume();}} disabled={job.matchLoading} title="AI scores your resume vs this job">
          {job.matchLoading?<><div className="spin-sm"/>Matching…</>:job.match?`✓ ${job.match.matchScore}% Match`:"🎯 Match Resume"}
        </button>
        {/* PREP — SECONDARY HIGHLIGHT */}
        <button className={`action-card-btn interview-btn${job.interview?" done":""}`} onClick={e=>{e.stopPropagation();onInterview();}} disabled={job.interviewLoading} title="AI interview questions for this job">
          {job.interviewLoading?<><div className="spin-sm"/>Loading…</>:job.interview?"✓ Prep Done":"🤖 Prep"}
        </button>
        <button className={`action-card-btn tailor-btn${job.tailor?" done":""}`} onClick={e=>{e.stopPropagation();onTailor();}} disabled={job.tailorLoading} title="AI tailors your resume bullets">
          {job.tailorLoading?<><div className="spin-sm"/>Tailoring…</>:job.tailor?"✓ Tailored":"✂️ Tailor"}
        </button>
        <button className={`action-card-btn track-btn${isTracked?" tracked":""}`} onClick={e=>{e.stopPropagation();onTrack();}} title="Add to application tracker">
          {isTracked?"✓":"+ Track"}
        </button>
      </div>

      {/* APPLY BUTTON */}
      {job.job_apply_link&&(
        <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className={`apply-btn${hot&&earlyBirdMode?" apply-btn-hot":""}`} style={{textDecoration:"none",textAlign:"center",display:"block",fontSize:12}} onClick={e=>e.stopPropagation()}>
          {hot&&earlyBirdMode?"⚡ Apply Now — Beat the Rush!":"Apply Now →"}
        </a>
      )}
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
  const [showWelcomeTour,setShowWelcomeTour]=useState(false);
  const [onboardStep,setOnboardStep]=useState(1);
  const [onboardRole,setOnboardRole]=useState("");
  const [onboardLocation,setOnboardLocation]=useState("");
  const [onboardParsing,setOnboardParsing]=useState(false);
  const [showOnboard,setShowOnboard]=useState(false);
  const [showResumeHistory,setShowResumeHistory]=useState(false);
  const [resumeHistory,setResumeHistory]=useState<{id:string;file_name:string;created_at:string;resume_text:string}[]>([]);

  const lsGet=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");return localStorage.getItem(uid?`${key}_${uid}`:key);};
  const lsSet=(key:string,val:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.setItem(uid?`${key}_${uid}`:key,val);};
  const lsRemove=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.removeItem(uid?`${key}_${uid}`:key);localStorage.removeItem(key);};

  useEffect(()=>{
    setMounted(true);
    const savedRole=localStorage.getItem("applysmart_jobRole");
    const savedLocation=localStorage.getItem("applysmart_location");
    if(savedRole)setJobRole(savedRole);
    if(savedLocation)setLocation(savedLocation);
    if(savedRole&&savedLocation){
      setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
      fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole:savedRole,location:savedLocation,earlyBird:false})})
        .then(r=>r.json()).then(data=>setJobs(data?.data||[])).catch(console.error)
        .finally(()=>setLoading(false));
      setLoading(true);setJobs([]);
    }
    import("@/lib/supabase").then(({supabase})=>{
      supabase.auth.getUser().then(({data})=>{
        if(data.user?.email)setUserEmail(data.user.email);
        const uid=data.user?.id;
        if(uid){
          localStorage.setItem("applysmart_user_id",uid);
          const onboarded=localStorage.getItem(`applysmart_onboarded_${uid}`);
          if(!onboarded)setShowOnboard(true);
          // Show welcome tour separately from onboarding
          const toured=localStorage.getItem(`applysmart_toured_${uid}`);
          if(!toured)setShowWelcomeTour(false); // will show after onboarding
        }
      });
    });
    import("@/lib/supabase").then(({supabase})=>{
      supabase.auth.getUser().then(async({data})=>{
        const currentUserId=data?.user?.id;
        const storedUserId=localStorage.getItem("applysmart_user_id");
        if(!currentUserId)return;
        if(storedUserId&&storedUserId!==currentUserId){lsRemove("applysmart_resume");lsRemove("applysmart_resume_name");setResumeText("");setResumeFileName("");}
        else{
          const savedResume=lsGet("applysmart_resume");
          const savedFileName=lsGet("applysmart_resume_name");
          if(savedResume&&savedFileName){setResumeText(savedResume);setResumeFileName(savedFileName);}
          else{
            const{data:rd}=await supabase.from("resumes").select("resume_text,file_name").eq("user_id",currentUserId).order("created_at",{ascending:false}).limit(1).single();
            if(rd?.resume_text){setResumeText(rd.resume_text);setResumeFileName(rd.file_name??"Resume");lsSet("applysmart_resume",rd.resume_text);lsSet("applysmart_resume_name",rd.file_name??"Resume");}
          }
        }
        localStorage.setItem("applysmart_user_id",currentUserId);
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
    localStorage.setItem("applysmart_jobRole",jobRole);
    localStorage.setItem("applysmart_location",location);
    setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
    await fetchJobs("normal");
  };
  const handleEarlyBirdSearch=async()=>{
    if(!jobRole||!location){alert("Please enter job role and location first");return;}
    localStorage.setItem("applysmart_jobRole",jobRole);
    localStorage.setItem("applysmart_location",location);
    setHasSearched(true);setActiveTab("earlybird");setCurrentPage(1);
    await fetchJobs("earlybird");
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

  const handleSingleMatch=async(job:JobWithMatch)=>{setMatchPanelJob(job);};

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
  const hotCount=earlyBirdJobs.filter(j=>isHot(j.job_posted_at_datetime_utc)).length;
  const totalPages=Math.ceil(displayJobs.length/JOBS_PER_PAGE);
  const paginatedJobs=displayJobs.slice((currentPage-1)*JOBS_PER_PAGE,currentPage*JOBS_PER_PAGE);
  const currentLoading=isEbMode?ebLoading:loading;
  const allJobs=[...jobs,...earlyBirdJobs];
  const totalSearched=allJobs.length;

  const completeOnboarding=async()=>{
    const uid=localStorage.getItem("applysmart_user_id");
    if(uid){
      localStorage.setItem(`applysmart_onboarded_${uid}`,"true");
      // Show feature tour after onboarding
      const toured=localStorage.getItem(`applysmart_toured_${uid}`);
      if(!toured){setShowWelcomeTour(true);}
    }
    if(onboardRole)setJobRole(onboardRole);
    if(onboardLocation)setLocation(onboardLocation);
    setShowOnboard(false);
  };

  const closeTour=()=>{
    const uid=localStorage.getItem("applysmart_user_id");
    if(uid)localStorage.setItem(`applysmart_toured_${uid}`,"true");
    setShowWelcomeTour(false);
  };

  const loadResumeHistory=async()=>{
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const{data}=await supabase.from("resumes").select("id,file_name,created_at,resume_text").eq("user_id",user.id).order("created_at",{ascending:false});
    if(data)setResumeHistory(data as any[]);
    setShowResumeHistory(true);
  };

  const handleLogout=async()=>{
    const{supabase}=await import("@/lib/supabase");
    await supabase.auth.signOut();
    lsRemove("applysmart_resume");lsRemove("applysmart_resume_name");lsRemove("applysmart_onboarded");
    localStorage.removeItem("applysmart_user_id");
    window.location.href="/login";
  };

  const avatarLetter=userEmail?userEmail[0].toUpperCase():"?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#050810;color:#fff;min-height:100vh}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(6,182,212,0.12);border-radius:4px}

        /* TOPBAR */
        .topbar{background:rgba(5,8,16,0.96);border-bottom:1px solid rgba(6,182,212,0.08);padding:0 24px;height:56px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:200;backdrop-filter:blur(20px)}
        .topbar-logo{font-size:18px;font-weight:800;color:#fff;letter-spacing:"-0.5px";flex-shrink:0;margin-right:4px;font-family:'Inter',sans-serif}
        .topbar-logo span{color:#06b6d4}
        .topbar-search{display:flex;align-items:center;gap:8px;flex:1;max-width:560px}
        .topbar-input{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:8px 12px;font-size:12px;font-family:inherit;color:#fff;outline:none;transition:all .15s;flex:1}
        .topbar-input::placeholder{color:rgba(255,255,255,0.18)}
        .topbar-input:focus{border-color:rgba(6,182,212,0.35);background:rgba(6,182,212,0.04)}
        .search-btn{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:opacity .15s;letter-spacing:"0.2px"}
        .search-btn:hover{opacity:0.88}
        .search-btn:disabled{opacity:0.35;cursor:not-allowed}
        .eb-btn{background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.18);border-radius:7px;padding:8px 16px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:all .15s}
        .eb-btn:hover{background:rgba(245,158,11,0.14)}
        .eb-btn:disabled{opacity:0.35;cursor:not-allowed}
        .topbar-right{display:flex;align-items:center;gap:10px;margin-left:auto;flex-shrink:0}
        .nav-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;letter-spacing:"0.2px"}
        .pill-eb{background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.18)}
        .pill-tracker{background:rgba(6,182,212,0.08);color:#06b6d4;border:1px solid rgba(6,182,212,0.18)}
        .user-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .logout-btn{font-size:11px;font-weight:500;color:rgba(255,255,255,0.25);background:none;border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit;transition:all .2s}
        .logout-btn:hover{color:#ef4444;border-color:rgba(239,68,68,0.25)}

        /* LAYOUT */
        .app-layout{display:flex;min-height:calc(100vh - 56px)}
        .sidebar{width:220px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.05);padding:16px 12px;display:flex;flex-direction:column;gap:10px;position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto}
        .content{flex:1;min-width:0;padding:20px 22px;max-width:calc(100vw - 220px)}

        /* SIDEBAR */
        .sidebar-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px}
        .sidebar-card-title{font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);margin-bottom:3px;letter-spacing:"0.1px"}
        .sidebar-card-sub{font-size:10px;color:rgba(255,255,255,0.22);margin-bottom:9px}
        .resume-drop{border:1.5px dashed rgba(6,182,212,0.18);border-radius:8px;padding:16px 10px;text-align:center;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:3px}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(6,182,212,0.45);background:rgba(6,182,212,0.04)}
        .dark-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:8px 10px;font-size:12px;font-family:inherit;color:#fff;outline:none;transition:all .2s;margin-bottom:5px}
        .dark-input::placeholder{color:rgba(255,255,255,0.18)}
        .dark-input:focus{border-color:rgba(6,182,212,0.35)}
        .gradient-btn{width:100%;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border:none;border-radius:8px;padding:9px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity .2s}
        .gradient-btn:disabled{opacity:0.35;cursor:not-allowed}
        .ghost-btn{font-size:10px;font-weight:500;color:rgba(255,255,255,0.35);background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:3px 9px;cursor:pointer;font-family:inherit;transition:all .2s}
        .ghost-btn:hover{color:rgba(255,255,255,0.65);border-color:rgba(255,255,255,0.15)}
        .filter-label{font-size:9px;font-weight:700;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;margin-top:8px}
        .filter-select{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:7px 10px;font-size:11px;font-family:inherit;color:rgba(255,255,255,0.45);cursor:pointer;outline:none}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.35);margin-top:8px}
        .toggle{width:32px;height:18px;background:rgba(255,255,255,0.08);border-radius:9px;position:relative;cursor:pointer;transition:background .2s;border:none;outline:none;flex-shrink:0}
        .toggle.on{background:linear-gradient(135deg,#0891b2,#06b6d4)}
        .toggle::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .2s}
        .toggle.on::after{left:17px}

        /* TABS */
        .tabs-row{display:flex;gap:2px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:0}
        .tab{padding:8px 14px;border:none;border-bottom:2px solid transparent;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .2s;background:transparent;color:rgba(255,255,255,0.28);margin-bottom:-1px;white-space:nowrap;letter-spacing:"0.1px"}
        .tab.active{color:#fff;border-bottom-color:#06b6d4}
        .tab.tab-eb.active{color:#f59e0b;border-bottom-color:#f59e0b}
        .tab.tab-tracker.active{color:#06b6d4;border-bottom-color:#06b6d4}
        .tab.tab-analytics.active{color:#10b981;border-bottom-color:#10b981}
        .tab:hover:not(.active){color:rgba(255,255,255,0.55)}

        /* 2x3 GRID */
        .jobs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .job-card{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;cursor:default;transition:all .18s}
        .job-card:hover{border-color:rgba(6,182,212,0.25);background:rgba(6,182,212,0.025);transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,0,0,0.3)}
        .job-card-hot{border-color:rgba(245,158,11,0.18)!important;background:rgba(245,158,11,0.015)!important}

        /* ACTION BUTTONS */
        .action-card-btn{flex:1;min-width:fit-content;border-radius:6px;padding:7px 8px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid;transition:all .18s;white-space:nowrap}

        /* MATCH — highlighted with cyan glow */
        .action-card-btn.match-btn{background:rgba(6,182,212,0.1);border-color:rgba(6,182,212,0.3);color:#06b6d4;box-shadow:0 0 10px rgba(6,182,212,0.08)}
        .action-card-btn.match-btn:hover{background:rgba(6,182,212,0.18);box-shadow:0 0 16px rgba(6,182,212,0.15)}
        .action-card-btn.match-btn.done{background:rgba(6,182,212,0.12);border-color:rgba(6,182,212,0.4);color:#06b6d4}

        /* PREP — highlighted with emerald glow */
        .action-card-btn.interview-btn{background:rgba(16,185,129,0.09);border-color:rgba(16,185,129,0.28);color:#10b981;box-shadow:0 0 10px rgba(16,185,129,0.06)}
        .action-card-btn.interview-btn:hover{background:rgba(16,185,129,0.16);box-shadow:0 0 16px rgba(16,185,129,0.12)}
        .action-card-btn.interview-btn.done{background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.35);color:#10b981}

        /* TAILOR — subtle */
        .action-card-btn.tailor-btn{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.09);color:rgba(255,255,255,0.4)}
        .action-card-btn.tailor-btn:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.65)}
        .action-card-btn.tailor-btn.done{background:rgba(14,165,233,0.07);border-color:rgba(14,165,233,0.2);color:#0ea5e9}

        /* TRACK — subtle */
        .action-card-btn.track-btn{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:rgba(255,255,255,0.3);flex:0;padding:7px 12px}
        .action-card-btn.track-btn:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.55)}
        .action-card-btn.track-btn.tracked{background:rgba(6,182,212,0.08);border-color:rgba(6,182,212,0.2);color:#06b6d4}
        .action-card-btn:disabled{opacity:0.3;cursor:not-allowed}

        /* BADGES */
        .badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px}
        .badge-type{background:rgba(6,182,212,0.08);color:#06b6d4;border:1px solid rgba(6,182,212,0.12)}
        .badge-remote{background:rgba(16,185,129,0.08);color:#10b981;border:1px solid rgba(16,185,129,0.12)}
        .badge-salary{background:rgba(16,185,129,0.06);color:#10b981}
        .badge-time{background:rgba(245,158,11,0.06);color:rgba(245,158,11,0.65)}

        /* APPLY */
        .apply-btn{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:opacity .2s;text-decoration:none;display:block;text-align:center;letter-spacing:"0.2px"}
        .apply-btn:hover{opacity:0.88}
        .apply-btn-hot{background:linear-gradient(135deg,#ef4444,#f59e0b)!important}

        /* EB BANNER */
        .eb-banner{background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.1);border-radius:12px;padding:14px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}

        /* PAGINATION */
        .pagination{display:flex;justify-content:center;align-items:center;gap:5px;margin-top:24px}
        .page-btn{width:32px;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;color:rgba(255,255,255,0.3);transition:all .18s}
        .page-btn.active{background:rgba(6,182,212,0.1);border-color:rgba(6,182,212,0.25);color:#06b6d4}
        .page-btn:disabled{opacity:.18;cursor:not-allowed}

        /* SKELETON */
        .skel{background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.055) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:5px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* SPINNERS */
        .spin{width:16px;height:16px;border:2px solid rgba(6,182,212,0.2);border-top-color:#06b6d4;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        .spin-sm{width:11px;height:11px;border:2px solid rgba(255,255,255,0.1);border-top-color:#06b6d4;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* MODALS */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(12px);animation:fi .18s}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .modal{background:#07091a;border:1px solid rgba(255,255,255,0.07);border-radius:14px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;padding:28px;position:relative;animation:su .2s ease;scrollbar-width:thin}
        @keyframes su{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-close{position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:50%;width:28px;height:28px;font-size:12px;cursor:pointer;color:rgba(255,255,255,0.3);transition:all .18s;display:flex;align-items:center;justify-content:center}
        .modal-close:hover{background:rgba(239,68,68,0.1);color:#ef4444}
        .modal-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
        .modal-logo{width:52px;height:52px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);flex-shrink:0}
        .modal-logo img{width:100%;height:100%;object-fit:contain}
        .modal-title{font-size:18px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:3px}
        .modal-sub{font-size:13px;color:#06b6d4;font-weight:500}
        .modal-tabs{display:flex;gap:3px;background:rgba(255,255,255,0.03);border-radius:8px;padding:3px;margin-bottom:14px}
        .mtab{flex:1;padding:7px;border:none;border-radius:5px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;background:transparent;color:rgba(255,255,255,0.25);transition:all .18s}
        .mtab.active{background:rgba(255,255,255,0.07);color:#fff}
        .btn-tracked{background:rgba(6,182,212,0.08)!important;border-color:rgba(6,182,212,0.2)!important;color:#06b6d4!important}

        @media(max-width:900px){.sidebar{display:none}.content{padding:14px;max-width:100%}.jobs-grid{grid-template-columns:1fr}}
        @media(max-width:768px){.topbar-search{display:none}.jobs-grid{grid-template-columns:1fr}}
      `}</style>

      {/* TOPBAR */}
      <nav className="topbar">
        <div className="topbar-logo">Vega<span>ply</span></div>
        <div className="topbar-search">
          <input className="topbar-input" type="text" placeholder="Job role (e.g. Data Analyst)" value={jobRole} onChange={e=>setJobRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          <input className="topbar-input" type="text" placeholder="Location (e.g. New York, US)" value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Search"}</button>
          <button className="eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading}>{ebLoading?"Scanning…":"⚡ Early Bird"}</button>
        </div>
        <div className="topbar-right">
          {mounted&&earlyBirdJobs.length>0&&<span className="nav-pill pill-eb">⚡ {earlyBirdJobs.length} Early</span>}
          {mounted&&trackedApps.length>0&&<span className="nav-pill pill-tracker">{trackedApps.length} Tracked</span>}
          {mounted&&userEmail&&<div className="user-avatar" title={userEmail}>{avatarLetter}</div>}
          {mounted&&userEmail&&<span style={{fontSize:11,color:"rgba(255,255,255,0.2)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</span>}
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <div className="sidebar-card-title">🎯 AI Resume Match</div>
              <button onClick={loadResumeHistory} style={{fontSize:10,color:"#06b6d4",background:"none",border:"1px solid rgba(6,182,212,0.2)",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"}}>History</button>
            </div>
            <div className="sidebar-card-sub">Upload PDF for AI matching & auto-apply</div>
            <ResumePanel
              resumeText={resumeText}
              fileName={resumeFileName}
              onResume={async(t,n)=>{
                setResumeText(t);setResumeFileName(n);
                lsSet("applysmart_resume",t);lsSet("applysmart_resume_name",n);
                const{data:{user}}=await supabase.auth.getUser();
                if(!user)return;
                await supabase.from("resumes").insert([{user_id:user.id,title:n,file_name:n,resume_text:t}]);
              }}
              onClear={()=>{setResumeText("");setResumeFileName("");lsRemove("applysmart_resume");lsRemove("applysmart_resume_name");}}
            />
            {resumeText&&activeTab==="earlybird"&&earlyBirdJobs.length>0&&(
              <div style={{marginTop:10}}>
                <button className="gradient-btn" onClick={runResumeMatch} disabled={isMatching}>
                  {isMatching?<><div className="spin"/>Analyzing {matchProgress}%</>:`🚀 Match & Auto-Apply (${earlyBirdJobs.length})`}
                </button>
                {isMatching&&<div style={{marginTop:7}}><div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#0891b2,#06b6d4)",borderRadius:2,width:`${matchProgress}%`,transition:"width .3s"}}/></div></div>}
              </div>
            )}
            {autoOpenDone&&<div style={{fontSize:11,color:"#10b981",textAlign:"center",marginTop:7}}>✓ Opened top matches in new tabs</div>}
          </div>

          <div style={{height:1,background:"rgba(255,255,255,0.05)"}}/>

          <div className="sidebar-card">
            <div className="sidebar-card-title">Filters</div>
            <div className="filter-label">Job Type</div>
            <select className="filter-select" value={filterType} onChange={e=>{setFilterType(e.target.value);setCurrentPage(1);}}>
              <option value="ALL">All Types</option>
              <option value="FULLTIME">Full-time</option>
              <option value="PARTTIME">Part-time</option>
              <option value="CONTRACTOR">Contract</option>
              <option value="INTERN">Internship</option>
            </select>
            <div className="filter-label">Date Posted</div>
            <select className="filter-select" value={filterDate} onChange={e=>{setFilterDate(e.target.value);setCurrentPage(1);}}>
              <option value="ANY">Any Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
            </select>
            <div className="toggle-row">
              <span>Remote Only</span>
              <button className={`toggle${filterRemote?" on":""}`} onClick={()=>{setFilterRemote(!filterRemote);setCurrentPage(1);}}/>
            </div>
          </div>

          <div style={{height:1,background:"rgba(255,255,255,0.05)"}}/>

          {hasSearched&&<AlertPanel jobRole={jobRole} location={location} jobs={allJobs}/>}
        </aside>

        {/* MAIN */}
        <main className="content">
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

          {activeTab==="tracker"&&<TrackerView apps={trackedApps} onUpdateStatus={(id,s)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,status:s}:a))} onUpdateNotes={(id,n)=>setTrackedApps(prev=>prev.map(a=>a.id===id?{...a,notes:n}:a))} onRemove={id=>setTrackedApps(prev=>prev.filter(a=>a.id!==id))}/>}
          {activeTab==="analytics"&&<AnalyticsView apps={trackedApps} savedCount={savedJobs.size} totalSearched={totalSearched}/>}

          {(activeTab==="results"||activeTab==="earlybird"||activeTab==="saved")&&(
            <>
              {activeTab==="earlybird"&&earlyBirdJobs.length>0&&!ebLoading&&(
                <div className="eb-banner">
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#f59e0b",marginBottom:2}}>⚡ Early Bird Mode Active</div>
                    <div style={{fontSize:11,color:"rgba(245,158,11,0.4)"}}>Jobs posted in the last 24 hours — minimal competition</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:18}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800}}>{earlyBirdJobs.length}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>Fresh Jobs</div></div>
                    <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)"}}/>
                    <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#ef4444"}}>{hotCount}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>🔥 Under 6h</div></div>
                  </div>
                </div>
              )}

              {autoOpenDone&&<div style={{background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:12,fontWeight:600,color:"#10b981",display:"flex",alignItems:"center",gap:8}}>🚀 Opened top 3 matches in new tabs!</div>}

              {currentLoading&&(
                <div className="jobs-grid">
                  {[...Array(6)].map((_,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"flex",gap:10}}><div className="skel" style={{width:42,height:42,borderRadius:8,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}><div className="skel" style={{height:13,width:"68%"}}/><div className="skel" style={{height:10,width:"42%"}}/></div></div>
                      <div className="skel" style={{height:32,borderRadius:7}}/>
                      <div style={{display:"flex",gap:5}}><div className="skel" style={{height:30,flex:1,borderRadius:6}}/><div className="skel" style={{height:30,flex:1,borderRadius:6}}/><div className="skel" style={{height:30,flex:1,borderRadius:6}}/></div>
                    </div>
                  ))}
                </div>
              )}

              {!currentLoading&&paginatedJobs.length>0&&(
                <>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.22)",marginBottom:14}}>
                    Showing <strong style={{color:"rgba(255,255,255,0.45)"}}>{(currentPage-1)*JOBS_PER_PAGE+1}–{Math.min(currentPage*JOBS_PER_PAGE,displayJobs.length)}</strong> of <strong style={{color:"rgba(255,255,255,0.45)"}}>{displayJobs.length}</strong> jobs
                    {isEbMode&&<span style={{color:"#f59e0b",fontWeight:600}}> · ⚡ All posted today</span>}
                  </div>
                  <div className="jobs-grid">
                    {paginatedJobs.map((job,idx)=>(
                      <JobCard
                        key={`${job.job_id}-${idx}`}
                        job={job}
                        saved={savedJobs.has(job.job_id)}
                        onToggleSave={()=>toggleSave(job.job_id)}
                        onClick={()=>setSelectedJob(job)}
                        onTailor={()=>{if(job.tailor)setTailorJob(job);else handleTailor(job);}}
                        onInterview={()=>handleInterview(job)}
                        onMatchResume={()=>handleSingleMatch(job)}
                        earlyBirdMode={isEbMode}
                        resumeReady={!!resumeText}
                        isTracked={!!trackedApps.find(a=>a.job.job_id===job.job_id)}
                        onTrack={()=>addToTracker(job)}
                      />
                    ))}
                  </div>
                  {totalPages>1&&(
                    <div className="pagination">
                      <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                      {[...Array(Math.min(totalPages,7))].map((_,i)=><button key={i} className={`page-btn${currentPage===i+1?" active":""}`} onClick={()=>setCurrentPage(i+1)}>{i+1}</button>)}
                      <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
                    </div>
                  )}
                </>
              )}

              {!currentLoading&&paginatedJobs.length===0&&(
                <div style={{textAlign:"center",padding:"56px 24px",background:"rgba(255,255,255,0.015)",borderRadius:12,border:"1px dashed rgba(255,255,255,0.06)"}}>
                  <div style={{fontSize:36,marginBottom:12}}>{activeTab==="saved"?"🔖":activeTab==="earlybird"?"⚡":"🔍"}</div>
                  <h3 style={{fontSize:16,color:"rgba(255,255,255,0.4)",marginBottom:6,fontWeight:700}}>{activeTab==="saved"?"No saved jobs":activeTab==="earlybird"?"No early bird jobs yet":"Start your search"}</h3>
                  <p style={{fontSize:12,color:"rgba(255,255,255,0.2)"}}>{activeTab==="saved"?"Bookmark jobs to see them here":activeTab==="earlybird"?"Click ⚡ Early Bird to find freshly posted jobs":"Enter a job role and location above to find opportunities"}</p>
                </div>
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

      {/* WELCOME TOUR */}
      {showWelcomeTour&&<WelcomeTour onClose={closeTour}/>}

      {/* ONBOARDING */}
      {showOnboard&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,8,16,0.98)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(20px)"}}>
          <div style={{background:"#0a0f1e",border:"1px solid rgba(6,182,212,0.15)",borderRadius:20,padding:36,width:"100%",maxWidth:460,textAlign:"center",boxShadow:"0 0 50px rgba(6,182,212,0.06)"}}>
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
              {[1,2,3].map(s=><div key={s} style={{height:3,borderRadius:3,transition:"all .3s",background:s===onboardStep?"#06b6d4":s<onboardStep?"rgba(6,182,212,0.35)":"rgba(255,255,255,0.07)",width:s===onboardStep?28:8}}/>)}
            </div>
            {onboardStep===1&&<>
              <div style={{fontSize:24,fontWeight:800,color:"#fff",marginBottom:8}}>Welcome to <span style={{color:"#06b6d4"}}>Vegaply</span></div>
              <p style={{color:"rgba(255,255,255,0.32)",fontSize:13,marginBottom:24,lineHeight:1.6}}>The AI-powered job search platform built for students. Let's set you up in 60 seconds.</p>
              <input value={onboardRole} onChange={e=>setOnboardRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onboardRole.trim()&&setOnboardStep(2)} placeholder="What role are you looking for? (e.g. Data Analyst)" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"12px 16px",fontSize:14,color:"#fff",outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
              <button onClick={()=>{if(onboardRole.trim())setOnboardStep(2);}} style={{width:"100%",background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
            </>}
            {onboardStep===2&&<>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:8}}>Where are you looking?</div>
              <p style={{color:"rgba(255,255,255,0.32)",fontSize:13,marginBottom:24,lineHeight:1.6}}>Enter your preferred job location.</p>
              <input value={onboardLocation} onChange={e=>setOnboardLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onboardLocation.trim()&&setOnboardStep(3)} placeholder="e.g. New York, US or Remote" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"12px 16px",fontSize:14,color:"#fff",outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setOnboardStep(1)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <button onClick={()=>{if(onboardLocation.trim())setOnboardStep(3);}} style={{flex:2,background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
              </div>
            </>}
            {onboardStep===3&&<>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:8}}>Upload your resume</div>
              <p style={{color:"rgba(255,255,255,0.32)",fontSize:13,marginBottom:20,lineHeight:1.6}}>Upload your PDF for AI matching. You can skip this and add it later.</p>
              {onboardParsing&&<div style={{color:"#06b6d4",fontSize:12,marginBottom:10}}>⏳ Parsing resume…</div>}
              <input id="ob-file-input" type="file" accept=".pdf" style={{display:"none"}} onChange={async e=>{
                const file=e.target.files?.[0];if(!file)return;
                setOnboardParsing(true);
                try{
                  if(!(window as any).pdfjsLib){await new Promise<void>((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>res();s.onerror=()=>rej();document.head.appendChild(s);});(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";}
                  const ab=await file.arrayBuffer();const pdf=await (window as any).pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;let text="";
                  for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map((it:any)=>it.str).join(" ")+"\n";}
                  if(text.trim()){setResumeText(text);setResumeFileName(file.name);lsSet("applysmart_resume",text);lsSet("applysmart_resume_name",file.name);
                  const{supabase}=await import("@/lib/supabase");const{data:{user}}=await supabase.auth.getUser();if(user)await supabase.from("resumes").insert({user_id:user.id,title:"Resume",file_name:file.name,resume_text:text});}
                }catch(err){console.error(err);}
                setOnboardParsing(false);completeOnboarding();
              }}/>
              <button onClick={()=>document.getElementById("ob-file-input")?.click()} disabled={onboardParsing} style={{width:"100%",background:"linear-gradient(135deg,#0891b2,#06b6d4)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                {onboardParsing?"Parsing…":"📎 Upload Resume PDF"}
              </button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setOnboardStep(2)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                <button onClick={completeOnboarding} style={{flex:2,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>Skip for now</button>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* RESUME HISTORY */}
      {showResumeHistory&&(
        <div onClick={()=>setShowResumeHistory(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(12px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#07091a",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:24,width:"100%",maxWidth:460,maxHeight:"78vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h2 style={{fontSize:16,fontWeight:700,color:"#fff"}}>Resume History</h2>
              <button onClick={()=>setShowResumeHistory(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"50%",width:26,height:26,cursor:"pointer",color:"rgba(255,255,255,0.28)",fontSize:11}}>✕</button>
            </div>
            {resumeHistory.length===0?<p style={{color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"24px 0",fontSize:12}}>No resumes saved yet</p>:resumeHistory.map((r,i)=>(
              <div key={r.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${i===0?"rgba(6,182,212,0.25)":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:14,marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"#fff",marginBottom:3}}>{r.file_name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>{i===0&&<div style={{fontSize:9,color:"#06b6d4",fontWeight:700,marginTop:3,letterSpacing:"0.3px"}}>ACTIVE</div>}</div>
                <button onClick={()=>{setResumeText(r.resume_text);setResumeFileName(r.file_name);lsSet("applysmart_resume",r.resume_text);lsSet("applysmart_resume_name",r.file_name);setShowResumeHistory(false);}} style={{background:i===0?"rgba(6,182,212,0.08)":"linear-gradient(135deg,#0891b2,#06b6d4)",color:i===0?"#06b6d4":"#fff",border:i===0?"1px solid rgba(6,182,212,0.25)":"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {i===0?"Active":"Use This"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING HELP */}
      <HelpPanel/>
    </>
  );
}