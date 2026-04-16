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
interface SkillGapResult {
  missingSkills: string[];
  strongSkills: string[];
  courses: { skill: string; title: string; platform: string; url: string }[];
}
interface JobWithMatch extends Job {
  match?: MatchResult; matchLoading?: boolean; tailor?: TailorResult;
  tailorLoading?: boolean; interview?: InterviewResult; interviewLoading?: boolean;
  coverLetter?: string; coverLetterLoading?: boolean;
  skillGap?: SkillGapResult; skillGapLoading?: boolean;
}
type AppStatus = "Saved"|"Applied"|"Interviewing"|"Offer"|"Rejected";
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
function scoreColor(s: number) { return s >= 80 ? "#10b981" : s >= 65 ? "#818cf8" : s >= 50 ? "#f59e0b" : "#ef4444"; }

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
      <div style={{background:"#0a0a10",border:"1px solid rgba(99,102,241,0.2)",borderRadius:20,padding:40,width:"100%",maxWidth:480,textAlign:"center",boxShadow:"0 0 60px rgba(99,102,241,0.08)"}}>
        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:32}}>
          {steps.map((_, i) => (
            <div key={i} style={{height:3,borderRadius:3,transition:"all .3s",background:i===step?"#818cf8":i<step?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.08)",width:i===step?28:8}}/>
          ))}
        </div>
        <div style={{fontSize:48,marginBottom:16}}>{current.icon}</div>
        <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:10,letterSpacing:"-0.3px"}}>{current.title}</div>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,lineHeight:1.7,marginBottom:16}}>{current.desc}</p>
        <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:10,padding:"10px 16px",fontSize:13,color:"#818cf8",marginBottom:28}}>💡 {current.highlight}</div>
        <div style={{display:"flex",gap:10}}>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>}
          {step < steps.length - 1
            ? <button onClick={()=>setStep(s=>s+1)} style={{flex:2,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
            : <button onClick={onClose} style={{flex:2,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Let's Go 🚀</button>
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
      <button onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:24,right:24,width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",cursor:"pointer",fontSize:18,color:"#fff",zIndex:400,boxShadow:"0 4px 20px rgba(99,102,241,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,transition:"transform .2s"}} title="Feature Guide">?</button>
      {open && (
        <div style={{position:"fixed",bottom:76,right:24,width:300,background:"#0a0a10",border:"1px solid rgba(99,102,241,0.2)",borderRadius:16,padding:16,zIndex:400,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"su .18s ease"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#818cf8",marginBottom:14,letterSpacing:"0.3px"}}>FEATURE GUIDE</div>
          {features.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<features.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <span style={{fontSize:16,flexShrink:0}}>{f.icon}</span>
              <div><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.75)"}}>{f.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>{f.desc}</div></div>
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{width:"100%",marginTop:12,background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,color:"#818cf8",cursor:"pointer",fontFamily:"inherit"}}>Close</button>
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
  const color = matchResult ? scoreColor(matchResult.matchScore) : "#818cf8";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(6,6,8,0.55)",backdropFilter:"blur(4px)",zIndex:250}}>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,background:"#080810",borderLeft:"1px solid rgba(99,102,241,0.12)",padding:24,overflowY:"auto",display:"flex",flexDirection:"column",gap:16,animation:"slideIn .25s ease",zIndex:251}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Resume Analysis</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>{job.job_title} · {job.employer_name}</div></div>
          <button className="modal-close" style={{position:"static"}} onClick={onClose}>✕</button>
        </div>
        {!resumeText&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Upload your resume first</div></div>}
        {resumeText&&loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",gap:14}}><div className="spin" style={{width:32,height:32}}/><div style={{fontSize:13,color:"#818cf8"}}>Analyzing your resume…</div></div>}
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
      {parsing?<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#818cf8"}}><div className="spin"/>Parsing…</div>:(<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.3)",marginTop:6}}>Drop resume PDF here</div><div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:2}}>or click to browse</div>{error&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{error}</div>}</>)}
    </div>
  );
}

// ── INTERVIEW SIMULATOR ──────────────────────────────────────────────────
interface SimQuestion { question: string; type: "Behavioral"|"Technical"; focus: string; }
interface SimFeedback { score: number; verdict: string; strengths: string[]; improvements: string[]; betterAnswer: string; }
interface SimQA { question: SimQuestion; answer: string; feedback: SimFeedback; }
interface SimSummary { overallScore: number; verdict: string; strengths: string[]; improvements: string[]; recommendation: string; }

function SimFeedbackCard({ feedback }: { feedback: SimFeedback }) {
  const score = feedback.score ?? 5;
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#818cf8" : score >= 4 ? "#f59e0b" : "#ef4444";
  const label = score >= 8 ? "Excellent" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Needs Work";
  const rgbMap: Record<string,string> = { "#10b981":"16,185,129", "#818cf8":"129,140,248", "#f59e0b":"245,158,11", "#ef4444":"239,68,68" };
  const rgb = rgbMap[color] ?? "129,140,248";
  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:14,marginLeft:38}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:feedback.strengths?.length||feedback.improvements?.length?10:0}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:50,height:50,background:`rgba(${rgb},0.08)`,borderRadius:10,border:`1px solid rgba(${rgb},0.2)`,flexShrink:0}}>
          <div style={{fontSize:20,fontWeight:800,color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:8,fontWeight:600,color,opacity:0.6,letterSpacing:0.5}}>/10</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color,marginBottom:3}}>{label}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{feedback.verdict}</div>
        </div>
      </div>
      {feedback.strengths?.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
          <span style={{color:"#10b981",fontSize:11,flexShrink:0,marginTop:1}}>✓</span>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{s}</span>
        </div>
      ))}
      {feedback.improvements?.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
          <span style={{color:"#f59e0b",fontSize:11,flexShrink:0,marginTop:1}}>↑</span>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{s}</span>
        </div>
      ))}
      {feedback.betterAnswer&&(
        <div style={{marginTop:8,background:"rgba(99,102,241,0.06)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(99,102,241,0.12)"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#818cf8",letterSpacing:0.5}}>💡 TIP  </span>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.4}}>{feedback.betterAnswer}</span>
        </div>
      )}
    </div>
  );
}

function SimSummaryScreen({ summary, allQA, onClose }: { summary: SimSummary; allQA: SimQA[]; onClose: () => void }) {
  const recMap: Record<string,string> = { "Strong Hire":"#10b981","Hire":"#818cf8","Borderline":"#f59e0b","Needs More Prep":"#f59e0b","Not Ready":"#ef4444" };
  const recColor = recMap[summary.recommendation ?? ""] ?? "#818cf8";
  return (
    <div style={{flex:1,overflowY:"auto",padding:"24px 22px 28px"}}>
      {/* Hero score */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
          <ScoreRing score={summary.overallScore ?? 0}/>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:"#fff",marginBottom:6}}>Interview Complete</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",maxWidth:400,margin:"0 auto",lineHeight:1.55}}>{summary.verdict}</div>
        <div style={{display:"inline-block",marginTop:10,padding:"4px 14px",borderRadius:20,background:`${recColor}18`,border:`1px solid ${recColor}30`,fontSize:11,fontWeight:700,color:recColor,letterSpacing:0.5}}>
          {summary.recommendation}
        </div>
      </div>
      {/* Per-question breakdown */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,255,255,0.2)",marginBottom:8}}>Question Scores</div>
        <div style={{display:"flex",gap:6}}>
          {allQA.map((qa,i)=>{
            const sc=qa.feedback.score??5;
            const c=sc>=8?"#10b981":sc>=6?"#818cf8":sc>=4?"#f59e0b":"#ef4444";
            return(
              <div key={i} style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 4px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",marginBottom:2}}>Q{i+1}</div>
                <div style={{fontSize:17,fontWeight:800,color:c}}>{sc}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.18)"}}>/10</div>
                <div style={{fontSize:8,color:c,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 2px"}}>{qa.question.focus}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Strengths + improvements */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.12)",borderRadius:10,padding:14}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#10b981",marginBottom:8}}>Strengths</div>
          {summary.strengths?.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:5}}>
              <span style={{color:"#10b981",fontSize:11,flexShrink:0,marginTop:1}}>✓</span>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.12)",borderRadius:10,padding:14}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#f59e0b",marginBottom:8}}>Improve On</div>
          {summary.improvements?.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginBottom:5}}>
              <span style={{color:"#f59e0b",fontSize:11,flexShrink:0,marginTop:1}}>↑</span>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.4}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onClose} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:0.3}}>
        Done — Back to Jobs
      </button>
    </div>
  );
}

function InterviewSimulatorModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [phase, setPhase] = useState<"loading"|"chat"|"summary">("loading");
  const [questions, setQuestions] = useState<SimQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  type ChatMsg = { role:"ai"|"user"|"feedback"; content:string; feedback?:SimFeedback; };
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [allQA, setAllQA] = useState<SimQA[]>([]);
  const [summary, setSummary] = useState<SimSummary|null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,isTyping]);

  useEffect(()=>{
    (async()=>{
      try{
        const res=await fetch("/api/interview-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",job})});
        const data=await res.json();
        const qs:SimQuestion[]=data.questions??[];
        setQuestions(qs);
        setPhase("chat");
        setMessages([{role:"ai",content:`Welcome to your mock interview for ${job.job_title} at ${job.employer_name}.\n\nI'll ask you 5 questions — a mix of behavioral and technical. Take your time with each answer. Ready?\n\nQuestion 1 of 5 · ${qs[0]?.type} · ${qs[0]?.focus}\n\n${qs[0]?.question}`}]);
      }catch{
        setPhase("chat");
        setMessages([{role:"ai",content:"Sorry, I couldn't load your questions. Please close and try again."}]);
      }
    })();
  },[]);

  const sendAnswer=async()=>{
    if(!input.trim()||isTyping)return;
    const answer=input.trim();
    setInput("");
    const q=questions[currentQ];
    setMessages(prev=>[...prev,{role:"user",content:answer}]);
    setIsTyping(true);
    try{
      const res=await fetch("/api/interview-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"evaluate",job,question:q.question,questionType:q.type,answer})});
      const data=await res.json();
      const feedback:SimFeedback=data.feedback;
      const newQA:SimQA={question:q,answer,feedback};
      const newAllQA=[...allQA,newQA];
      setAllQA(newAllQA);
      setIsTyping(false);
      setMessages(prev=>[...prev,{role:"feedback",content:"",feedback}]);
      const nextQ=currentQ+1;
      if(nextQ<questions.length){
        setTimeout(()=>{
          setMessages(prev=>[...prev,{role:"ai",content:`Question ${nextQ+1} of 5 · ${questions[nextQ].type} · ${questions[nextQ].focus}\n\n${questions[nextQ].question}`}]);
          setCurrentQ(nextQ);
          inputRef.current?.focus();
        },600);
      }else{
        setSummaryLoading(true);
        setTimeout(async()=>{
          try{
            const sr=await fetch("/api/interview-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"summary",job,allQA:newAllQA.map(qa=>({question:qa.question.question,type:qa.question.type,score:qa.feedback.score}))})});
            const sd=await sr.json();
            setSummary(sd.summary);
          }catch{}
          setSummaryLoading(false);
          setPhase("summary");
        },800);
      }
    }catch{
      setIsTyping(false);
      setMessages(prev=>[...prev,{role:"ai",content:"Something went wrong evaluating your answer. Please try again."}]);
    }
  };

  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:720,height:"84vh",display:"flex",flexDirection:"column",padding:0,overflow:"hidden",borderRadius:18}} onClick={e=>e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:12,flexShrink:0,background:"rgba(255,255,255,0.015)"}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,rgba(99,102,241,0.25),rgba(236,72,153,0.15))",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤖</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>AI Interview Simulator</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.job_title} · {job.employer_name}</div>
          </div>
          {phase==="chat"&&questions.length>0&&(
            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
              {questions.map((_,i)=>(
                <div key={i} style={{width:7,height:7,borderRadius:"50%",transition:"all 0.3s",background:i<allQA.length?"#10b981":i===currentQ&&phase==="chat"?"#818cf8":"rgba(255,255,255,0.1)",boxShadow:i===currentQ&&phase==="chat"?"0 0 6px rgba(129,140,248,0.5)":"none"}}/>
              ))}
            </div>
          )}
          <button className="modal-close" style={{position:"static",marginLeft:4}} onClick={onClose}>✕</button>
        </div>

        {/* ── LOADING ── */}
        {phase==="loading"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{width:40,height:40,border:"3px solid rgba(99,102,241,0.15)",borderTopColor:"#818cf8",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>Preparing your interview questions…</div>
          </div>
        )}

        {/* ── CHAT ── */}
        {phase==="chat"&&(
          <>
            <div style={{flex:1,overflowY:"auto",padding:"18px 18px 10px",display:"flex",flexDirection:"column",gap:12}}>
              {messages.map((msg,i)=>(
                <div key={i}>
                  {msg.role==="ai"&&(
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{width:28,height:28,background:"rgba(99,102,241,0.12)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>
                      <div style={{background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"2px 12px 12px 12px",padding:"10px 14px",maxWidth:"82%"}}>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                      </div>
                    </div>
                  )}
                  {msg.role==="user"&&(
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <div style={{background:"rgba(99,102,241,0.14)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:"12px 2px 12px 12px",padding:"10px 14px",maxWidth:"82%"}}>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>{msg.content}</div>
                      </div>
                    </div>
                  )}
                  {msg.role==="feedback"&&msg.feedback&&<SimFeedbackCard feedback={msg.feedback}/>}
                </div>
              ))}
              {isTyping&&(
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,background:"rgba(99,102,241,0.12)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div>
                  <div style={{background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"2px 12px 12px 12px",padding:"12px 16px"}}>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {[0,1,2].map(d=><div key={d} style={{width:6,height:6,background:"rgba(255,255,255,0.25)",borderRadius:"50%",animation:`simBounce 1.2s ease-in-out ${d*0.18}s infinite`}}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* ── INPUT ── */}
            {allQA.length<(questions.length||5)&&!summaryLoading?(
              <div style={{padding:"10px 16px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAnswer();}}}
                    placeholder="Type your answer… (Enter to send · Shift+Enter for new line)"
                    rows={2}
                    disabled={isTyping}
                    style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"10px 14px",fontSize:13,fontFamily:"inherit",color:"#fff",resize:"none",minHeight:50,maxHeight:120,outline:"none",lineHeight:1.55,transition:"border-color 0.2s"}}
                  />
                  <button
                    onClick={sendAnswer}
                    disabled={!input.trim()||isTyping}
                    style={{width:42,height:42,background:input.trim()&&!isTyping?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,cursor:input.trim()&&!isTyping?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:5,textAlign:"right"}}>
                  Q{Math.min(currentQ+1,questions.length||5)} of {questions.length||5} · {questions[currentQ]?.type??""} · {questions[currentQ]?.focus??""}
                </div>
              </div>
            ):summaryLoading?(
              <div style={{padding:"14px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:18,height:18,border:"2px solid rgba(99,102,241,0.25)",borderTopColor:"#818cf8",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>Generating your interview report…</div>
              </div>
            ):null}
          </>
        )}

        {/* ── SUMMARY ── */}
        {phase==="summary"&&summary&&<SimSummaryScreen summary={summary} allQA={allQA} onClose={onClose}/>}
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
        {tailor.keywordsAdded?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Keywords to include</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tailor.keywordsAdded.map((k,i)=><span key={i} style={{background:"rgba(99,102,241,0.08)",color:"#818cf8",fontSize:12,fontWeight:500,padding:"4px 10px",borderRadius:6}}>{k}</span>)}</div></div>}
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:10}}>Tailored bullet points</div>
        {tailor.tailoredBullets?.map((b,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:14,marginBottom:12,border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.25)",lineHeight:1.5,marginBottom:6}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(255,255,255,0.18)",display:"block",marginBottom:2}}>ORIGINAL</span>{b.original}</div>
            <div style={{fontSize:12,color:"rgba(99,102,241,0.35)",textAlign:"center",margin:"4px 0"}}>↓</div>
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

function AnalyticsView({ apps, savedCount, totalSearched, lm }: { apps: TrackedApp[]; savedCount: number; totalSearched: number; lm?: boolean }) {
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)",t4:lm?"rgba(0,0,0,0.28)":"rgba(255,255,255,0.22)",bd:lm?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.06)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.025)"};
  const sc: Record<AppStatus,number> = {Saved:0,Applied:0,Interviewing:0,Offer:0,Rejected:0};
  apps.forEach(a=>{sc[a.status]=(sc[a.status]||0)+1;});
  const totalApplied = sc.Applied+sc.Interviewing+sc.Offer+sc.Rejected;
  const responseRate = totalApplied>0 ? Math.round(((sc.Interviewing+sc.Offer)/totalApplied)*100) : 0;
  const offerRate    = totalApplied>0 ? Math.round((sc.Offer/totalApplied)*100) : 0;
  const rejectionRate= totalApplied>0 ? Math.round((sc.Rejected/totalApplied)*100) : 0;

  const motivational = (()=>{
    if(apps.length===0) return { emoji:"🚀", title:"Ready to launch?", body:"Add your first job to the Tracker to start seeing your analytics here.", color:"#818cf8" };
    if(sc.Offer>0)       return { emoji:"🎉", title:"You have an offer!", body:`${sc.Offer} offer${sc.Offer>1?"s":""} — you're crushing it. Keep negotiating and don't stop tracking.`, color:"#10b981" };
    if(sc.Interviewing>0)return { emoji:"🎯", title:"Interviews incoming!", body:`${sc.Interviewing} interview${sc.Interviewing>1?"s":""} lined up. Prep hard with the Interview Prep tool and land that offer.`, color:"#f59e0b" };
    if(totalApplied>10&&responseRate===0) return { emoji:"💡", title:"No responses yet — let's fix that.", body:"Try tailoring your resume to each job description. Even small changes improve ATS scores significantly.", color:"#f59e0b" };
    if(totalApplied>0&&responseRate>0)   return { emoji:"📈", title:`${responseRate}% response rate — keep going!`, body:"You're getting traction. Apply to 5 more jobs today to keep the pipeline full.", color:"#818cf8" };
    if(totalApplied>0)  return { emoji:"⚡", title:"Applications sent!", body:"Consistency wins. Aim for 5–10 quality applications per day and use the Match tool to prioritise.", color:"#818cf8" };
    return { emoji:"🔖", title:`${sc.Saved} job${sc.Saved!==1?"s":""} saved — time to apply!`, body:"You've bookmarked jobs. Hit Apply on your top picks and move them to Applied to track your progress.", color:"#94a3b8" };
  })();

  const statCards = [
    { label:"Total Tracked", value:apps.length,        icon:"📋", color:"#818cf8" },
    { label:"Applied",       value:totalApplied,        icon:"📤", color:"#818cf8" },
    { label:"Interviewing",  value:sc.Interviewing,     icon:"🎯", color:"#f59e0b" },
    { label:"Offers",        value:sc.Offer,            icon:"🎉", color:"#10b981" },
    { label:"Response Rate", value:`${responseRate}%`,  icon:"📈", color:"#0ea5e9" },
    { label:"Offer Rate",    value:`${offerRate}%`,     icon:"✅", color:"#10b981" },
    { label:"Rejected",      value:sc.Rejected,         icon:"❌", color:"#ef4444" },
    { label:"Rejection Rate",value:`${rejectionRate}%`, icon:"📉", color:"#ef4444" },
  ];

  const funnel = [
    { label:"Jobs Scanned", count:totalSearched, color:"rgba(255,255,255,0.2)" },
    { label:"Bookmarked",   count:savedCount,    color:"#94a3b8" },
    { label:"Tracked",      count:apps.length,   color:"#818cf8" },
    { label:"Applied",      count:totalApplied,  color:"#f59e0b" },
    { label:"Interviewing", count:sc.Interviewing,color:"#a78bfa" },
    { label:"Offers",       count:sc.Offer,      color:"#10b981" },
  ];
  const mx = Math.max(funnel[0].count, 1);

  const sc2: Record<AppStatus,string> = {Saved:"#94a3b8",Applied:"#818cf8",Interviewing:"#f59e0b",Offer:"#10b981",Rejected:"#ef4444"};
  const sc2icon: Record<AppStatus,string> = {Saved:"🔖",Applied:"📤",Interviewing:"🎯",Offer:"🎉",Rejected:"❌"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {/* MOTIVATIONAL BANNER */}
      <div style={{background:`linear-gradient(135deg,${motivational.color}12,${motivational.color}06)`,border:`1px solid ${motivational.color}28`,borderRadius:14,padding:"18px 22px",display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{fontSize:30,flexShrink:0,lineHeight:1}}>{motivational.emoji}</div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:motivational.color,marginBottom:4}}>{motivational.title}</div>
          <div style={{fontSize:12,color:t.t2,lineHeight:1.6}}>{motivational.body}</div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {statCards.map((c,i)=>(
          <div key={i} style={{background:t.bg,border:`1px solid ${c.color}22`,borderRadius:10,padding:"16px 14px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:6}}>{c.icon}</div>
            <div style={{fontSize:26,fontWeight:800,color:c.color,fontFamily:"'Inter',sans-serif",marginBottom:3}}>{c.value}</div>
            <div style={{fontSize:10,color:t.t3,fontWeight:500}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* STATUS BREAKDOWN */}
      <div style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:12,padding:18}}>
        <div style={{fontSize:11,fontWeight:700,color:t.t3,marginBottom:14,textTransform:"uppercase",letterSpacing:"1px"}}>Applications by Status</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {(["Saved","Applied","Interviewing","Offer","Rejected"] as AppStatus[]).map(s=>(
            <div key={s} style={{background:`${sc2[s]}0d`,border:`1px solid ${sc2[s]}28`,borderRadius:8,padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:4}}>{sc2icon[s]}</div>
              <div style={{fontSize:24,fontWeight:800,color:sc2[s]}}>{sc[s]}</div>
              <div style={{fontSize:10,fontWeight:500,color:sc2[s],marginTop:3,opacity:0.75}}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FUNNEL */}
      <div style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:12,padding:18}}>
        <div style={{fontSize:11,fontWeight:700,color:t.t3,marginBottom:14,textTransform:"uppercase",letterSpacing:"1px"}}>Application Funnel</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {funnel.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:11,color:t.t3,width:90,flexShrink:0}}>{f.label}</div>
              <div style={{flex:1,height:7,background:lm?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.04)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(f.count/mx)*100}%`,background:f.color,borderRadius:99,transition:"width .7s ease"}}/>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:f.color,width:28,textAlign:"right"}}>{f.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TIPS — only when no apps */}
      {apps.length===0&&(
        <div style={{background:t.bg,border:`1px dashed ${t.bd}`,borderRadius:12,padding:24,textAlign:"center"}}>
          <div style={{fontSize:34,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:600,color:t.t3,marginBottom:6}}>No tracking data yet</div>
          <div style={{fontSize:12,color:t.t4}}>Click "+ Track" on job cards to start building your pipeline.</div>
        </div>
      )}
    </div>
  );
}

// ── RESUME STRENGTH ANALYSER ────────────────────────────────────────────────
interface StrengthCheck { label: string; pass: boolean; tip: string; weight: number; }

function analyzeResume(text: string): { score: number; checks: StrengthCheck[] } {
  const t = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  const checks: StrengthCheck[] = [
    {
      label: "Measurable achievements",
      pass: /\d+\s*(%|percent|x\b|million|billion|thousand|k\b|\+|\bincreased\b|\bdecreased\b|\breduced\b|\bimproved\b|\bgrew\b|\bsaved\b|\bgenerated\b|\bdelivered\b)/.test(t) || /\b\d{2,}\b/.test(t),
      tip: 'Add numbers & metrics (e.g. "increased revenue by 30%")',
      weight: 20,
    },
    {
      label: "Technical skills section",
      pass: /\b(python|javascript|typescript|java|sql|react|node|aws|azure|gcp|docker|kubernetes|git|machine learning|data|api|html|css|excel|tableau|figma|c\+\+|go|rust|swift|kotlin|tensorflow|pytorch)\b/.test(t),
      tip: "List specific tools, languages, or platforms you know",
      weight: 18,
    },
    {
      label: "Work experience",
      pass: /\b(experience|employment|work history|professional background|worked at|worked for|position|role|job title|company|corp|inc\.|llc|ltd)\b/.test(t),
      tip: "Include a clear Work Experience section with company names",
      weight: 16,
    },
    {
      label: "Education section",
      pass: /\b(education|university|college|bachelor|master|degree|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.|gpa|graduated|diploma|certification|certificate)\b/.test(t),
      tip: "Add your education (degree, school, graduation year)",
      weight: 12,
    },
    {
      label: "Good resume length",
      pass: words.length >= 200 && words.length <= 1200,
      tip: words.length < 200 ? "Resume is too short — add more detail" : "Resume is very long — consider trimming to 1–2 pages",
      weight: 12,
    },
    {
      label: "Strong action verbs",
      pass: /\b(led|built|designed|developed|managed|created|implemented|launched|optimized|architected|drove|delivered|spearheaded|collaborated|established|achieved|improved|analyzed|executed|coordinated|scaled|automated|deployed|mentored|negotiated|secured|generated)\b/.test(t),
      tip: "Start bullet points with strong verbs (Led, Built, Improved…)",
      weight: 10,
    },
    {
      label: "Contact information",
      pass: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(text) || /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.test(text),
      tip: "Include your email address and phone number",
      weight: 8,
    },
    {
      label: "No obvious red flags",
      pass: !/(references available upon request|responsible for|duties included|i am a|to whom it may concern|dear sir|dear madam)/i.test(text),
      tip: 'Remove outdated phrases like "Responsible for" or "References available"',
      weight: 4,
    },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);
  return { score, checks };
}

function ResumeStrengthMeter({ resumeText, lm }: { resumeText: string; lm?: boolean }) {
  const { score, checks } = analyzeResume(resumeText);
  const color = score >= 71 ? "#10b981" : score >= 41 ? "#f59e0b" : "#ef4444";
  const label = score >= 71 ? "Strong" : score >= 41 ? "Fair" : "Weak";
  const r = 28, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const failing = checks.filter(c => !c.pass);
  const passing = checks.filter(c => c.pass);
  const t2 = lm ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)";
  const t3 = lm ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.28)";
  const bd = lm ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
  const bg = lm ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)";

  return (
    <div className="sidebar-card" style={{marginTop:0}}>
      <div className="sidebar-card-title">📈 Resume Strength</div>
      <div className="sidebar-card-sub">Analysis based on your uploaded resume</div>

      {/* Circle meter */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{flexShrink:0}}>
          <circle cx="36" cy="36" r={r} fill="none" stroke={lm?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.07)"} strokeWidth="5"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 36 36)"
            style={{transition:"stroke-dashoffset .8s ease"}}/>
          <text x="36" y="33" textAnchor="middle" fontSize="16" fontWeight="800" fill={color} fontFamily="'DM Sans',sans-serif">{score}</text>
          <text x="36" y="46" textAnchor="middle" fontSize="8" fontWeight="600" fill={color} fontFamily="'DM Sans',sans-serif" opacity="0.8">{label.toUpperCase()}</text>
        </svg>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:color,marginBottom:4}}>{label} Resume</div>
          <div style={{fontSize:11,color:t3,lineHeight:1.5}}>
            {passing.length}/{checks.length} checks passed
          </div>
          <div style={{marginTop:7,height:4,background:bg,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${score}%`,background:`linear-gradient(90deg,${color},${color}bb)`,borderRadius:99,transition:"width .8s ease"}}/>
          </div>
        </div>
      </div>

      {/* Issues to fix */}
      {failing.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:2}}>Fix these</div>
          {failing.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,background:`rgba(239,68,68,0.06)`,border:`1px solid rgba(239,68,68,0.15)`,borderRadius:7,padding:"6px 9px"}}>
              <span style={{fontSize:10,color:"#ef4444",flexShrink:0,marginTop:1}}>✗</span>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#ef4444",marginBottom:1}}>{c.label}</div>
                <div style={{fontSize:10,color:t2,lineHeight:1.4}}>{c.tip}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Passing checks */}
      {passing.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:2}}>Looking good</div>
          {passing.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 0"}}>
              <span style={{fontSize:10,color:"#10b981",flexShrink:0}}>✓</span>
              <span style={{fontSize:11,color:t2}}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
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

const TRACKER_COLS: { status: AppStatus; label: string; icon: string; color: string; border: string; bg: string }[] = [
  { status:"Saved",      label:"Saved",       icon:"🔖", color:"#94a3b8", border:"rgba(148,163,184,0.2)", bg:"rgba(148,163,184,0.06)" },
  { status:"Applied",    label:"Applied",     icon:"📤", color:"#818cf8", border:"rgba(99,102,241,0.2)",   bg:"rgba(99,102,241,0.05)"   },
  { status:"Interviewing",label:"Interview",  icon:"🎯", color:"#f59e0b", border:"rgba(245,158,11,0.2)",  bg:"rgba(245,158,11,0.05)"  },
  { status:"Offer",      label:"Offer",       icon:"🎉", color:"#10b981", border:"rgba(16,185,129,0.2)",  bg:"rgba(16,185,129,0.05)"  },
  { status:"Rejected",   label:"Rejected",    icon:"❌", color:"#ef4444", border:"rgba(239,68,68,0.2)",   bg:"rgba(239,68,68,0.05)"   },
];

function TrackerCard({ app, onUpdateStatus, onUpdateNotes, onRemove, lm }: { app: TrackedApp; onUpdateStatus:(s:AppStatus)=>void; onUpdateNotes:(n:string)=>void; onRemove:()=>void; lm?:boolean }) {
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)",t4:lm?"rgba(0,0,0,0.28)":"rgba(255,255,255,0.22)",bd:lm?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.07)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.025)"};
  const col = TRACKER_COLS.find(c=>c.status===app.status)!;
  const prev = TRACKER_COLS[TRACKER_COLS.findIndex(c=>c.status===app.status)-1];
  const next = TRACKER_COLS[TRACKER_COLS.findIndex(c=>c.status===app.status)+1];
  return(
    <div style={{background:t.bg,borderRadius:8,padding:12,border:`1px solid ${col.border}`,display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{width:30,height:30,borderRadius:6,border:`1px solid ${t.bd}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg,flexShrink:0}}>
          {app.job.employer_logo?<img src={app.job.employer_logo} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:11,fontWeight:700,color:t.t3}}>{app.job.employer_name?.[0]}</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:t.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.job.job_title}</div>
          <div style={{fontSize:10,color:col.color,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.job.employer_name}</div>
        </div>
        <button style={{background:"none",border:"none",cursor:"pointer",color:t.t4,fontSize:12,padding:0,flexShrink:0}} onClick={onRemove}>✕</button>
      </div>
      <div style={{fontSize:10,color:t.t4}}>Added {new Date(app.appliedDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
      <div style={{display:"flex",gap:4}}>
        {prev&&<button style={{flex:1,padding:"4px 0",border:`1px solid ${prev.border}`,borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",background:"transparent",color:prev.color,fontFamily:"inherit"}} onClick={()=>onUpdateStatus(prev.status)}>← {prev.label}</button>}
        {next&&<button style={{flex:1,padding:"4px 0",border:`1px solid ${next.border}`,borderRadius:4,fontSize:9,fontWeight:700,cursor:"pointer",background:next.bg,color:next.color,fontFamily:"inherit"}} onClick={()=>onUpdateStatus(next.status)}>{next.label} →</button>}
      </div>
      <textarea style={{width:"100%",boxSizing:"border-box",background:t.bg,border:`1px solid ${t.bd}`,borderRadius:6,padding:"5px 8px",fontSize:10,fontFamily:"inherit",resize:"none",outline:"none",color:t.t2}} placeholder="Notes…" value={app.notes} onChange={e=>onUpdateNotes(e.target.value)} rows={2}/>
      {app.job.job_apply_link&&<a href={app.job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#818cf8",fontWeight:600,textDecoration:"none"}}>View Job →</a>}
    </div>
  );
}

function TrackerView({ apps, onUpdateStatus, onUpdateNotes, onRemove, lm }: { apps: TrackedApp[]; onUpdateStatus:(id:string,s:AppStatus)=>void; onUpdateNotes:(id:string,n:string)=>void; onRemove:(id:string)=>void; lm?:boolean }) {
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.35)",t4:lm?"rgba(0,0,0,0.28)":"rgba(255,255,255,0.22)",bd:lm?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.06)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.025)"};
  if(apps.length===0) return(
    <div style={{textAlign:"center",padding:"64px 24px",background:t.bg,borderRadius:12,border:`1px dashed ${t.bd}`}}>
      <div style={{fontSize:36,marginBottom:14}}>📋</div>
      <h3 style={{fontSize:16,color:t.t3,marginBottom:8}}>No applications tracked yet</h3>
      <p style={{fontSize:13,color:t.t4}}>Click "+ Track" on any job card to add it here.</p>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* SUMMARY BAR */}
      <div style={{display:"flex",alignItems:"center",gap:0,background:t.bg,border:`1px solid ${t.bd}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",textAlign:"center",borderRight:`1px solid ${t.bd}`}}>
          <div style={{fontSize:24,fontWeight:800,color:t.t1}}>{apps.length}</div>
          <div style={{fontSize:10,color:t.t3}}>Total</div>
        </div>
        {TRACKER_COLS.map(c=>(
          <div key={c.status} style={{flex:1,padding:"14px 8px",textAlign:"center",borderRight:`1px solid ${t.bd}`}}>
            <div style={{fontSize:20,fontWeight:800,color:c.color}}>{apps.filter(a=>a.status===c.status).length}</div>
            <div style={{fontSize:10,color:t.t3}}>{c.label}</div>
          </div>
        ))}
      </div>
      {/* KANBAN COLUMNS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {TRACKER_COLS.map(col=>(
          <div key={col.status} style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,fontWeight:700,padding:"7px 10px",borderRadius:6,border:`1.5px solid ${col.border}`,background:col.bg,color:col.color,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>{col.icon} {col.label}</span>
              <span style={{fontSize:14,fontWeight:800}}>{apps.filter(a=>a.status===col.status).length}</span>
            </div>
            {apps.filter(a=>a.status===col.status).map(app=>(
              <TrackerCard key={app.id} app={app} onUpdateStatus={s=>onUpdateStatus(app.id,s)} onUpdateNotes={n=>onUpdateNotes(app.id,n)} onRemove={()=>onRemove(app.id)} lm={lm}/>
            ))}
            {apps.filter(a=>a.status===col.status).length===0&&(
              <div style={{textAlign:"center",padding:"20px 8px",color:t.t4,fontSize:10,background:t.bg,borderRadius:6,border:`1px dashed ${t.bd}`}}>Empty</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverLetterModal({ job, coverLetter, onClose }: { job: Job; coverLetter: string; onClose: ()=>void }) {
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",fn);
    return()=>window.removeEventListener("keydown",fn);
  },[onClose]);
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div style={{fontSize:32}}>✉️</div>
          <div><h2 className="modal-title">Cover Letter</h2><p className="modal-sub">{job.job_title} at {job.employer_name}</p></div>
        </div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.85,whiteSpace:"pre-wrap",background:"rgba(255,255,255,0.02)",borderRadius:10,padding:18,maxHeight:340,overflowY:"auto",border:"1px solid rgba(255,255,255,0.05)",marginBottom:14}}>{coverLetter}</div>
        <div style={{display:"flex",gap:10}}>
          <button className="ghost-btn" style={{flex:1}} onClick={()=>{navigator.clipboard.writeText(coverLetter);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?"✓ Copied!":"📋 Copy to clipboard"}</button>
          {job.job_apply_link&&<a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{flex:2,textDecoration:"none",textAlign:"center"}}>Apply Now →</a>}
        </div>
      </div>
    </div>
  );
}

function SkillGapModal({ job, result, onClose }: { job: Job; result: SkillGapResult; onClose: ()=>void }) {
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",fn);
    return()=>window.removeEventListener("keydown",fn);
  },[onClose]);
  const platformColor=(p:string)=>{
    if(/youtube/i.test(p))     return "#ef4444";
    if(/coursera/i.test(p))    return "#0056d2";
    if(/udemy/i.test(p))       return "#a435f0";
    if(/linkedin/i.test(p))    return "#0077b5";
    if(/freecodecamp/i.test(p))return "#0a0a23";
    if(/edx/i.test(p))         return "#02262b";
    return "#818cf8";
  };
  return(
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div style={{fontSize:32}}>🧠</div>
          <div><h2 className="modal-title">Skill Gap Analysis</h2><p className="modal-sub">{job.job_title} · {job.employer_name}</p></div>
        </div>

        {/* STRONG SKILLS */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#10b981",marginBottom:10}}>✅ Your Strong Skills</div>
          {result.strongSkills.length>0
            ? <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {result.strongSkills.map((s,i)=>(
                  <span key={i} style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.2)"}}>{s}</span>
                ))}
              </div>
            : <p style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No strong matches detected — try uploading a more detailed resume.</p>
          }
        </div>

        {/* MISSING SKILLS */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#ef4444",marginBottom:10}}>⚠️ Missing Skills</div>
          {result.missingSkills.length>0
            ? <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {result.missingSkills.map((s,i)=>(
                  <span key={i} style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:6,background:"rgba(239,68,68,0.08)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.18)"}}>{s}</span>
                ))}
              </div>
            : <p style={{fontSize:12,color:"rgba(255,255,255,0.25)"}}>No major skill gaps found!</p>
          }
        </div>

        {/* COURSES */}
        {result.courses.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"#f59e0b",marginBottom:10}}>📚 Recommended Courses</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {result.courses.map((c,i)=>(
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",textDecoration:"none",transition:"border-color .15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.14)")}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.07)")}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:platformColor(c.platform),flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>{c.platform} · fills gap: <span style={{color:"#f59e0b"}}>{c.skill}</span></div>
                  </div>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",flexShrink:0}}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getDifficultyBadge(title?: string, desc?: string): { label: string; color: string; bg: string; border: string } {
  const t = (title||"").toLowerCase();
  const d = (desc||"").toLowerCase();
  const combined = t + " " + d;
  if (/entry[\s-]level|no experience|no prior experience|junior|jr\.?|new grad|recent grad|associate/.test(combined))
    return { label: "🟢 Easy Apply", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" };
  if (/\bsenior\b|\bsr\.?\b|\blead\b|\bmanager\b|\bdirector\b|\bhead of\b|\bprincipal\b|\bstaff\b|\b[5-9]\+\s*years?\b|\b1[0-9]\+\s*years?\b/.test(combined))
    return { label: "🔴 Competitive", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" };
  return { label: "🟡 Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" };
}

function getVisaBadges(desc?: string): { label: string; color: string; bg: string; border: string }[] {
  if (!desc) return [];
  const d = desc.toLowerCase();
  const badges = [];
  const hasClearance = /security clearance|clearance required|top secret|ts\/sci|secret clearance|dod clearance|government clearance/.test(d);
  const hasH1b = /h[\-]?1b (sponsor|transfer|visa)|sponsor.*h[\-]?1b|visa sponsorship (is )?available|open to sponsorship|will (consider|sponsor).*visa|sponsoring.*visa|will sponsor|sponsorship available|visa support|open to all candidates|international candidates welcome|we (support|assist with) (visa|immigration)|relocation (and )?visa|global candidates|candidates from all countries/.test(d);
  if (hasClearance) badges.push({ label: "🔒 Clearance Req.", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" });
  if (hasH1b) badges.push({ label: "✅ H1B Friendly", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" });
  return badges;
}

// JOB CARD — 2x3 grid, highlighted Match + Prep
function JobCard({ job, saved, onToggleSave, onClick, onTailor, onInterview, onCoverLetter, onSkillGap, earlyBirdMode, resumeReady, isTracked, onTrack, onMatchResume, lm }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClick:()=>void;onTailor:()=>void;onInterview:()=>void;onCoverLetter:()=>void;onSkillGap:()=>void;earlyBirdMode:boolean;resumeReady:boolean;isTracked:boolean;onTrack:()=>void;onMatchResume:()=>void;lm?:boolean;
}) {
  const loc=[job.job_city,job.job_state].filter(Boolean).join(", ")||job.job_country||"";
  const badge=empBadge(job.job_employment_type);
  const hot=isHot(job.job_posted_at_datetime_utc);
  const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  const comp=getCompetitionLabel(hours);
  const visaBadges=getVisaBadges(job.job_description);
  const diffBadge=getDifficultyBadge(job.job_title,job.job_description);
  const baseChance=diffBadge.label.startsWith("🟢")?80:diffBadge.label.startsWith("🔴")?30:55;
  const successChance=job.match?Math.min(99,Math.round(baseChance*0.4+job.match.matchScore*0.6)):baseChance;
  const successColor=successChance>=70?"#10b981":successChance>=50?"#f59e0b":"#ef4444";
  const successBg=successChance>=70?"rgba(16,185,129,0.08)":successChance>=50?"rgba(245,158,11,0.08)":"rgba(239,68,68,0.08)";
  const successBorder=successChance>=70?"rgba(16,185,129,0.22)":successChance>=50?"rgba(245,158,11,0.22)":"rgba(239,68,68,0.22)";
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.3)",t4:lm?"rgba(0,0,0,0.28)":"rgba(255,255,255,0.22)",bd:lm?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.06)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.03)"};

  return(
    <div className={`job-card${hot&&earlyBirdMode?" job-card-hot":""}`} style={{display:"flex",flexDirection:"column",gap:12,position:"relative"}}>
      {/* HOT BANNER */}
      {hot&&earlyBirdMode&&<div style={{position:"absolute",top:0,left:0,right:0,background:"linear-gradient(135deg,rgba(239,68,68,0.65),rgba(245,158,11,0.65))",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",textAlign:"center",letterSpacing:".3px"}}>🔥 HOT — under 6h old</div>}

      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginTop:hot&&earlyBirdMode?18:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,cursor:"pointer",minWidth:0}} onClick={onClick}>
          <div style={{width:42,height:42,borderRadius:8,border:`1px solid ${t.bd}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg,flexShrink:0}}>
            {job.employer_logo?<img src={job.employer_logo} alt={job.employer_name} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:17,fontWeight:700,color:"rgba(99,102,241,0.5)"}}>{job.employer_name?.[0]??"?"}</span>}
          </div>
          <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
            <h3 style={{fontSize:14,fontWeight:700,color:t.t1,lineHeight:1.3,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.job_title}</h3>
            <p style={{fontSize:12,color:"#818cf8",fontWeight:500,marginBottom:1}}>{job.employer_name}</p>
            <p style={{fontSize:10,color:t.t4}}>{job.job_is_remote?"🌐 Remote":loc||"Location not specified"}</p>
          </div>
        </div>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,opacity:0.5,flexShrink:0}} onClick={e=>{e.stopPropagation();onToggleSave();}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved?"#818cf8":"none"} stroke={saved?"#818cf8":t.t3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </button>
      </div>

      {/* COMPETITION + TIME ROW */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:6,background:comp.bg,border:`1px solid ${comp.color}18`}}>
          <span style={{fontSize:10,fontWeight:700,color:comp.color}}>{comp.label}</span>
        </div>
        <span style={{fontSize:10,color:t.t4}}>{timeAgo(job.job_posted_at_datetime_utc)}</span>
      </div>

      {/* MATCH SCORE (if available) */}
      {(job.match||job.matchLoading)&&(
        <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:8,padding:"8px 12px",border:`1px solid ${job.match?scoreColor(job.match.matchScore)+"22":"rgba(99,102,241,0.15)"}`,background:job.match?scoreColor(job.match.matchScore)+"07":"rgba(99,102,241,0.04)"}}>
          {job.matchLoading?<><div className="spin-sm"/><span style={{fontSize:11,color:"#818cf8"}}>Analyzing…</span></>:<><ScoreRing score={job.match!.matchScore}/><div><div style={{fontSize:12,fontWeight:700,color:scoreColor(job.match!.matchScore)}}>{job.match!.matchLabel} Match — {job.match!.matchScore}%</div><div style={{fontSize:10,color:t.t4,marginTop:1}}>{job.match!.matchedSkills.slice(0,2).join(" · ")}</div></div></>}
        </div>
      )}

      {/* NO RESUME PLACEHOLDER */}
      {!job.match&&!job.matchLoading&&!resumeReady&&(
        <div style={{display:"flex",alignItems:"center",gap:8,borderRadius:8,padding:"7px 12px",border:`1px solid ${t.bd}`,background:t.bg}}>
          <span style={{fontSize:11,color:t.t4}}>-- Match</span>
          <span style={{fontSize:10,color:t.t4}}>· Upload resume to see your score</span>
        </div>
      )}

      {/* BADGES */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {badge&&<span className="badge badge-type">{badge}</span>}
        {job.job_is_remote&&<span className="badge badge-remote">Remote</span>}
        {(job.job_min_salary||job.job_max_salary)&&<span className="badge badge-salary">💰 {job.job_salary_currency??"$"}{job.job_min_salary?.toLocaleString()}–{job.job_max_salary?.toLocaleString()}</span>}
        <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:diffBadge.bg,color:diffBadge.color,border:`1px solid ${diffBadge.border}`}}>{diffBadge.label}</span>
        <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:successBg,color:successColor,border:`1px solid ${successBorder}`}}>🎯 {successChance}% Chance</span>
        {visaBadges.map((vb,i)=><span key={i} style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:vb.bg,color:vb.color,border:`1px solid ${vb.border}`}}>{vb.label}</span>)}
      </div>

      {/* ACTION BUTTONS — Match & Prep highlighted */}
      <div className="action-btns" style={{borderTop:`1px solid ${t.bd}`,paddingTop:10,display:"flex",gap:5,flexWrap:"wrap"}}>
        {/* MATCH */}
        <button className={`action-card-btn match-btn${job.match?" done":""}`} onClick={e=>{e.stopPropagation();onMatchResume();}} disabled={job.matchLoading} title="AI scores your resume vs this job">
          {job.matchLoading?<><div className="spin-sm"/>Matching…</>:job.match?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{` ${job.match.matchScore}%`}</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Match</>}
        </button>
        {/* PREP */}
        <button className={`action-card-btn interview-btn${job.interview?" done":""}`} onClick={e=>{e.stopPropagation();onInterview();}} disabled={job.interviewLoading} title="AI interview questions for this job">
          {job.interviewLoading?<><div className="spin-sm"/>Loading…</>:job.interview?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Prep Done</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> Prep</>}
        </button>
        {/* COVER */}
        <button className={`action-card-btn cover-btn${job.coverLetter?" done":""}`} onClick={e=>{e.stopPropagation();onCoverLetter();}} disabled={job.coverLetterLoading} title="AI generates a cover letter for this job">
          {job.coverLetterLoading?<><div className="spin-sm"/>Writing…</>:job.coverLetter?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Letter</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Cover</>}
        </button>
        {/* SKILLS */}
        <button className={`action-card-btn skillgap-btn${job.skillGap?" done":""}`} onClick={e=>{e.stopPropagation();onSkillGap();}} disabled={job.skillGapLoading} title="See skill gaps and recommended courses">
          {job.skillGapLoading?<><div className="spin-sm"/>Analyzing…</>:job.skillGap?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Gaps</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Skills</>}
        </button>
        {/* TAILOR */}
        <button className={`action-card-btn tailor-btn${job.tailor?" done":""}`} onClick={e=>{e.stopPropagation();onTailor();}} disabled={job.tailorLoading} title="AI tailors your resume bullets">
          {job.tailorLoading?<><div className="spin-sm"/>Tailoring…</>:job.tailor?<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Tailored</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> Tailor</>}
        </button>
        {/* TRACK */}
        <button className={`action-card-btn track-btn${isTracked?" tracked":""}`} onClick={e=>{e.stopPropagation();onTrack();}} title="Add to application tracker">
          {isTracked?<><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> Saved</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> Track</>}
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
  const [coverLetterJob,setCoverLetterJob]=useState<JobWithMatch|null>(null);
  const [skillGapJob,setSkillGapJob]=useState<JobWithMatch|null>(null);
  const [activeTab,setActiveTab]=useState<TabType>("results");const [currentPage,setCurrentPage]=useState(1);
  const [hasSearched,setHasSearched]=useState(false);const [filterType,setFilterType]=useState("ALL");
  const [filterRemote,setFilterRemote]=useState(false);const [filterDate,setFilterDate]=useState("ANY");
  const [resumeText,setResumeText]=useState("");const [resumeFileName,setResumeFileName]=useState("");
  const [isMatching,setIsMatching]=useState(false);const [matchProgress,setMatchProgress]=useState(0);
  const [autoOpenDone,setAutoOpenDone]=useState(false);const [trackedApps,setTrackedApps]=useState<TrackedApp[]>([]);
  const [mounted,setMounted]=useState(false);const [userEmail,setUserEmail]=useState("");
  const [refreshToast,setRefreshToast]=useState(false);const [isRefreshing,setIsRefreshing]=useState(false);
  const [darkMode,setDarkMode]=useState(true);
  const [showWelcomeTour,setShowWelcomeTour]=useState(false);
  const [onboardStep,setOnboardStep]=useState(1);
  const [onboardRole,setOnboardRole]=useState("");
  const [onboardLocation,setOnboardLocation]=useState("");
  const [onboardParsing,setOnboardParsing]=useState(false);
  const [showOnboard,setShowOnboard]=useState(false);
  const [showResumeHistory,setShowResumeHistory]=useState(false);
  const [resumeHistory,setResumeHistory]=useState<{id:string;file_name:string;created_at:string;resume_text:string}[]>([]);
  const [showMobileSearch,setShowMobileSearch]=useState(false);
  const [showMobileSidebar,setShowMobileSidebar]=useState(false);
  const [shareToast,setShareToast]=useState(false);

  const lsGet=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");return localStorage.getItem(uid?`${key}_${uid}`:key);};
  const lsSet=(key:string,val:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.setItem(uid?`${key}_${uid}`:key,val);};
  const lsRemove=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.removeItem(uid?`${key}_${uid}`:key);localStorage.removeItem(key);};

  useEffect(()=>{
    setMounted(true);
    const savedTheme=localStorage.getItem("applysmart_theme");
    if(savedTheme==="light")setDarkMode(false);
    try{const t=localStorage.getItem("applysmart_tracker");if(t)setTrackedApps(JSON.parse(t));}catch{}
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

  const fetchJobs=async(mode:"normal"|"earlybird",role?:string,loc?:string)=>{
    const r=role??jobRole;const l=loc??location;
    if(!r||!l)return;
    if(mode==="normal"){setLoading(true);setJobs([]);}else{setEbLoading(true);setEarlyBirdJobs([]);setAutoOpenDone(false);}
    try{const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole:r,location:l,earlyBird:mode==="earlybird"})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();if(mode==="normal")setJobs(data?.data||[]);else setEarlyBirdJobs(data?.data||[]);}catch(err){console.error("fetchJobs error:",err);}
    if(mode==="normal")setLoading(false);else setEbLoading(false);
  };

  const handleSearch=async()=>{
    console.log("SEARCH CLICKED",{jobRole,location});
    if(!jobRole||!location){alert("Please enter job role and location");return;}
    localStorage.setItem("applysmart_jobRole",jobRole);
    localStorage.setItem("applysmart_location",location);
    setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
    await fetchJobs("normal",jobRole,location);
  };
  const handleEarlyBirdSearch=async()=>{
    if(!jobRole||!location){alert("Please enter job role and location first");return;}
    localStorage.setItem("applysmart_jobRole",jobRole);
    localStorage.setItem("applysmart_location",location);
    setHasSearched(true);setActiveTab("earlybird");setCurrentPage(1);
    await fetchJobs("earlybird",jobRole,location);
  };

  // Mobile: await the search so the button shows "Searching…" before the panel closes
  const handleMobileSearch=async()=>{
    const role=jobRole;const loc=location;
    if(!role||!loc){alert("Please enter job role and location");return;}
    setShowMobileSearch(false);
    localStorage.setItem("applysmart_jobRole",role);
    localStorage.setItem("applysmart_location",loc);
    setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
    await fetchJobs("normal",role,loc);
  };
  const handleMobileEarlyBird=async()=>{
    const role=jobRole;const loc=location;
    if(!role||!loc){alert("Please enter job role and location first");return;}
    setShowMobileSearch(false);
    localStorage.setItem("applysmart_jobRole",role);
    localStorage.setItem("applysmart_location",loc);
    setHasSearched(true);setActiveTab("earlybird");setCurrentPage(1);
    await fetchJobs("earlybird",role,loc);
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

  const handleSkillGap=async(job:JobWithMatch)=>{
    if(job.skillGap){setSkillGapJob(job);return;}
    if(!resumeText){alert("Upload your resume first!");return;}
    const isEb=activeTab==="earlybird";const setList=isEb?setEarlyBirdJobs:setJobs;const list=isEb?earlyBirdJobs:jobs;
    setList(list.map(j=>j.job_id===job.job_id?{...j,skillGapLoading:true}:j));
    try{
      const res=await fetch("/api/skillgap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});
      const skillGap:SkillGapResult=await res.json();
      const updated={...job,skillGap,skillGapLoading:false};
      setList(list.map(j=>j.job_id===job.job_id?updated:j));
      setSkillGapJob(updated);
    }catch{setList(list.map(j=>j.job_id===job.job_id?{...j,skillGapLoading:false}:j));}
  };

  const handleCoverLetter=async(job:JobWithMatch)=>{
    if(job.coverLetter){setCoverLetterJob(job);return;}
    if(!resumeText){alert("Upload your resume first!");return;}
    const isEb=activeTab==="earlybird";const setList=isEb?setEarlyBirdJobs:setJobs;const list=isEb?earlyBirdJobs:jobs;
    setList(list.map(j=>j.job_id===job.job_id?{...j,coverLetterLoading:true}:j));
    try{const res=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});const data:MatchResult=await res.json();const updated={...job,coverLetter:data.coverLetter,coverLetterLoading:false};setList(list.map(j=>j.job_id===job.job_id?updated:j));setCoverLetterJob(updated);}
    catch{setList(list.map(j=>j.job_id===job.job_id?{...j,coverLetterLoading:false}:j));}
  };

  const handleTailor=async(job:JobWithMatch)=>{
    if(job.tailor){setTailorJob(job);return;}
    if(!resumeText){alert("Upload your resume first!");return;}
    const isEb=activeTab==="earlybird";const setList=isEb?setEarlyBirdJobs:setJobs;const list=isEb?earlyBirdJobs:jobs;
    setList(list.map(j=>j.job_id===job.job_id?{...j,tailorLoading:true}:j));
    try{const res=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});const tailor:TailorResult=await res.json();const updated={...job,tailor,tailorLoading:false};setList(list.map(j=>j.job_id===job.job_id?updated:j));setTailorJob(updated);}catch{setList(list.map(j=>j.job_id===job.job_id?{...j,tailorLoading:false}:j));}
  };

  const handleInterview=(job:JobWithMatch)=>{
    setInterviewJob(job);
  };

  const addToTracker=(job:Job)=>{if(trackedApps.find(a=>a.job.job_id===job.job_id))return;setTrackedApps(prev=>{const next=[...prev,{job,status:"Saved" as AppStatus,appliedDate:new Date().toISOString(),notes:"",id:job.job_id+Date.now()}];localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;});};
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
      const toured=localStorage.getItem(`applysmart_toured_${uid}`);
      if(!toured){setShowWelcomeTour(true);}
    }
    const role=onboardRole||jobRole;const loc=onboardLocation||location;
    if(role)setJobRole(role);
    if(loc)setLocation(loc);
    setShowOnboard(false);
    // Auto-search with the onboarding role/location so user sees results immediately
    if(role&&loc){
      localStorage.setItem("applysmart_jobRole",role);
      localStorage.setItem("applysmart_location",loc);
      setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
      await fetchJobs("normal",role,loc);
    }
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

  const handleRefresh=async()=>{
    if(!hasSearched||!jobRole||!location||isRefreshing)return;
    setIsRefreshing(true);
    try{
      const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole,location,earlyBird:activeTab==="earlybird"})});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const newJobs:JobWithMatch[]=data?.data||[];
      if(activeTab==="earlybird"){
        if(newJobs.length>earlyBirdJobs.length){setEarlyBirdJobs(newJobs);setRefreshToast(true);setTimeout(()=>setRefreshToast(false),3000);}
      }else{
        if(newJobs.length>jobs.length){setJobs(newJobs);setRefreshToast(true);setTimeout(()=>setRefreshToast(false),3000);}
      }
    }catch(err){console.error("handleRefresh error:",err);}
    setIsRefreshing(false);
  };

  const jobRoleRef=useRef(jobRole);const locationRef=useRef(location);const activeTabRef=useRef(activeTab);const hasSearchedRef=useRef(hasSearched);
  useEffect(()=>{jobRoleRef.current=jobRole;locationRef.current=location;activeTabRef.current=activeTab;hasSearchedRef.current=hasSearched;});

  useEffect(()=>{
    if(!hasSearched)return;
    const interval=setInterval(async()=>{
      if(!hasSearchedRef.current||!jobRoleRef.current||!locationRef.current)return;
      const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole:jobRoleRef.current,location:locationRef.current,earlyBird:activeTabRef.current==="earlybird"})}).catch(()=>null);
      if(!res||!res.ok)return;
      const data=await res.json().catch(()=>null);
      if(!data)return;
      const newJobs:JobWithMatch[]=data?.data||[];
      if(activeTabRef.current==="earlybird"){if(newJobs.length>0)setEarlyBirdJobs(prev=>{if(newJobs.length>prev.length){setRefreshToast(true);setTimeout(()=>setRefreshToast(false),3000);return newJobs;}return prev;});}
      else{setJobs(prev=>{if(newJobs.length>prev.length){setRefreshToast(true);setTimeout(()=>setRefreshToast(false),3000);return newJobs;}return prev;});}
    },3*60*1000);
    return()=>clearInterval(interval);
  },[hasSearched]);

  const toggleTheme=()=>{
    const next=!darkMode;
    setDarkMode(next);
    localStorage.setItem("applysmart_theme",next?"dark":"light");
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
    <div data-theme={darkMode?"dark":"light"}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#060608;color:#fff;min-height:100vh;overflow-x:hidden}
        body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.35}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.2);border-radius:4px}

        /* TOPBAR */
        .topbar{background:rgba(6,6,8,0.92);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 28px;height:60px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:200;backdrop-filter:blur(24px)}
        .topbar-logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;flex-shrink:0;margin-right:8px;cursor:pointer}
        .topbar-logo span{font-style:italic;background:linear-gradient(135deg,#818cf8,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .topbar-search{display:flex;align-items:center;gap:8px;flex:1;max-width:580px}
        .topbar-input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:9px 14px;font-size:13px;font-family:'DM Sans',sans-serif;color:#fff;outline:none;transition:all .2s;flex:1}
        .topbar-input::placeholder{color:rgba(255,255,255,0.22)}
        .topbar-input:focus{border-color:rgba(99,102,241,0.45);background:rgba(99,102,241,0.06);box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
        .search-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:all .2s}
        .search-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(99,102,241,0.3)}
        .search-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none}
        .eb-btn{background:rgba(251,191,36,0.08);color:#fbbf24;border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:9px 16px;font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:all .2s}
        .eb-btn:hover{background:rgba(251,191,36,0.14);transform:translateY(-1px)}
        .eb-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none}
        .refresh-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:9px 12px;font-size:13px;color:rgba(255,255,255,0.45);cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px;white-space:nowrap;font-family:'DM Sans',sans-serif}
        .refresh-btn:hover{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);color:#818cf8}
        .refresh-btn:disabled{opacity:0.35;cursor:not-allowed}
        .refresh-btn.spinning svg{animation:spin360 .8s linear infinite}
        @keyframes spin360{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(20px)}}
        .refresh-toast{position:fixed;bottom:28px;right:28px;background:rgba(10,10,16,0.95);border:1px solid rgba(52,211,153,0.3);border-radius:12px;padding:12px 18px;font-size:13px;font-weight:600;color:#34d399;display:flex;align-items:center;gap:8px;z-index:600;backdrop-filter:blur(16px);box-shadow:0 8px 32px rgba(0,0,0,0.5);animation:toastIn .25s ease both}
        .topbar-right{display:flex;align-items:center;gap:10px;margin-left:auto;flex-shrink:0}
        .nav-pill{font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px}
        .pill-eb{background:rgba(251,191,36,0.08);color:#fbbf24;border:1px solid rgba(251,191,36,0.2)}
        .pill-tracker{background:rgba(99,102,241,0.1);color:#818cf8;border:1px solid rgba(99,102,241,0.2)}
        .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#ec4899);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
        .logout-btn{font-size:12px;font-weight:500;color:rgba(255,255,255,0.3);background:none;border:1px solid rgba(255,255,255,0.09);border-radius:8px;padding:5px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
        .logout-btn:hover{color:#ef4444;border-color:rgba(239,68,68,0.3)}

        /* LAYOUT */
        .app-layout{display:flex;min-height:calc(100vh - 60px);position:relative;z-index:1}
        .sidebar{width:232px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.06);padding:18px 14px;display:flex;flex-direction:column;gap:12px;position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto}
        .content{flex:1;min-width:0;padding:24px 26px;max-width:calc(100vw - 232px)}

        /* SIDEBAR */
        .sidebar-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;transition:border-color .2s}
        .sidebar-card:hover{border-color:rgba(255,255,255,0.12)}
        .sidebar-card-title{font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:4px;letter-spacing:0.2px}
        .sidebar-card-sub{font-size:11px;color:rgba(255,255,255,0.28);margin-bottom:10px;line-height:1.5}
        .resume-drop{border:1.5px dashed rgba(99,102,241,0.25);border-radius:12px;padding:18px 10px;text-align:center;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(99,102,241,0.55);background:rgba(99,102,241,0.06)}
        .dark-input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:9px 12px;font-size:12px;font-family:'DM Sans',sans-serif;color:#fff;outline:none;transition:all .2s;margin-bottom:6px}
        .dark-input::placeholder{color:rgba(255,255,255,0.2)}
        .dark-input:focus{border-color:rgba(99,102,241,0.45);box-shadow:0 0 0 3px rgba(99,102,241,0.1)}
        .gradient-btn{width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:10px;font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s}
        .gradient-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(99,102,241,0.3)}
        .gradient-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none}
        .ghost-btn{font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);background:none;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:5px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
        .ghost-btn:hover{color:rgba(255,255,255,0.75);border-color:rgba(255,255,255,0.2)}
        .filter-label{font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;margin-top:10px}
        .filter-select{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:8px 12px;font-size:11px;font-family:'DM Sans',sans-serif;color:rgba(255,255,255,0.55);cursor:pointer;outline:none}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.4);margin-top:10px}
        .toggle{width:34px;height:19px;background:rgba(255,255,255,0.1);border-radius:10px;position:relative;cursor:pointer;transition:background .2s;border:none;outline:none;flex-shrink:0}
        .toggle.on{background:linear-gradient(135deg,#6366f1,#8b5cf6)}
        .toggle::after{content:'';position:absolute;width:13px;height:13px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.3)}
        .toggle.on::after{left:18px}

        /* TABS */
        .tabs-row{display:flex;gap:2px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.07);padding-bottom:0}
        .tab{padding:10px 16px;border:none;border-bottom:2px solid transparent;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;background:transparent;color:rgba(255,255,255,0.3);margin-bottom:-1px;white-space:nowrap;letter-spacing:0.1px}
        .tab.active{color:#fff;border-bottom-color:#818cf8}
        .tab.tab-eb.active{color:#fbbf24;border-bottom-color:#fbbf24}
        .tab.tab-tracker.active{color:#818cf8;border-bottom-color:#818cf8}
        .tab.tab-analytics.active{color:#34d399;border-bottom-color:#34d399}
        .tab:hover:not(.active){color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.03);border-radius:6px 6px 0 0}

        /* JOB GRID */
        .jobs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media(max-width:1200px){.jobs-grid{grid-template-columns:repeat(2,1fr)}}
        .job-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;cursor:default;transition:all .2s}
        .job-card:hover{border-color:rgba(99,102,241,0.3);background:rgba(99,102,241,0.04);transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(99,102,241,0.1)}
        .job-card-hot{border-color:rgba(251,191,36,0.2)!important;background:rgba(251,191,36,0.02)!important}

        /* ACTION BUTTONS */
        .action-card-btn{flex:1;min-width:fit-content;border-radius:8px;padding:7px 8px;font-size:11px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid;transition:all .2s;white-space:nowrap}
        .action-card-btn:hover{transform:translateY(-1px)}

        /* MATCH */
        .action-card-btn.match-btn{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);color:#818cf8;box-shadow:0 0 12px rgba(99,102,241,0.08)}
        .action-card-btn.match-btn:hover{background:rgba(99,102,241,0.18);box-shadow:0 0 20px rgba(99,102,241,0.18)}
        .action-card-btn.match-btn.done{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.45);color:#a5b4fc}

        /* PREP */
        .action-card-btn.interview-btn{background:rgba(52,211,153,0.08);border-color:rgba(52,211,153,0.25);color:#34d399;box-shadow:0 0 10px rgba(52,211,153,0.06)}
        .action-card-btn.interview-btn:hover{background:rgba(52,211,153,0.15);box-shadow:0 0 18px rgba(52,211,153,0.14)}
        .action-card-btn.interview-btn.done{background:rgba(52,211,153,0.12);border-color:rgba(52,211,153,0.35);color:#34d399}

        /* SKILL GAP */
        .action-card-btn.skillgap-btn{background:rgba(139,92,246,0.09);border-color:rgba(139,92,246,0.28);color:#a78bfa}
        .action-card-btn.skillgap-btn:hover{background:rgba(139,92,246,0.16);box-shadow:0 0 18px rgba(139,92,246,0.14)}
        .action-card-btn.skillgap-btn.done{background:rgba(139,92,246,0.15);border-color:rgba(139,92,246,0.42);color:#a78bfa}

        /* COVER */
        .action-card-btn.cover-btn{background:rgba(236,72,153,0.08);border-color:rgba(236,72,153,0.25);color:#f472b6}
        .action-card-btn.cover-btn:hover{background:rgba(236,72,153,0.15);box-shadow:0 0 18px rgba(236,72,153,0.14)}
        .action-card-btn.cover-btn.done{background:rgba(236,72,153,0.14);border-color:rgba(236,72,153,0.42);color:#f472b6}

        /* TAILOR */
        .action-card-btn.tailor-btn{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.45)}
        .action-card-btn.tailor-btn:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7)}
        .action-card-btn.tailor-btn.done{background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.25);color:#fbbf24}

        /* TRACK */
        .action-card-btn.track-btn{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);flex:0;padding:7px 12px}
        .action-card-btn.track-btn:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6)}
        .action-card-btn.track-btn.tracked{background:rgba(52,211,153,0.09);border-color:rgba(52,211,153,0.25);color:#34d399}
        .action-card-btn:disabled{opacity:0.3;cursor:not-allowed;transform:none!important}

        /* BADGES */
        .badge{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px}
        .badge-type{background:rgba(129,140,248,0.1);color:#a5b4fc;border:1px solid rgba(129,140,248,0.2)}
        .badge-remote{background:rgba(52,211,153,0.08);color:#34d399;border:1px solid rgba(52,211,153,0.2)}
        .badge-salary{background:rgba(52,211,153,0.06);color:#34d399;border:1px solid rgba(52,211,153,0.12)}
        .badge-time{background:rgba(251,191,36,0.06);color:#fbbf24;border:1px solid rgba(251,191,36,0.15)}

        /* APPLY */
        .apply-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:12px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .2s;text-decoration:none;display:block;text-align:center}
        .apply-btn:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(99,102,241,0.35);opacity:0.92}
        .apply-btn-hot{background:linear-gradient(135deg,#ef4444,#fbbf24)!important}

        /* EB BANNER */
        .eb-banner{background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.12);border-radius:16px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}

        /* PAGINATION */
        .pagination{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:28px}
        .page-btn{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;color:rgba(255,255,255,0.35);transition:all .2s}
        .page-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7)}
        .page-btn.active{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.35);color:#818cf8;font-weight:700}
        .page-btn:disabled{opacity:.18;cursor:not-allowed}

        /* SKELETON */
        .skel{background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.6s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* SPINNERS */
        .spin{width:16px;height:16px;border:2px solid rgba(99,102,241,0.2);border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        .spin-sm{width:11px;height:11px;border:2px solid rgba(255,255,255,0.1);border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes simBounce{0%,80%,100%{transform:translateY(0);opacity:0.25}40%{transform:translateY(-5px);opacity:0.8}}

        /* MODALS */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(16px);animation:fi .18s}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .modal{background:#0a0a10;border:1px solid rgba(255,255,255,0.09);border-radius:20px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;padding:32px;position:relative;animation:su .22s ease;scrollbar-width:thin;box-shadow:0 40px 120px rgba(0,0,0,0.7)}
        @keyframes su{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:50%;width:30px;height:30px;font-size:12px;cursor:pointer;color:rgba(255,255,255,0.35);transition:all .2s;display:flex;align-items:center;justify-content:center}
        .modal-close:hover{background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.25)}
        .modal-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-logo{width:52px;height:52px;border-radius:12px;border:1px solid rgba(255,255,255,0.09);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);flex-shrink:0}
        .modal-logo img{width:100%;height:100%;object-fit:contain}
        .modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:4px}
        .modal-sub{font-size:13px;color:#818cf8;font-weight:500}
        .modal-tabs{display:flex;gap:3px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;margin-bottom:18px}
        .mtab{flex:1;padding:8px;border:none;border-radius:7px;font-size:11px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;background:transparent;color:rgba(255,255,255,0.3);transition:all .2s}
        .mtab.active{background:rgba(99,102,241,0.15);color:#a5b4fc;box-shadow:0 2px 8px rgba(99,102,241,0.15)}
        .btn-tracked{background:rgba(52,211,153,0.09)!important;border-color:rgba(52,211,153,0.25)!important;color:#34d399!important}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* THEME TOGGLE */
        .theme-toggle{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);transition:all .2s;flex-shrink:0}
        .theme-toggle:hover{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.3);color:#818cf8}

        /* LIGHT MODE */
        [data-theme="light"] body{background:#f4f5f9;color:#0f0f14}
        [data-theme="light"] .topbar{background:rgba(255,255,255,0.95);border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .topbar-logo{color:#0f0f14}
        [data-theme="light"] .topbar-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f0f14}
        [data-theme="light"] .topbar-input::placeholder{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .topbar-input:focus{background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.4)}
        [data-theme="light"] .refresh-btn{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:rgba(0,0,0,0.45)}
        [data-theme="light"] .theme-toggle{background:rgba(0,0,0,0.05);border-color:rgba(0,0,0,0.1);color:rgba(0,0,0,0.5)}
        [data-theme="light"] .theme-toggle:hover{background:rgba(99,102,241,0.1);color:#6366f1}
        [data-theme="light"] .logout-btn{color:rgba(0,0,0,0.35);border-color:rgba(0,0,0,0.1)}
        [data-theme="light"] .nav-pill.pill-eb{background:rgba(251,191,36,0.12)}
        [data-theme="light"] .nav-pill.pill-tracker{background:rgba(99,102,241,0.1)}
        [data-theme="light"] .app-layout{background:#f4f5f9}
        [data-theme="light"] .sidebar{background:#fff;border-right-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .sidebar-card{background:rgba(0,0,0,0.025);border-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .sidebar-card:hover{border-color:rgba(0,0,0,0.14)}
        [data-theme="light"] .sidebar-card-title{color:rgba(0,0,0,0.7)}
        [data-theme="light"] .sidebar-card-sub{color:rgba(0,0,0,0.35)}
        [data-theme="light"] .dark-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:#0f0f14}
        [data-theme="light"] .dark-input::placeholder{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .filter-label{color:rgba(0,0,0,0.35)}
        [data-theme="light"] .filter-select{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:rgba(0,0,0,0.6)}
        [data-theme="light"] .toggle-row{color:rgba(0,0,0,0.45)}
        [data-theme="light"] .ghost-btn{color:rgba(0,0,0,0.45);border-color:rgba(0,0,0,0.12)}
        [data-theme="light"] .ghost-btn:hover{color:rgba(0,0,0,0.75);border-color:rgba(0,0,0,0.25)}
        [data-theme="light"] .tabs-row{border-bottom-color:rgba(0,0,0,0.08)}
        [data-theme="light"] .tab{color:rgba(0,0,0,0.35)}
        [data-theme="light"] .tab.active{color:#111}
        [data-theme="light"] .tab:hover:not(.active){color:rgba(0,0,0,0.65);background:rgba(0,0,0,0.04)}
        [data-theme="light"] .job-card{background:#fff;border-color:rgba(0,0,0,0.07);box-shadow:0 1px 4px rgba(0,0,0,0.06)}
        [data-theme="light"] .job-card:hover{background:#fff;border-color:rgba(99,102,241,0.35);box-shadow:0 8px 32px rgba(99,102,241,0.1),0 1px 4px rgba(0,0,0,0.08)}
        [data-theme="light"] .job-card-hot{border-color:rgba(251,191,36,0.3)!important;background:rgba(251,191,36,0.03)!important}
        [data-theme="light"] .action-card-btn.tailor-btn{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:rgba(0,0,0,0.45)}
        [data-theme="light"] .action-card-btn.tailor-btn:hover{background:rgba(0,0,0,0.07);color:rgba(0,0,0,0.7)}
        [data-theme="light"] .action-card-btn.track-btn{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.08);color:rgba(0,0,0,0.35)}
        [data-theme="light"] .action-card-btn.track-btn:hover{background:rgba(0,0,0,0.06);color:rgba(0,0,0,0.6)}
        [data-theme="light"] .page-btn{background:#fff;border-color:rgba(0,0,0,0.1);color:rgba(0,0,0,0.4);box-shadow:0 1px 3px rgba(0,0,0,0.06)}
        [data-theme="light"] .page-btn:hover:not(:disabled){background:rgba(99,102,241,0.06);color:#6366f1}
        [data-theme="light"] .skel{background:linear-gradient(90deg,rgba(0,0,0,0.05) 25%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0.05) 75%);background-size:200% 100%}
        [data-theme="light"] .modal{background:#fff;border-color:rgba(0,0,0,0.08);box-shadow:0 40px 120px rgba(0,0,0,0.15)}
        [data-theme="light"] .modal-close{background:rgba(0,0,0,0.05);border-color:rgba(0,0,0,0.09);color:rgba(0,0,0,0.35)}
        [data-theme="light"] .modal-head{border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .modal-title{color:#0f0f14}
        [data-theme="light"] .modal-tabs{background:rgba(0,0,0,0.04)}
        [data-theme="light"] .mtab{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .mtab.active{background:rgba(99,102,241,0.1);color:#6366f1}
        [data-theme="light"] .overlay{background:rgba(0,0,0,0.4);backdrop-filter:blur(12px)}
        [data-theme="light"] .refresh-toast{background:rgba(255,255,255,0.97);border-color:rgba(52,211,153,0.4);box-shadow:0 8px 32px rgba(0,0,0,0.12)}
        [data-theme="light"] .eb-banner{background:rgba(251,191,36,0.06);border-color:rgba(251,191,36,0.2)}
        [data-theme="light"] .mobile-sidebar-backdrop{background:rgba(0,0,0,0.4)}
        [data-theme="light"] .mobile-sidebar-sheet{background:#fff;border-top-color:rgba(0,0,0,0.08)}

        @media(max-width:900px){.sidebar{display:none}.content{padding:20px 16px;max-width:100%}}

        /* ── MOBILE ── */
        @media(max-width:768px){
          .topbar{padding:0 14px;height:56px;gap:8px}
          .topbar-search{display:none}
          .topbar-logo{font-size:18px;margin-right:0}
          .topbar-right{gap:6px}
          .topbar-right .nav-pill{display:none}
          .topbar-right>span{display:none}
          .logout-btn{display:none}
          .user-avatar{width:28px;height:28px;font-size:11px}
          .theme-toggle{width:30px;height:30px}
          .mob-search-btn{display:flex!important}
          .mob-sidebar-btn{display:flex!important}
          .mob-signout-btn{display:flex!important}
          .mob-eb-btn{display:flex!important}

          .mobile-search-panel{display:flex}

          .content{padding:14px 12px;max-width:100%}
          .jobs-grid{grid-template-columns:1fr}

          .tabs-row{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:0;flex-wrap:nowrap}
          .tabs-row::-webkit-scrollbar{display:none}
          .tab{padding:9px 12px;font-size:11px;flex-shrink:0}

          .search-btn,.eb-btn,.refresh-btn{min-height:44px;padding:10px 14px}
          .action-card-btn{padding:8px 6px;min-height:40px;font-size:10px}
          .action-btns{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:5px}
          .action-btns .action-card-btn{flex:none!important;width:100%!important;min-width:0!important;justify-content:center;overflow:hidden}
          .action-btns .action-card-btn.track-btn{flex:none!important;padding:8px 4px;width:100%!important;min-width:0!important}
          .page-btn{width:38px;height:38px;font-size:13px}
          .apply-btn{padding:12px 18px;min-height:44px;font-size:13px}

          .overlay{padding:0;align-items:flex-end;padding-top:60px}
          .modal{max-width:100%;border-radius:20px 20px 0 0;padding:24px 18px;max-height:90vh}
          .modal-close{top:12px;right:12px}

          .mobile-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:350;display:flex;flex-direction:column;justify-content:flex-end;backdrop-filter:blur(4px)}
          .mobile-sidebar-sheet{background:#0d0d14;border-radius:20px 20px 0 0;padding:16px;max-height:80vh;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.09)}
          .mob-filters-btn{display:flex!important}
          .mob-filters-row{display:flex!important}
        }
        .mob-search-btn,.mob-sidebar-btn,.mob-signout-btn,.mob-eb-btn,.mob-filters-btn,.mob-filters-row{display:none}
        @media(min-width:769px){.mobile-search-panel{display:none!important}}
        [data-theme="light"] .mobile-search-panel{background:rgba(255,255,255,0.98);border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .mobile-sidebar-sheet{background:#fff;border-top-color:rgba(0,0,0,0.08)}
      `}</style>

      {/* TOPBAR */}
      <nav className="topbar">
        <div className="topbar-logo">Vega<span>ply</span></div>
        <div className="topbar-search">
          <input className="topbar-input" type="text" placeholder="Job role (e.g. Data Analyst)" value={jobRole} onChange={e=>setJobRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          <input className="topbar-input" type="text" placeholder="Location (e.g. New York, US)" value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Search"}</button>
          <button className="eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading}>{ebLoading?"Scanning…":"⚡ Early Bird"}</button>
          {hasSearched&&<button className={`refresh-btn${isRefreshing?" spinning":""}`} onClick={handleRefresh} disabled={isRefreshing} title="Refresh jobs">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {isRefreshing?"Refreshing…":"Refresh"}
          </button>}
        </div>
        <div className="topbar-right">
          {/* Mobile: search toggle */}
          <button className="mob-search-btn theme-toggle" onClick={()=>setShowMobileSearch(s=>!s)} style={{color:showMobileSearch?"#818cf8":"inherit"}} title="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          {/* Mobile: early bird quick-access */}
          <button className="mob-eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading} style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"6px 10px",fontSize:13,cursor:"pointer",color:"#fbbf24",alignItems:"center",gap:4,minHeight:36}}>⚡</button>
          {mounted&&earlyBirdJobs.length>0&&<span className="nav-pill pill-eb">⚡ {earlyBirdJobs.length} Early</span>}
          {mounted&&trackedApps.length>0&&<span className="nav-pill pill-tracker">{trackedApps.length} Tracked</span>}
          {mounted&&userEmail&&<div className="user-avatar" title={userEmail}>{avatarLetter}</div>}
          {mounted&&userEmail&&<span style={{fontSize:11,color:"rgba(255,255,255,0.2)",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userEmail}</span>}
          <button className="theme-toggle" onClick={toggleTheme} title={darkMode?"Switch to light mode":"Switch to dark mode"}>
            {darkMode
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
          {/* Mobile: sign out icon */}
          <button className="mob-signout-btn theme-toggle" onClick={handleLogout} title="Sign out" style={{color:"rgba(239,68,68,0.6)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </nav>

      {/* MOBILE SEARCH PANEL — conditionally rendered, hidden on desktop via CSS */}
      {showMobileSearch&&(
        <div className="mobile-search-panel" style={{position:"sticky",top:56,left:0,right:0,background:darkMode?"rgba(6,6,8,0.97)":"rgba(255,255,255,0.98)",borderBottom:`1px solid ${darkMode?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,padding:"10px 14px",zIndex:190,display:"flex",flexDirection:"column",gap:8,backdropFilter:"blur(24px)"}}>
          <input className="topbar-input" type="text" placeholder="Job role (e.g. Data Analyst)" value={jobRole} onChange={e=>setJobRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleMobileSearch()} style={{height:44,fontSize:14}}/>
          <input className="topbar-input" type="text" placeholder="Location (e.g. New York, US)" value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleMobileSearch()} style={{height:44,fontSize:14}}/>
          <div style={{display:"flex",gap:8}}>
            <button className="search-btn" style={{flex:1,height:44,fontSize:14}} onClick={handleMobileSearch} disabled={loading}>{loading?"Searching…":"Search"}</button>
            <button className="eb-btn" style={{height:44,fontSize:13}} onClick={handleMobileEarlyBird} disabled={ebLoading}>{ebLoading?"…":"⚡"}</button>
          </div>
          {hasSearched&&<button className={`refresh-btn${isRefreshing?" spinning":""}`} style={{width:"100%",justifyContent:"center",height:40}} onClick={handleRefresh} disabled={isRefreshing}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {isRefreshing?"Refreshing…":"Refresh jobs"}
          </button>}
        </div>
      )}

      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <div className="sidebar-card-title">🎯 AI Resume Match</div>
              <button onClick={loadResumeHistory} style={{fontSize:10,color:"#818cf8",background:"none",border:"1px solid rgba(99,102,241,0.2)",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"}}>History</button>
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
                {isMatching&&<div style={{marginTop:7}}><div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)",borderRadius:2,width:`${matchProgress}%`,transition:"width .3s"}}/></div></div>}
              </div>
            )}
            {autoOpenDone&&<div style={{fontSize:11,color:"#10b981",textAlign:"center",marginTop:7}}>✓ Opened top matches in new tabs</div>}
          </div>

          {resumeText&&<ResumeStrengthMeter resumeText={resumeText} lm={!darkMode}/>}

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

          {/* SHARE VEGAPLY */}
          <div className="sidebar-card" style={{marginTop:4,background:"rgba(99,102,241,0.05)",borderColor:"rgba(99,102,241,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <div className="sidebar-card-title" style={{margin:0,color:"#a5b4fc"}}>Know someone job hunting?</div>
            </div>
            <div className="sidebar-card-sub">Share Vegaply — help them apply first</div>
            <button
              onClick={async()=>{
                const shareData={title:"Vegaply",text:"I'm using Vegaply to find jobs before everyone else applies 🚀 Try it free:",url:"https://vegaply.com"};
                if(typeof navigator.share==="function"&&navigator.canShare&&navigator.canShare(shareData)){
                  try{await navigator.share(shareData);}catch{}
                }else{
                  try{
                    await navigator.clipboard.writeText("https://vegaply.com");
                    setShareToast(true);
                    setTimeout(()=>setShareToast(false),2500);
                  }catch{}
                }
              }}
              style={{width:"100%",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,padding:"8px 0",fontSize:12,fontWeight:600,color:"#818cf8",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,0.2)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(99,102,241,0.12)")}
            >
              {shareToast?"✓ Link copied!":"Share Vegaply →"}
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="content">
          {/* Mobile filters row — hidden on desktop via CSS, shown on mobile */}
          <div className="mob-filters-row" style={{display:"none",gap:8,marginBottom:14,alignItems:"center"}}>
            <button className="mob-filters-btn" onClick={()=>setShowMobileSidebar(true)} style={{background:darkMode?"rgba(99,102,241,0.1)":"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,color:"#818cf8",cursor:"pointer",fontFamily:"inherit",alignItems:"center",gap:6,minHeight:36}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters{(filterType!=="ALL"||filterDate!=="ANY"||filterRemote)?" ●":""}
            </button>
            {jobRole&&location&&<span className="mob-filters-btn" style={{fontSize:11,color:darkMode?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.4)",background:"none",border:"none",padding:0,minHeight:"auto"}}>{jobRole} · {location}</span>}
          </div>

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

          {activeTab==="tracker"&&<TrackerView lm={!darkMode} apps={trackedApps}
            onUpdateStatus={(id,s)=>setTrackedApps(prev=>{const next=prev.map(a=>a.id===id?{...a,status:s}:a);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
            onUpdateNotes={(id,n)=>setTrackedApps(prev=>{const next=prev.map(a=>a.id===id?{...a,notes:n}:a);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
            onRemove={id=>setTrackedApps(prev=>{const next=prev.filter(a=>a.id!==id);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
          />}
          {activeTab==="analytics"&&<AnalyticsView lm={!darkMode} apps={trackedApps} savedCount={savedJobs.size} totalSearched={totalSearched}/>}

          {(activeTab==="results"||activeTab==="earlybird"||activeTab==="saved")&&(
            <>
              {activeTab==="earlybird"&&earlyBirdJobs.length>0&&!ebLoading&&(
                <div className="eb-banner">
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#f59e0b",marginBottom:2}}>⚡ Early Bird Mode Active</div>
                    <div style={{fontSize:11,color:"rgba(245,158,11,0.4)"}}>Jobs posted in the last 24 hours — minimal competition</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:18}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:darkMode?"#fff":"#111"}}>{earlyBirdJobs.length}</div><div style={{fontSize:10,color:darkMode?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.4)"}}>Fresh Jobs</div></div>
                    <div style={{width:1,height:28,background:darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}}/>
                    <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#ef4444"}}>{hotCount}</div><div style={{fontSize:10,color:darkMode?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.4)"}}>🔥 Under 6h</div></div>
                  </div>
                </div>
              )}

              {autoOpenDone&&<div style={{background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:12,fontWeight:600,color:"#10b981",display:"flex",alignItems:"center",gap:8}}>🚀 Opened top 3 matches in new tabs!</div>}

              {currentLoading&&(
                <div className="jobs-grid">
                  {[...Array(6)].map((_,i)=>(
                    <div key={i} style={{background:darkMode?"rgba(255,255,255,0.025)":"#fff",border:`1px solid ${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.07)"}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"flex",gap:10}}><div className="skel" style={{width:42,height:42,borderRadius:8,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}><div className="skel" style={{height:13,width:"68%"}}/><div className="skel" style={{height:10,width:"42%"}}/></div></div>
                      <div className="skel" style={{height:32,borderRadius:7}}/>
                      <div style={{display:"flex",gap:5}}><div className="skel" style={{height:30,flex:1,borderRadius:6}}/><div className="skel" style={{height:30,flex:1,borderRadius:6}}/><div className="skel" style={{height:30,flex:1,borderRadius:6}}/></div>
                    </div>
                  ))}
                </div>
              )}

              {!currentLoading&&paginatedJobs.length>0&&(
                <>
                  <div style={{fontSize:11,color:darkMode?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.4)",marginBottom:14}}>
                    Showing <strong style={{color:darkMode?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.65)"}}>{(currentPage-1)*JOBS_PER_PAGE+1}–{Math.min(currentPage*JOBS_PER_PAGE,displayJobs.length)}</strong> of <strong style={{color:darkMode?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.65)"}}>{displayJobs.length}</strong> jobs
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
                        onCoverLetter={()=>handleCoverLetter(job)}
                        onSkillGap={()=>handleSkillGap(job)}
                        onMatchResume={()=>handleSingleMatch(job)}
                        earlyBirdMode={isEbMode}
                        resumeReady={!!resumeText}
                        isTracked={!!trackedApps.find(a=>a.job.job_id===job.job_id)}
                        onTrack={()=>addToTracker(job)}
                        lm={!darkMode}
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
                <div style={{textAlign:"center",padding:"56px 24px",background:darkMode?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.02)",borderRadius:12,border:`1px dashed ${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}`}}>
                  <div style={{fontSize:36,marginBottom:12}}>{activeTab==="saved"?"🔖":activeTab==="earlybird"?"⚡":"🔍"}</div>
                  <h3 style={{fontSize:16,color:darkMode?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)",marginBottom:6,fontWeight:700}}>{activeTab==="saved"?"No saved jobs":activeTab==="earlybird"?"No early bird jobs yet":"Start your search"}</h3>
                  <p style={{fontSize:12,color:darkMode?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.35)"}}>{activeTab==="saved"?"Bookmark jobs to see them here":activeTab==="earlybird"?"Click ⚡ Early Bird to find freshly posted jobs":"Enter a job role and location above to find opportunities"}</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      {selectedJob&&<JobModal job={selectedJob} saved={savedJobs.has(selectedJob.job_id)} onToggleSave={()=>toggleSave(selectedJob.job_id)} onClose={()=>setSelectedJob(null)} earlyBirdMode={isEbMode} onAddToTracker={()=>addToTracker(selectedJob)} isTracked={!!trackedApps.find(a=>a.job.job_id===selectedJob.job_id)}/>}
      {tailorJob?.tailor&&<TailorModal job={tailorJob} tailor={tailorJob.tailor} onClose={()=>setTailorJob(null)}/>}
      {interviewJob&&<InterviewSimulatorModal job={interviewJob} onClose={()=>setInterviewJob(null)}/>}
      {matchPanelJob&&<ResumeMatchPanel job={matchPanelJob} onClose={()=>setMatchPanelJob(null)} resumeText={resumeText}/>}
      {coverLetterJob?.coverLetter&&<CoverLetterModal job={coverLetterJob} coverLetter={coverLetterJob.coverLetter} onClose={()=>setCoverLetterJob(null)}/>}
      {skillGapJob?.skillGap&&<SkillGapModal job={skillGapJob} result={skillGapJob.skillGap} onClose={()=>setSkillGapJob(null)}/>}

      {/* MOBILE SIDEBAR BOTTOM SHEET */}
      {showMobileSidebar&&(
        <div className="mobile-sidebar-backdrop" onClick={()=>setShowMobileSidebar(false)}>
          <div className="mobile-sidebar-sheet" onClick={e=>e.stopPropagation()}>
            {/* drag handle */}
            <div style={{width:36,height:4,background:darkMode?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)",borderRadius:2,margin:"0 auto 18px"}}/>
            <div style={{fontSize:15,fontWeight:700,color:darkMode?"#fff":"#111",marginBottom:16}}>Filters & Resume</div>

            <div className="sidebar-card" style={{marginBottom:12}}>
              <div className="sidebar-card-title">🎯 AI Resume Match</div>
              <div className="sidebar-card-sub">Upload PDF for AI matching</div>
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
            </div>

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

            <button onClick={()=>setShowMobileSidebar(false)} style={{marginTop:16,width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* WELCOME TOUR */}
      {showWelcomeTour&&<WelcomeTour onClose={closeTour}/>}

      {/* ONBOARDING */}
      {showOnboard&&(
        <div style={{position:"fixed",inset:0,background:"#060608",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden"}}>
          {/* Glow FX */}
          <div style={{position:"absolute",top:"-160px",left:"50%",transform:"translateX(-50%)",width:"800px",height:"600px",background:"radial-gradient(ellipse,rgba(99,102,241,0.22) 0%,transparent 65%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",bottom:"-120px",left:"20%",width:"500px",height:"400px",background:"radial-gradient(ellipse,rgba(236,72,153,0.13) 0%,transparent 65%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:"30%",right:"5%",width:"300px",height:"300px",background:"radial-gradient(ellipse,rgba(52,211,153,0.06) 0%,transparent 65%)",pointerEvents:"none"}}/>
          <style>{`
            @keyframes ob-fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
            @keyframes ob-chip-in{from{opacity:0;transform:translateY(12px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
            .ob-wrap{animation:ob-fadeUp .55s ease both}
            .ob-chip{transition:all .18s ease;animation:ob-chip-in .4s ease both}
            .ob-chip:hover{transform:translateY(-2px)!important;box-shadow:0 6px 20px rgba(99,102,241,0.3)!important}
            .ob-chip.selected{box-shadow:0 4px 24px rgba(99,102,241,0.45)!important}
            .ob-btn{transition:all .22s ease}
            .ob-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 48px rgba(99,102,241,0.38)}
            .ob-btn:disabled{opacity:0.5;cursor:not-allowed}
            .ob-input{transition:all .2s}
            .ob-input:focus{border-color:rgba(129,140,248,0.5)!important;background:rgba(99,102,241,0.06)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.1)!important}
          `}</style>

          <div className="ob-wrap" style={{width:"100%",maxWidth:520,textAlign:"center",position:"relative",zIndex:1}}>
            {/* Step dots */}
            <div style={{display:"flex",justifyContent:"center",gap:7,marginBottom:36}}>
              {[1,2,3].map(s=>(
                <div key={s} style={{height:3,borderRadius:3,transition:"all .35s",background:s===onboardStep?"#818cf8":s<onboardStep?"rgba(99,102,241,0.45)":"rgba(255,255,255,0.08)",width:s===onboardStep?32:8}}/>
              ))}
            </div>

            {onboardStep===1&&(
              <div key="step1" style={{animation:"ob-fadeUp .45s ease both"}}>
                {/* Badge */}
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:100,padding:"6px 16px",fontSize:11,fontWeight:600,color:"#a5b4fc",marginBottom:24,letterSpacing:".4px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#818cf8",display:"inline-block",flexShrink:0}}/>
                  Step 1 of 3 · 60-second setup
                </div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,5vw,44px)",fontWeight:900,lineHeight:1.05,letterSpacing:"-1.5px",color:"#fff",marginBottom:12}}>
                  Welcome to{" "}
                  <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Vegaply</em>
                </h1>
                <p style={{color:"rgba(255,255,255,0.32)",fontSize:14,marginBottom:28,lineHeight:1.7,fontWeight:300}}>The AI job search platform that finds fresh roles, scores your resume, and tracks every application. Let's get you set up.</p>

                <input
                  className="ob-input"
                  value={onboardRole}
                  onChange={e=>setOnboardRole(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&onboardRole.trim()&&setOnboardStep(2)}
                  placeholder="What role are you looking for? e.g. Data Analyst"
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"14px 18px",fontSize:14,color:"#fff",outline:"none",marginBottom:16,fontFamily:"inherit"}}
                />

                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:28,justifyContent:"center"}}>
                  {["Software Engineer","Data Analyst","UX Designer","Product Manager","ML Engineer","Cybersecurity Analyst","Financial Analyst","Cloud Engineer","Marketing Manager","Business Analyst"].map((role,i)=>(
                    <button
                      key={role}
                      className={`ob-chip${onboardRole===role?" selected":""}`}
                      onClick={()=>{setOnboardRole(role);setTimeout(()=>setOnboardStep(2),300);}}
                      style={{
                        background:onboardRole===role?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(99,102,241,0.08)",
                        border:`1px solid ${onboardRole===role?"transparent":"rgba(99,102,241,0.22)"}`,
                        borderRadius:100,
                        padding:"6px 15px",
                        fontSize:12,
                        fontWeight:600,
                        color:onboardRole===role?"#fff":"#a5b4fc",
                        cursor:"pointer",
                        fontFamily:"inherit",
                        whiteSpace:"nowrap",
                        animationDelay:`${i*0.04}s`,
                      }}
                    >{role}</button>
                  ))}
                </div>

                <button
                  className="ob-btn"
                  onClick={()=>{if(onboardRole.trim())setOnboardStep(2);}}
                  style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",letterSpacing:"-.2px"}}
                >Continue →</button>
              </div>
            )}

            {onboardStep===2&&(
              <div key="step2" style={{animation:"ob-fadeUp .45s ease both"}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:100,padding:"6px 16px",fontSize:11,fontWeight:600,color:"#a5b4fc",marginBottom:24,letterSpacing:".4px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#818cf8",display:"inline-block",flexShrink:0}}/>
                  Step 2 of 3
                </div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,4vw,38px)",fontWeight:900,lineHeight:1.1,letterSpacing:"-1px",color:"#fff",marginBottom:12}}>
                  Where are you <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#818cf8,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>looking?</em>
                </h1>
                <p style={{color:"rgba(255,255,255,0.32)",fontSize:14,marginBottom:28,lineHeight:1.7,fontWeight:300}}>Enter your preferred city, country, or just type "Remote".</p>
                <input
                  className="ob-input"
                  value={onboardLocation}
                  onChange={e=>setOnboardLocation(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&onboardLocation.trim()&&setOnboardStep(3)}
                  placeholder="e.g. New York, US or Remote"
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"14px 18px",fontSize:14,color:"#fff",outline:"none",marginBottom:16,fontFamily:"inherit"}}
                />
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:28,justifyContent:"center"}}>
                  {["Remote","New York","San Francisco","London","Toronto","Austin","Seattle","Chicago","Los Angeles","Boston"].map((loc,i)=>(
                    <button
                      key={loc}
                      className={`ob-chip${onboardLocation===loc?" selected":""}`}
                      onClick={()=>{setOnboardLocation(loc);setTimeout(()=>setOnboardStep(3),300);}}
                      style={{
                        background:onboardLocation===loc?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(99,102,241,0.08)",
                        border:`1px solid ${onboardLocation===loc?"transparent":"rgba(99,102,241,0.22)"}`,
                        borderRadius:100,
                        padding:"6px 15px",
                        fontSize:12,
                        fontWeight:600,
                        color:onboardLocation===loc?"#fff":"#a5b4fc",
                        cursor:"pointer",
                        fontFamily:"inherit",
                        whiteSpace:"nowrap",
                        animationDelay:`${i*0.04}s`,
                      }}
                    >{loc}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button className="ob-btn" onClick={()=>setOnboardStep(1)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"14px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                  <button className="ob-btn" onClick={()=>{if(onboardLocation.trim())setOnboardStep(3);}} style={{flex:2,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
                </div>
              </div>
            )}

            {onboardStep===3&&(
              <div key="step3" style={{animation:"ob-fadeUp .45s ease both"}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:100,padding:"6px 16px",fontSize:11,fontWeight:600,color:"#6ee7b7",marginBottom:24,letterSpacing:".4px"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",display:"inline-block",flexShrink:0}}/>
                  Step 3 of 3 · Almost done!
                </div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,4vw,38px)",fontWeight:900,lineHeight:1.1,letterSpacing:"-1px",color:"#fff",marginBottom:12}}>
                  Upload your <em style={{fontStyle:"italic",background:"linear-gradient(135deg,#34d399,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>resume</em>
                </h1>
                <p style={{color:"rgba(255,255,255,0.32)",fontSize:14,marginBottom:24,lineHeight:1.7,fontWeight:300}}>Upload your PDF for instant AI match scoring. We'll remember it for every job. You can skip and add it later.</p>
                {onboardParsing&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:"#818cf8",fontSize:13,marginBottom:16}}>
                  <div className="spin" style={{width:14,height:14}}/>Parsing resume…
                </div>}
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
                <button className="ob-btn" onClick={()=>document.getElementById("ob-file-input")?.click()} disabled={onboardParsing}
                  style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>
                  {onboardParsing?"Parsing…":"📎 Upload Resume PDF"}
                </button>
                <div style={{display:"flex",gap:10}}>
                  <button className="ob-btn" onClick={()=>setOnboardStep(2)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"14px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
                  <button className="ob-btn" onClick={completeOnboarding} style={{flex:2,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"14px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>Skip for now</button>
                </div>
              </div>
            )}
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
              <div key={r.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${i===0?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:14,marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"#fff",marginBottom:3}}>{r.file_name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>{i===0&&<div style={{fontSize:9,color:"#818cf8",fontWeight:700,marginTop:3,letterSpacing:"0.3px"}}>ACTIVE</div>}</div>
                <button onClick={()=>{setResumeText(r.resume_text);setResumeFileName(r.file_name);lsSet("applysmart_resume",r.resume_text);lsSet("applysmart_resume_name",r.file_name);setShowResumeHistory(false);}} style={{background:i===0?"rgba(99,102,241,0.08)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:i===0?"#818cf8":"#fff",border:i===0?"1px solid rgba(99,102,241,0.25)":"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {i===0?"Active":"Use This"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING HELP */}
      <HelpPanel/>

      {/* REFRESH TOAST */}
      {refreshToast&&(
        <div className="refresh-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Updated just now — new jobs found
        </div>
      )}
    </div>
  );
}