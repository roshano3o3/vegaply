"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Job {
  job_id: string; job_title: string; employer_name: string; employer_logo?: string;
  job_city?: string; job_state?: string; job_country?: string; job_employment_type?: string;
  job_posted_at_datetime_utc?: string; job_posted_at_timestamp?: number; job_description?: string; job_apply_link?: string;
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
const JOBS_PER_PAGE = 50;

const H1B_SPONSORS = new Set([
  'google','alphabet','microsoft','apple','meta','amazon','netflix','uber','lyft',
  'twitter','x','airbnb','stripe','figma','notion','linear','vercel','databricks',
  'snowflake','datadog','confluent','hashicorp','gitlab','github','atlassian',
  'slack','zoom','dropbox','box','okta','crowdstrike','palo alto','splunk',
  'elastic','mongodb','redis','twilio','sendgrid','segment','mixpanel',
  'cognizant','infosys','tata','tcs','wipro','hcl','tech mahindra','mindtree',
  'mphasis','hexaware','ltimindtree','persistent','coforge','mastech',
  'igate','patni','niit','kpit','cyient','zensar','birlasoft',
  'deloitte','accenture','capgemini','ibm','oracle','sap','pwc',
  'ernst','kpmg','mckinsey','bain','bcg','booz allen','leidos',
  'mantech','saic','caci','unisys','dxc','atos',
  'jpmorgan','goldman sachs','morgan stanley','bank of america','wells fargo',
  'citigroup','citibank','bloomberg','visa','mastercard','paypal','square',
  'robinhood','coinbase','fidelity','blackrock','vanguard','charles schwab',
  'ameriprise','raymond james','pnc','us bank','td bank','hsbc','barclays',
  'johnson','pfizer','moderna','abbvie','merck','eli lilly','bristol','amgen',
  'genentech','roche','novartis','astrazeneca','biogen','regeneron','gilead',
  'unitedhealth','anthem','cigna','aetna','humana','cvs','walgreens',
  'intel','nvidia','amd','qualcomm','broadcom','texas instruments','applied materials',
  'lam research','kla','micron','western digital','seagate','marvell','xilinx',
  'boeing','lockheed martin','raytheon','northrop','general dynamics','l3harris',
  'spacex','blue origin','general electric','honeywell','3m',
  'tesla','ford','general motors','gm','waymo','cruise','argo','rivian','lucid',
  'walmart','target','costco','home depot','lowes','best buy','chewy','wayfair',
  'att','verizon','t-mobile','comcast','charter','dish',
  'salesforce','workday','servicenow','adobe','vmware','dell','hp','cisco',
  'juniper','f5','fortinet','checkpoint','rapid7','tenable','sailpoint',
  'ping identity','duo','cyberark','varonis','vectra','darktrace',
  'palantir','c3ai','datarobot','alteryx','talend','informatica','mulesoft',
  'boomi','jitterbit','tibco','opentext','micro focus','bmc','ca technologies',
  'rocket software','precisely','syncsort','ibi','sisense',
  'tableau','qlik','microstrategy','domo','looker','thoughtspot','incorta',
  'sigma','mode','hex','deepnote','domino','dataiku','h2o',
  'sas','spss','stata','mathworks','ansys','dassault','ptc','siemens',
  'northwell','sanofi','speechify','robert half','kelly','adecco','manpower',
  'randstad','insight global','tek systems',
]);
function isH1bSponsor(name?: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return [...H1B_SPONSORS].some(s => {
    const sp = s.toLowerCase().trim();
    return n.includes(sp) || sp.includes(n) || n.split(' ')[0] === sp.split(' ')[0];
  });
}

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

function getApplySource(job: any): { label: string; direct: boolean } {
  const url = (job.job_apply_link || '').toLowerCase();
  const source = (job.source || '').toLowerCase();
  if (url.includes('greenhouse.io')) return { label: 'Greenhouse', direct: true };
  if (url.includes('lever.co')) return { label: 'Lever', direct: true };
  if (url.includes('ashbyhq.com')) return { label: 'Ashby', direct: true };
  if (url.includes('workday')) return { label: 'Workday', direct: true };
  if (url.includes('jobvite.com')) return { label: 'Jobvite', direct: true };
  if (url.includes('smartrecruiters.com')) return { label: 'SmartRecruiters', direct: true };
  if (url.includes('adzuna.com')) return { label: 'via Adzuna', direct: false };
  if (url.includes('dice.com')) return { label: 'via Dice', direct: false };
  if (url.includes('adp.com')) return { label: 'via ADP', direct: false };
  if (url.includes('dejobs.org')) return { label: 'via Dejobs', direct: false };
  if (url.includes('indeed.com')) return { label: 'via Indeed', direct: false };
  if (source === 'greenhouse') return { label: 'Greenhouse', direct: true };
  if (source === 'remotive') return { label: 'Remotive', direct: false };
  if (source === 'themuse') return { label: 'TheMuse', direct: false };
  if (source === 'arbeitnow') return { label: 'Arbeitnow', direct: false };
  if (source === 'adzuna') return { label: 'via Adzuna', direct: false };
  return { label: 'Company Site', direct: true };
}

function getCompetitionLabel(h: number) {
  if (h < 2)  return { label: "🔥 Very Low Competition", color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  if (h < 6)  return { label: "⚡ Still Early", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" };
  if (h < 12) return { label: "⏰ Act Soon", color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)" };
  return { label: "📅 Open", color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" };
}

function getEarlyBirdStatus(job: any) {
  let postedTs: number | null = null;

  if (job.job_posted_at_timestamp && typeof job.job_posted_at_timestamp === 'number') {
    postedTs = job.job_posted_at_timestamp;
  } else if (job.job_posted_at_datetime_utc) {
    const parsed = Date.parse(job.job_posted_at_datetime_utc);
    if (!isNaN(parsed)) postedTs = Math.floor(parsed / 1000);
  }

  if (!postedTs) return { hoursOld: 999, isEarly: false, isHotJob: false, label: 'Recently' };

  const hoursOld = (Date.now() / 1000 - postedTs) / 3600;
  const isEarly = hoursOld < 24;
  const isHotJob = hoursOld < 6;
  let label: string;
  if (hoursOld < 1) label = `${Math.floor(hoursOld * 60)}m ago`;
  else if (hoursOld < 24) label = `${Math.floor(hoursOld)}h ago`;
  else if (hoursOld < 48) label = "1 day ago";
  else if (hoursOld < 168) label = `${Math.floor(hoursOld / 24)}d ago`;
  else if (hoursOld < 999) label = `${Math.floor(hoursOld / 168)}w ago`;
  else label = "Recently";
  return { hoursOld, isEarly, isHotJob, label };
}

function getH1BStatus(job: Job): { sponsors: boolean; likely: boolean; label: string } | null {
  const name = job.employer_name ?? '';
  const desc = job.job_description ?? '';
  const sponsors = isH1bSponsor(name);
  const likely = !sponsors && /h[- ]?1[- ]?b|visa\s+sponsor|will\s+sponsor|sponsorship\s+available/i.test(desc);
  if (sponsors) return { sponsors: true, likely: false, label: '✓ H1B Sponsor' };
  if (likely) return { sponsors: false, likely: true, label: '~ H1B Likely' };
  return null;
}

function normalizeJobDescription(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(span|strong|em|a|b|i)[^>]*>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ, color = scoreColor(score);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 28 28)"/>
      <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="800" fill={color} fontFamily="var(--font-display)">{score}</text>
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
      <div style={{background:"#0a0a10",border:"1px solid rgba(245,158,11,0.2)",borderRadius:20,padding:40,width:"100%",maxWidth:480,textAlign:"center",boxShadow:"0 0 60px rgba(245,158,11,0.08)"}}>
        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:32}}>
          {steps.map((_, i) => (
            <div key={i} style={{height:3,borderRadius:3,transition:"all .3s",background:i===step?"#f59e0b":i<step?"rgba(245,158,11,0.4)":"rgba(255,255,255,0.08)",width:i===step?28:8}}/>
          ))}
        </div>
        <div style={{fontSize:48,marginBottom:16}}>{current.icon}</div>
        <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:10,letterSpacing:"-0.3px"}}>{current.title}</div>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,lineHeight:1.7,marginBottom:16}}>{current.desc}</p>
        <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:10,padding:"10px 16px",fontSize:13,color:"#f59e0b",marginBottom:28}}>💡 {current.highlight}</div>
        <div style={{display:"flex",gap:10}}>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit"}}>← Back</button>}
          {step < steps.length - 1
            ? <button onClick={()=>setStep(s=>s+1)} style={{flex:2,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
            : <button onClick={onClose} style={{flex:2,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Let's Go 🚀</button>
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
      <button onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:24,right:24,width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",cursor:"pointer",fontSize:18,color:"#fff",zIndex:400,boxShadow:"0 4px 20px rgba(245,158,11,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,transition:"transform .2s"}} title="Feature Guide">?</button>
      {open && (
        <div style={{position:"fixed",bottom:76,right:24,width:300,background:"#0a0a10",border:"1px solid rgba(245,158,11,0.2)",borderRadius:16,padding:16,zIndex:400,boxShadow:"0 8px 40px rgba(0,0,0,0.5)",animation:"su .18s ease"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:14,letterSpacing:"0.3px"}}>FEATURE GUIDE</div>
          {features.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<features.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <span style={{fontSize:16,flexShrink:0}}>{f.icon}</span>
              <div><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.75)"}}>{f.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:1}}>{f.desc}</div></div>
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{width:"100%",marginTop:12,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,color:"#f59e0b",cursor:"pointer",fontFamily:"inherit"}}>Close</button>
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
  useEffect(() => { if (resumeText && !matchResult && !loading) runMatch(); }, [resumeText, matchResult, loading]);
  const color = matchResult ? scoreColor(matchResult.matchScore) : "#06b6d4";
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(6,6,8,0.55)",backdropFilter:"blur(4px)",zIndex:250}}>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,background:"#080810",borderLeft:"1px solid rgba(245,158,11,0.12)",padding:24,overflowY:"auto",display:"flex",flexDirection:"column",gap:16,animation:"slideIn .25s ease",zIndex:251}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Resume Analysis</div><div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:2}}>{job.job_title} · {job.employer_name}</div></div>
          <button className="modal-close" style={{position:"static"}} onClick={onClose}>✕</button>
        </div>
        {!resumeText&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Upload your resume first</div></div>}
        {resumeText&&loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",gap:14}}><div className="spin" style={{width:32,height:32}}/><div style={{fontSize:13,color:"#f59e0b"}}>Analyzing your resume…</div></div>}
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

async function parsePdfFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') throw new Error('This PDF is password-protected. Please remove the password before uploading.');
    const msg: string = err?.message || '';
    if (msg.includes('Invalid PDF') || msg.includes('corrupt')) throw new Error('This PDF appears corrupted. Please try re-saving it.');
    throw new Error('Could not open this PDF. Try re-saving it from Word or Google Docs.');
  }
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + ' ';
  }
  if (!text.trim()) throw new Error('This PDF appears to be scanned/image-based. Please upload a text-based PDF, or re-save your resume from Word/Google Docs.');
  return text.trim();
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
      const text = await parsePdfFile(file);
      onResume(text, file.name);
    } catch (err: any) {
      setError(err?.message || "Failed to parse PDF.");
    }
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
      {parsing?<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#f59e0b"}}><div className="spin"/>Parsing…</div>:(<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.3)",marginTop:6}}>Drop resume PDF here</div><div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:2}}>or click to browse</div>{error&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{error}</div>}</>)}
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
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#06b6d4" : score >= 4 ? "#f59e0b" : "#ef4444";
  const label = score >= 8 ? "Excellent" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Needs Work";
  const rgbMap: Record<string,string> = { "#10b981":"16,185,129", "#06b6d4":"6,182,212", "#f59e0b":"245,158,11", "#ef4444":"239,68,68" };
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
        <div style={{marginTop:8,background:"rgba(245,158,11,0.06)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(245,158,11,0.12)"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#f59e0b",letterSpacing:0.5}}>💡 TIP  </span>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.4}}>{feedback.betterAnswer}</span>
        </div>
      )}
    </div>
  );
}

function SimSummaryScreen({ summary, allQA, onClose }: { summary: SimSummary; allQA: SimQA[]; onClose: () => void }) {
  const recMap: Record<string,string> = { "Strong Hire":"#10b981","Hire":"#06b6d4","Borderline":"#f59e0b","Needs More Prep":"#f59e0b","Not Ready":"#ef4444" };
  const recColor = recMap[summary.recommendation ?? ""] ?? "#f59e0b";
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
            const c=sc>=8?"#10b981":sc>=6?"#06b6d4":sc>=4?"#f59e0b":"#ef4444";
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
      <button onClick={onClose} style={{width:"100%",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:0.3}}>
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
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
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
        const qs:SimQuestion[]=Array.isArray(data.questions)?data.questions:[];
        if (!qs.length) {
          setQuestionError("Unable to load interview questions right now. Please try again in a moment.");
          setPhase("chat");
          setMessages([{role:"ai",content:"Sorry, I couldn't load your questions. Please close and try again."}]);
          return;
        }
        setQuestions(qs);
        setPhase("chat");
        setMessages([{role:"ai",content:`Welcome to your mock interview for ${job.job_title} at ${job.employer_name}.\n\nI'll ask you 5 questions — a mix of behavioral and technical. Take your time with each answer. Ready?\n\nQuestion 1 of ${qs.length} · ${qs[0]?.type} · ${qs[0]?.focus}\n\n${qs[0]?.question}`}]);
      }catch{
        setQuestionError("Unable to load interview questions right now. Please try again in a moment.");
        setPhase("chat");
        setMessages([{role:"ai",content:"Sorry, I couldn't load your questions. Please close and try again."}]);
      }
    })();
  },[]);

  const sendAnswer=async()=>{
    if(!input.trim()||isTyping||questionError)return;
    const q=questions[currentQ];
    if(!q){
      setQuestionError("No interview question is available right now. Please close and try again.");
      return;
    }
    const answer=input.trim();
    setInput("");
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
          const nextQuestion = questions[nextQ];
          if (!nextQuestion) {
            setQuestionError("Unable to load the next question. Please close and try again.");
            return;
          }
          setMessages(prev=>[...prev,{role:"ai",content:`Question ${nextQ+1} of ${questions.length} · ${nextQuestion.type} · ${nextQuestion.focus}\n\n${nextQuestion.question}`}]);
          setCurrentQ(nextQ);
          inputRef.current?.focus();
        },600);
      }else{
        setSummaryLoading(true);
        setTimeout(async()=>{
          try{
            const sr=await fetch("/api/interview-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"summary",job,allQA:newAllQA.map(qa=>({question:qa.question.question,type:qa.question.type,score:qa.feedback.score}))})});
            const sd=await sr.json();
            setSummary(sd.summary ?? sd);
          }catch{
            setSummaryError("Unable to generate the interview summary right now. Please try again later.");
          }
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
          <div style={{width:34,height:34,background:"linear-gradient(135deg,rgba(245,158,11,0.25),rgba(236,72,153,0.15))",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🤖</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>AI Interview Simulator</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.job_title} · {job.employer_name}</div>
          </div>
          {phase==="chat"&&questions.length>0&&(
            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
              {questions.map((_,i)=>(
                <div key={i} style={{width:7,height:7,borderRadius:"50%",transition:"all 0.3s",background:i<allQA.length?"#10b981":i===currentQ&&phase==="chat"?"#f59e0b":"rgba(255,255,255,0.1)",boxShadow:i===currentQ&&phase==="chat"?"0 0 6px rgba(129,140,248,0.5)":"none"}}/>
              ))}
            </div>
          )}
          <button className="modal-close" style={{position:"static",marginLeft:4}} onClick={onClose}>✕</button>
        </div>

        {/* ── LOADING ── */}
        {phase==="loading"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{width:40,height:40,border:"3px solid rgba(245,158,11,0.15)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
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
                      <div style={{width:28,height:28,background:"rgba(245,158,11,0.12)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>
                      <div style={{background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"2px 12px 12px 12px",padding:"10px 14px",maxWidth:"82%"}}>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                      </div>
                    </div>
                  )}
                  {msg.role==="user"&&(
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <div style={{background:"rgba(245,158,11,0.14)",border:"1px solid rgba(245,158,11,0.22)",borderRadius:"12px 2px 12px 12px",padding:"10px 14px",maxWidth:"82%"}}>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>{msg.content}</div>
                      </div>
                    </div>
                  )}
                  {msg.role==="feedback"&&msg.feedback&&<SimFeedbackCard feedback={msg.feedback}/>}
                </div>
              ))}
              {questionError&&(
                <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:12,padding:"12px 14px",color:"#f87171",fontSize:12,lineHeight:1.5}}>
                  {questionError}
                </div>
              )}
              {isTyping&&(
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,background:"rgba(245,158,11,0.12)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div>
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
                    placeholder={questionError ? questionError : "Type your answer… (Enter to send · Shift+Enter for new line)"}
                    rows={2}
                    disabled={isTyping || !!questionError}
                    style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"10px 14px",fontSize:13,fontFamily:"inherit",color:"#fff",resize:"none",minHeight:50,maxHeight:120,outline:"none",lineHeight:1.55,transition:"border-color 0.2s"}}
                  />
                  <button
                    onClick={sendAnswer}
                    disabled={!input.trim()||isTyping||!!questionError}
                    style={{width:42,height:42,background:input.trim()&&!isTyping&& !questionError?"linear-gradient(135deg,#f59e0b,#fbbf24)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,cursor:input.trim()&&!isTyping&& !questionError?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.18)",marginTop:5,textAlign:"right"}}>
                  Q{questions.length>0?Math.min(currentQ+1,questions.length):0} of {questions.length||0} · {questions[currentQ]?.type??""} · {questions[currentQ]?.focus??""}
                </div>
              </div>
            ):summaryLoading?(
              <div style={{padding:"14px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:18,height:18,border:"2px solid rgba(245,158,11,0.25)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>Generating your interview report…</div>
              </div>
            ):null}
          </>
        )}

        {/* ── SUMMARY ── */}
        {phase==="summary"&&summary&&<SimSummaryScreen summary={summary} allQA={allQA} onClose={onClose}/>}
        {phase==="summary"&&!summary&&summaryError&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:12,color:"rgba(255,255,255,0.8)",textAlign:"center"}}>
            <div style={{fontSize:24}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700}}>Summary unavailable</div>
            <div style={{maxWidth:420,fontSize:13,color:"rgba(255,255,255,0.55)"}}>{summaryError}</div>
            <button onClick={onClose} style={{background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:12,padding:"12px 20px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer"}}>Close</button>
          </div>
        )}
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
        {tailor.keywordsAdded?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>Keywords to include</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tailor.keywordsAdded.map((k,i)=><span key={i} style={{background:"rgba(245,158,11,0.08)",color:"#f59e0b",fontSize:12,fontWeight:500,padding:"4px 10px",borderRadius:6}}>{k}</span>)}</div></div>}
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:10}}>Tailored bullet points</div>
        {tailor.tailoredBullets?.map((b,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",borderRadius:8,padding:14,marginBottom:12,border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.25)",lineHeight:1.5,marginBottom:6}}><span style={{fontSize:9,fontWeight:700,letterSpacing:1,color:"rgba(255,255,255,0.18)",display:"block",marginBottom:2}}>ORIGINAL</span>{b.original}</div>
            <div style={{fontSize:12,color:"rgba(245,158,11,0.35)",textAlign:"center",margin:"4px 0"}}>↓</div>
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
          {(() => {
            const ts = job.job_posted_at_timestamp
            const hrs = ts ? (Date.now()/1000 - ts)/3600 : 999
            const count = hrs <= 1 ? '~2 applicants' : hrs <= 3 ? '~8 applicants' : hrs <= 6 ? '~18 applicants' : hrs <= 12 ? '~40 applicants' : hrs <= 24 ? '~75 applicants' : '150+ applicants'
            const color = hrs <= 6 ? '#8eb29b' : hrs <= 24 ? '#d6b268' : 'rgba(239,68,68,0.65)'
            const bg = hrs <= 6 ? 'rgba(52,211,153,0.10)' : hrs <= 24 ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.07)'
            const border = hrs <= 6 ? '1px solid rgba(52,211,153,0.18)' : hrs <= 24 ? '1px solid rgba(251,191,36,0.16)' : '1px solid rgba(239,68,68,0.14)'
            return (
              <span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:999,background:bg,color,border,marginLeft:6,flexShrink:0}}>
                👤 {count}
              </span>
            )
          })()}
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
            {job.job_description&&!job.job_highlights?.Responsibilities&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.2)",marginBottom:8}}>About this role</div><p style={{fontSize:13,color:"rgba(255,255,255,0.35)",lineHeight:1.7}}>{normalizeJobDescription(job.job_description).slice(0,800)}...</p></div>}
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
    if(apps.length===0) return { emoji:"🚀", title:"Ready to launch?", body:"Add your first job to the Tracker to start seeing your analytics here.", color:"#f59e0b" };
    if(sc.Offer>0)       return { emoji:"🎉", title:"You have an offer!", body:`${sc.Offer} offer${sc.Offer>1?"s":""} — you're crushing it. Keep negotiating and don't stop tracking.`, color:"#10b981" };
    if(sc.Interviewing>0)return { emoji:"🎯", title:"Interviews incoming!", body:`${sc.Interviewing} interview${sc.Interviewing>1?"s":""} lined up. Prep hard with the Interview Prep tool and land that offer.`, color:"#f59e0b" };
    if(totalApplied>10&&responseRate===0) return { emoji:"💡", title:"No responses yet — let's fix that.", body:"Try tailoring your resume to each job description. Even small changes improve ATS scores significantly.", color:"#f59e0b" };
    if(totalApplied>0&&responseRate>0)   return { emoji:"📈", title:`${responseRate}% response rate — keep going!`, body:"You're getting traction. Apply to 5 more jobs today to keep the pipeline full.", color:"#f59e0b" };
    if(totalApplied>0)  return { emoji:"⚡", title:"Applications sent!", body:"Consistency wins. Aim for 5–10 quality applications per day and use the Match tool to prioritise.", color:"#f59e0b" };
    return { emoji:"🔖", title:`${sc.Saved} job${sc.Saved!==1?"s":""} saved — time to apply!`, body:"You've bookmarked jobs. Hit Apply on your top picks and move them to Applied to track your progress.", color:"#94a3b8" };
  })();

  const statCards = [
    { label:"Total Tracked", value:apps.length,        icon:"📋", color:"#06b6d4" },
    { label:"Applied",       value:totalApplied,        icon:"📤", color:"#f59e0b" },
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
    { label:"Tracked",      count:apps.length,   color:"#06b6d4" },
    { label:"Applied",      count:totalApplied,  color:"#f59e0b" },
    { label:"Interviewing", count:sc.Interviewing,color:"#a78bfa" },
    { label:"Offers",       count:sc.Offer,      color:"#10b981" },
  ];
  const mx = Math.max(funnel[0].count, 1);

  const sc2: Record<AppStatus,string> = {Saved:"#94a3b8",Applied:"#10b981",Interviewing:"#f59e0b",Offer:"#10b981",Rejected:"#ef4444"};
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

interface AiResumeScore {
  atsScore: number; overallScore: number;
  breakdown: Record<string, { score: number; passed: boolean; feedback: string }>;
  strengths: string[]; improvements: string[]; redFlags: string[];
  atsKeywordsFound: string[]; atsKeywordsMissing: string[];
  estimatedExperience: string; recommendedRoles: string[];
}

function ResumeStrengthMeter({ resumeText, lm }: { resumeText: string; lm?: boolean }) {
  const { score, checks } = analyzeResume(resumeText);
  const [aiResult, setAiResult] = useState<AiResumeScore | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const cachedTextRef = useRef<string>("");
  const t2 = lm ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)";
  const t3 = lm ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.28)";
  const bg = lm ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)";

  const runScoreAnalysis = () => {
    if (!resumeText) return;
    setAiLoading(true);
    setAiError(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    fetch("/api/resumescore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText }), signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!d.error) setAiResult(d); else setAiError(true); })
      .catch(() => { setAiError(true); })
      .finally(() => { clearTimeout(timeoutId); setAiLoading(false); });
  };

  useEffect(() => {
    const key = resumeText.length + ':' + resumeText.slice(0, 200);
    if (key === cachedTextRef.current || !resumeText) return;
    cachedTextRef.current = key;
    setAiResult(null);
    runScoreAnalysis();
  }, [resumeText]);

  const BREAKDOWN_LABELS: Record<string, string> = {
    contactInfo: "Contact Info", workExperience: "Work Experience", education: "Education",
    skills: "Skills", achievements: "Achievements", length: "Length",
    actionVerbs: "Action Verbs", keywords: "Keywords",
  };

  const miniRing = (sc: number, ringColor: string, ringLabel: string) => {
    const rr = 22, cc = 2 * Math.PI * rr, off = cc - (sc / 100) * cc;
    return (
      <div style={{textAlign:"center"}}>
        <svg width="58" height="58" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r={rr} fill="none" stroke="var(--border-subtle)" strokeWidth="4"/>
          <circle cx="29" cy="29" r={rr} fill="none" stroke={ringColor} strokeWidth="4"
            strokeDasharray={cc} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 29 29)"
            style={{transition:"stroke-dashoffset .8s ease"}}/>
          <text x="29" y="34" textAnchor="middle" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-display)" style={{fontSize:"var(--text-lg)"}}>{sc}</text>
        </svg>
        <div style={{fontSize:9,fontWeight:600,color:t3,marginTop:2,letterSpacing:"0.3px"}}>{ringLabel}</div>
      </div>
    );
  };

  if (aiLoading && !aiError) return (
    <div className="sidebar-card" style={{marginTop:0}}>
      <div className="sidebar-card-title">📈 Resume Strength</div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"16px 0",fontSize:12,color:"#f59e0b"}}>
        <div className="spin-sm"/>AI analyzing your resume…
      </div>
    </div>
  );

  if (aiError) return (
    <div className="sidebar-card" style={{marginTop:0}}>
      <div className="sidebar-card-title">📈 Resume Strength</div>
      <div style={{fontSize:11,color:'rgba(239,68,68,0.65)',textAlign:'center',padding:'12px 10px'}}>
        ⚠️ Analysis failed
        <button onClick={runScoreAnalysis} style={{display:'block',marginTop:6,background:'rgba(245,158,11,0.10)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:7,padding:'5px 12px',fontSize:10,color:'var(--gold)',cursor:'pointer',margin:'6px auto 0'}}>
          Retry
        </button>
      </div>
    </div>
  );

  if (aiResult) {
    const atsColor = "var(--cyan)";
    const ovColor  = "var(--cyan)";
    return (
      <div className="sidebar-card" style={{marginTop:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
          <div className="sidebar-card-title" style={{margin:0}}>📈 Resume Strength</div>
          {aiResult.estimatedExperience&&<span style={{fontSize:10,color:t3,background:bg,padding:"2px 7px",borderRadius:20,border:"1px solid rgba(255,255,255,0.07)"}}>{aiResult.estimatedExperience}</span>}
        </div>
        <div className="sidebar-card-sub" style={{marginBottom:12}}>AI-powered ATS analysis</div>

        {/* Dual rings */}
        <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:14}}>
          {miniRing(aiResult.atsScore, atsColor,
            <><span title="How well your resume passes automated filters" style={{cursor:"help",borderBottom:"1px dashed rgba(255,255,255,0.2)"}}>ATS Score</span></> as unknown as string
          )}
          {miniRing(aiResult.overallScore, ovColor, "Overall")}
        </div>

        {/* Breakdown bars */}
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:2}}>Breakdown</div>
          {Object.entries(BREAKDOWN_LABELS).map(([key, labelText]) => {
            const item = aiResult.breakdown[key];
            if (!item) return null;
            const barColor = item.score >= 70 ? "#10b981" : item.score >= 45 ? "#f59e0b" : "#ef4444";
            return (
              <div key={key} title={item.feedback}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:10,color:item.passed?t2:"rgba(239,68,68,0.8)",fontWeight:500}}>{item.passed?"✓":"✗"} {labelText}</span>
                  <span style={{fontSize:10,fontWeight:600,color:barColor}}>{item.score}</span>
                </div>
                <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${item.score}%`,background:barColor,borderRadius:99,transition:"width .8s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Red flags */}
        {aiResult.redFlags.length > 0 && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:"rgba(239,68,68,0.7)",marginBottom:5}}>⚠ Red Flags</div>
            {aiResult.redFlags.map((f,i) => (
              <div key={i} style={{fontSize:11,color:"#fca5a5",padding:"4px 8px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:6,marginBottom:4,lineHeight:1.4}}>{f}</div>
            ))}
          </div>
        )}

        {/* Missing keywords */}
        {aiResult.atsKeywordsMissing.length > 0 && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:5}}>Top Missing Keywords</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {aiResult.atsKeywordsMissing.slice(0,8).map((kw,i) => (
                <span key={i} style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(239,68,68,0.06)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.15)"}}>{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended roles */}
        {aiResult.recommendedRoles.length > 0 && (
          <div>
            <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:5}}>Recommended Roles</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {aiResult.recommendedRoles.map((role,i) => (
                <span key={i} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:"rgba(245,158,11,0.08)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.15)"}}>{role}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: basic synchronous analysis while AI hasn't responded
  const r = 20, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const fbColor = score >= 71 ? "#10b981" : score >= 41 ? "#f59e0b" : "#ef4444";
  const fbLabel = score >= 71 ? "Strong" : score >= 41 ? "Fair" : "Weak";
  const failing = checks.filter(c => !c.pass);
  const passing = checks.filter(c => c.pass);
  return (
    <div className="sidebar-card" style={{marginTop:0}}>
      <div className="sidebar-card-title">📈 Resume Strength</div>
      <div className="sidebar-card-sub">Analysis based on your uploaded resume</div>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{flexShrink:0}}>
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="4"/>
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--cyan)" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 26 26)"
            style={{transition:"stroke-dashoffset .8s ease"}}/>
          <text x="26" y="30" textAnchor="middle" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-display)" style={{fontSize:"var(--text-lg)"}}>{score}</text>
        </svg>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:fbColor,marginBottom:4}}>{fbLabel} Resume</div>
          <div style={{fontSize:11,color:t3,lineHeight:1.5}}>{passing.length}/{checks.length} checks passed</div>
          <div style={{marginTop:7,height:4,background:bg,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${score}%`,background:`linear-gradient(90deg,${fbColor},${fbColor}bb)`,borderRadius:99,transition:"width .8s ease"}}/>
          </div>
        </div>
      </div>
      {failing.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:8}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:2}}>Fix these</div>
          {failing.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:7,padding:"6px 9px"}}>
              <span style={{fontSize:11,color:"#ef4444",flexShrink:0,marginTop:1}}>✗</span>
              <div><div style={{fontFamily:'var(--font-primary)',fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:1}}>{c.label}</div><div style={{fontFamily:'var(--font-primary)',fontSize:11,fontWeight:400,color:t2,lineHeight:1.6}}>{c.tip}</div></div>
            </div>
          ))}
        </div>
      )}
      {passing.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px",color:t3,marginBottom:2}}>Looking good</div>
          {passing.map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 0"}}>
              <span style={{fontSize:11,color:"#10b981",flexShrink:0}}>✓</span>
              <span style={{fontFamily:'var(--font-primary)',fontSize:11,fontWeight:400,lineHeight:1.6,color:t2}}>{c.label}</span>
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
      <input className="gmail-input" type="email" placeholder="you@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
      {error&&<div style={{fontSize:11,color:"#ef4444",marginTop:6}}>{error}</div>}
      <button className="gmail-btn" onClick={send} disabled={sending||!jobs.length}>{sending?<><div className="spin-sm"/>Sending…</>:`📧 Send ${jobs.length} Jobs`}</button>
    </div>
  );
}

const TRACKER_COLS: { status: AppStatus; label: string; icon: string; color: string; border: string; bg: string }[] = [
  { status:"Saved",      label:"Saved",       icon:"🔖", color:"#94a3b8", border:"rgba(148,163,184,0.2)", bg:"rgba(148,163,184,0.06)" },
  { status:"Applied",    label:"Applied",     icon:"📤", color:"#f59e0b", border:"rgba(245,158,11,0.2)",   bg:"rgba(245,158,11,0.05)"   },
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
      {app.job.job_apply_link&&<a href={app.job.job_apply_link} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"#f59e0b",fontWeight:600,textDecoration:"none"}}>View Job →</a>}
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
    return "#06b6d4";
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

function getLogoStyle(name: string): { bg: string; color: string } {
  const c = (name || 'A')[0].toUpperCase();
  if ('ABCDE'.includes(c)) return { bg: 'rgba(6,182,212,0.14)', color: '#06b6d4' };
  if ('FGHIJ'.includes(c)) return { bg: 'rgba(236,72,153,0.14)', color: '#f472b6' };
  if ('KLMNO'.includes(c)) return { bg: 'rgba(16,185,129,0.14)', color: '#10b981' };
  if ('PQRST'.includes(c)) return { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' };
  return { bg: 'rgba(154,116,223,0.14)', color: '#a78bfa' };
}

function SkeletonRow() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'rgba(13,18,32,0.6)',border:'1px solid rgba(93,104,130,0.08)',borderRadius:14,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.022) 50%,transparent 100%)',animation:'skeletonShimmer 1.6s ease-in-out infinite'}}/>
      <div style={{width:40,height:40,borderRadius:8,background:'rgba(93,104,130,0.1)',flexShrink:0}}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
        <div style={{height:12,width:'52%',background:'rgba(93,104,130,0.1)',borderRadius:6}}/>
        <div style={{height:10,width:'34%',background:'rgba(93,104,130,0.07)',borderRadius:6}}/>
      </div>
      <div style={{display:'flex',gap:6,flexShrink:0}}>
        <div style={{height:26,width:60,background:'rgba(93,104,130,0.08)',borderRadius:6}}/>
        <div style={{height:26,width:60,background:'rgba(93,104,130,0.08)',borderRadius:6}}/>
      </div>
      <div style={{height:30,width:90,background:'rgba(245,158,11,0.1)',borderRadius:8,flexShrink:0}}/>
    </div>
  );
}

function JobCard({ job, saved, onToggleSave, onClick, onTailor, onInterview, onCoverLetter, onSkillGap, earlyBirdMode, resumeReady, isTracked, onTrack, onMatchResume, onAutoApply, autoApplyResult, autoApplyScore, isAutoApplying, lm, index, quickMatches, handleQuickMatch, resumeText }: {
  job: JobWithMatch;saved:boolean;onToggleSave:()=>void;onClick:()=>void;onTailor:()=>void;onInterview:()=>void;onCoverLetter:()=>void;onSkillGap:()=>void;earlyBirdMode:boolean;resumeReady:boolean;isTracked:boolean;onTrack:()=>void;onMatchResume:()=>void;onAutoApply:()=>void;autoApplyResult:'applied'|'low_match'|null;autoApplyScore?:number;isAutoApplying:boolean;lm?:boolean;index?:number;quickMatches?:Record<string,any>;handleQuickMatch?:(job:any)=>void;resumeText?:string;
}) {
  const loc=[job.job_city,job.job_state].filter(Boolean).join(", ")||job.job_country||"";
  const badge=empBadge(job.job_employment_type);
  const hot=isHot(job.job_posted_at_datetime_utc);
  const hours=getHoursAgo(job.job_posted_at_datetime_utc);
  const comp=getCompetitionLabel(hours);
  const visaBadges=getVisaBadges(job.job_description);
  const qm = (quickMatches || {})[job.job_id];
  const diffBadge=getDifficultyBadge(job.job_title,job.job_description);
  const baseChance=diffBadge.label.startsWith("🟢")?80:diffBadge.label.startsWith("🔴")?30:55;
  const successChance=job.match?Math.min(99,Math.round(baseChance*0.4+job.match.matchScore*0.6)):baseChance;
  const successColor=successChance>=70?"#10b981":successChance>=50?"#f59e0b":"#ef4444";
  const successBg=successChance>=70?"rgba(16,185,129,0.08)":successChance>=50?"rgba(245,158,11,0.08)":"rgba(239,68,68,0.08)";
  const successBorder=successChance>=70?"rgba(16,185,129,0.22)":successChance>=50?"rgba(245,158,11,0.22)":"rgba(239,68,68,0.22)";
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.4)":"rgba(255,255,255,0.3)",t4:lm?"rgba(0,0,0,0.28)":"rgba(255,255,255,0.22)",bd:lm?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.06)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.03)"};

  const getJobDescription = () => {
    const cleaned = normalizeJobDescription(job?.job_description || (job as any)?.description || '');

    if (!cleaned) {
      return { text: 'Description unavailable. Open source posting for details.', available: false };
    }

    const MAX_LEN = 500;

    if (cleaned.length <= MAX_LEN) {
      return { text: cleaned, available: true };
    }

    const slice = cleaned.slice(0, MAX_LEN);
    const sentenceEnd = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('.\n'),
      slice.lastIndexOf('!\n'),
      slice.lastIndexOf('?\n')
    );

    if (sentenceEnd > 200) {
      return { text: cleaned.slice(0, sentenceEnd + 1) + ' …', available: true };
    }

    const lastSpace = slice.lastIndexOf(' ');
    const cutPoint = lastSpace > 200 ? lastSpace : MAX_LEN;

    return { text: cleaned.slice(0, cutPoint).trim() + '…', available: true };
  };

  const ebStatus = getEarlyBirdStatus(job);
  const h1bStatus = getH1BStatus(job);
  const logoStyle = getLogoStyle(job.employer_name || '');

  return(
    <motion.div
      className="job-card"
      layout
      initial={{opacity:0,y:16}}
      animate={{opacity:1,y:0}}
      exit={{opacity:0,scale:0.96}}
      whileHover={{y:-3,boxShadow:'0 16px 40px rgba(0,0,0,0.5),0 0 0 1px rgba(245,158,11,0.22)',borderColor:'rgba(245,158,11,0.30)',transition:{duration:0.2}}}
      transition={{duration:0.35,delay:Math.min((index??0)*0.05,0.25),ease:[0.25,0.46,0.45,0.94]}}
      style={{background:'linear-gradient(180deg,#1e2130 0%,#1a1d2a 100%)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'18px 18px 14px',position:'relative',overflow:'hidden',cursor:'pointer',boxShadow:'0 2px 12px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05)',transition:'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',flexDirection:'column',gap:10}}
    >
      {/* TOP SHIMMER LINE */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(245,158,11,0.2),transparent)',pointerEvents:'none'}}/>
      {/* LEFT ACCENT BAR */}
      <div className="job-card-accent"/>

      {/* HEADER ROW */}
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        {/* Company logo */}
        <div
          style={{width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,flexShrink:0,border:'1px solid rgba(255,255,255,0.08)',fontFamily:'var(--font-display)',background:logoStyle.bg,color:logoStyle.color,overflow:'hidden',cursor:'pointer'}}
          onClick={onClick}
        >
          {job.employer_logo
            ? <img src={job.employer_logo} alt={job.employer_name} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
            : (job.employer_name||'?')[0].toUpperCase()
          }
        </div>
        {/* Title + company + city */}
        <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={onClick}>
          <div style={{fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'rgba(255,255,255,0.92)',letterSpacing:'-0.3px',lineHeight:1.3,marginBottom:3,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
            {job.job_title}
          </div>
          <div style={{fontFamily:'var(--font-primary)',fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.50)',display:'flex',alignItems:'center',gap:6}}>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.employer_name}</span>
            {job.job_city&&<><span style={{color:'rgba(255,255,255,0.2)',flexShrink:0}}>·</span><span style={{color:'rgba(255,255,255,0.35)',flexShrink:0}}>{job.job_city}</span></>}
          </div>
        </div>
        {/* Time + save */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
          <button style={{background:"none",border:"none",cursor:"pointer",padding:2,opacity:0.5}} onClick={e=>{e.stopPropagation();onToggleSave();}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={saved?"#f59e0b":"none"} stroke={saved?"#f59e0b":"rgba(255,255,255,0.35)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <span style={{fontFamily:'var(--font-primary)',fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.25)'}}>{ebStatus.label}</span>
        </div>
      </div>

      {/* ROW 2: Match score bar */}
      {job.matchLoading&&(
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#f59e0b"}}>
          <div className="spin-sm"/>Analyzing match…
        </div>
      )}
      {job.match&&!job.matchLoading&&(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,height:3,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${job.match.matchScore}%`,background:scoreColor(job.match.matchScore),borderRadius:99,transition:"width 0.6s ease"}}/>
          </div>
          <span style={{fontSize:10,color:scoreColor(job.match.matchScore),flexShrink:0,fontWeight:600}}>{job.match.matchScore}% match</span>
        </div>
      )}

      {/* BADGES ROW */}
      <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
        {ebStatus.isHotJob&&<span style={{fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:999,letterSpacing:'0.3px',background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',boxShadow:'0 2px 8px rgba(249,115,22,0.25)',fontFamily:'var(--font-primary)',animation:'hotGlow 2s ease infinite'}}>🔥 HOT</span>}
        {ebStatus.isEarly&&!ebStatus.isHotJob&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:999,background:'rgba(245,158,11,0.10)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.20)',fontFamily:'var(--font-primary)'}}>⚡ Still Early</span>}
        {h1bStatus&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:999,background:h1bStatus.sponsors?'rgba(142,178,155,0.10)':'rgba(214,178,104,0.08)',color:h1bStatus.sponsors?'#8eb29b':'#d6b268',border:h1bStatus.sponsors?'1px solid rgba(142,178,155,0.20)':'1px solid rgba(214,178,104,0.18)',fontFamily:'var(--font-primary)'}}>{h1bStatus.sponsors?'✓ H1B':'~ H1B Likely'}</span>}
        {(()=>{const hrs=ebStatus.hoursOld;const count=hrs<=1?'~2':hrs<=3?'~8':hrs<=6?'~18':hrs<=12?'~40':hrs<=24?'~80':hrs<=48?'~150':'200+';const isLow=hrs<=12;return<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:999,background:isLow?'rgba(142,178,155,0.08)':'rgba(239,68,68,0.06)',color:isLow?'#8eb29b':'rgba(239,68,68,0.6)',border:isLow?'1px solid rgba(142,178,155,0.16)':'1px solid rgba(239,68,68,0.12)',fontFamily:'var(--font-primary)'}}>👤 {count} applicants</span>})()}
        {(()=>{const src=getApplySource(job);return<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:999,background:src.direct?'rgba(6,182,212,0.12)':'rgba(245,158,11,0.08)',color:src.direct?'#06b6d4':'#a1a1aa',border:src.direct?'1px solid rgba(6,182,212,0.3)':'1px solid rgba(245,158,11,0.2)',fontFamily:'var(--font-primary)'}}>{src.direct?'🎯':'🔗'} {src.label}</span>})()}
      </div>

      {/* DESCRIPTION */}
      <p style={{fontFamily:'var(--font-primary)',fontSize:12,fontWeight:400,color:'rgba(255,255,255,0.55)',lineHeight:1.65,margin:0,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as const,whiteSpace:'pre-line'}}>
        {getJobDescription().text}
      </p>

      {/* Quick Match Preview */}
      {qm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 10,
            marginTop: 6
          }}
        >
          {qm.loading ? (
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block' }}
              >
                ⟳
              </motion.span>
              Analyzing your resume match...
            </div>
          ) : (
            <>
              {/* Score bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8
              }}>
                <span style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  Your Match
                </span>
                <div style={{
                  flex: 1,
                  height: 4,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 99,
                  overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${qm.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      background: qm.score >= 70
                        ? 'linear-gradient(90deg, var(--gold), #8eb29b)'
                        : qm.score >= 50
                          ? 'linear-gradient(90deg, #d6b268, #c9922a)'
                          : 'linear-gradient(90deg, rgba(239,68,68,0.7), rgba(220,38,38,0.7))'
                    }}
                  />
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: qm.score >= 70
                    ? '#8eb29b'
                    : qm.score >= 50
                      ? '#d6b268'
                      : 'rgba(239,68,68,0.7)',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.5px'
                }}>
                  {qm.score}%
                </span>
              </div>

              {/* Matching skills */}
              {qm.matching.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginBottom: 6
                }}>
                  {qm.matching.slice(0, 3).map((skill: string, i: number) => (
                    <span key={i} style={{
                      fontSize: 9,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(142,178,155,0.10)',
                      color: '#8eb29b',
                      border: '1px solid rgba(142,178,155,0.18)',
                      fontWeight: 600
                    }}>
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Missing skills */}
              {qm.missing.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginBottom: 6
                }}>
                  {qm.missing.slice(0, 2).map((skill: string, i: number) => (
                    <span key={i} style={{
                      fontSize: 9,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'rgba(239,68,68,0.07)',
                      color: 'rgba(239,68,68,0.65)',
                      border: '1px solid rgba(239,68,68,0.14)',
                      fontWeight: 600
                    }}>
                      ⚠ {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Recommendation */}
              {qm.recommendation && (
                <p style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.40)',
                  lineHeight: 1.5,
                  margin: 0,
                  fontStyle: 'italic'
                }}>
                  💡 {qm.recommendation.slice(0, 100)}
                </p>
              )}
            </>
          )}
        </motion.div>
      ) : resumeText ? (
        <motion.button
          onClick={() => handleQuickMatch && handleQuickMatch(job)}
          whileHover={{
            background: 'rgba(245,158,11,0.12)',
            borderColor: 'rgba(245,158,11,0.3)'
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.12)',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(245,158,11,0.65)',
            cursor: 'pointer',
            fontFamily: 'var(--font-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.18s ease'
          }}
        >
          🎯 Check how this matches your resume
        </motion.button>
      ) : null}

      {/* ROW 4: 4 action buttons */}
      <div className="action-btns" style={{display:"flex",gap:4}}>
        <motion.button className={`action-card-btn match-btn${job.match?" done":""}`} onClick={e=>{e.stopPropagation();onMatchResume();}} disabled={!!job.matchLoading} title="AI match score" whileHover={{backgroundColor:'rgba(245,158,11,0.12)',borderColor:'rgba(245,158,11,0.28)',color:'#f59e0b'}} whileTap={{scale:0.94}}>
          {job.matchLoading?<><div className="spin-sm"/>…</>:job.match?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{` ${job.match.matchScore}%`}</>:<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Match</>}
        </motion.button>
        <motion.button className={`action-card-btn interview-btn${job.interview?" done":""}`} onClick={e=>{e.stopPropagation();onInterview();}} disabled={!!job.interviewLoading} title="Interview prep" whileHover={{backgroundColor:'rgba(245,158,11,0.12)',borderColor:'rgba(245,158,11,0.28)',color:'#f59e0b'}} whileTap={{scale:0.94}}>
          {job.interviewLoading?<><div className="spin-sm"/>…</>:job.interview?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>:<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg> Prep</>}
        </motion.button>
        <motion.button className={`action-card-btn tailor-btn${job.tailor?" done":""}`} onClick={e=>{e.stopPropagation();onTailor();}} disabled={!!job.tailorLoading} title="Tailor resume" whileHover={{backgroundColor:'rgba(245,158,11,0.12)',borderColor:'rgba(245,158,11,0.28)',color:'#f59e0b'}} whileTap={{scale:0.94}}>
          {job.tailorLoading?<><div className="spin-sm"/>…</>:job.tailor?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>:<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg> Tailor</>}
        </motion.button>
        <motion.button className={`action-card-btn track-btn${isTracked?" tracked":""}`} onClick={e=>{e.stopPropagation();onTrack();}} title="Track application" whileHover={{backgroundColor:'rgba(245,158,11,0.12)',borderColor:'rgba(245,158,11,0.28)',color:'#f59e0b'}} whileTap={{scale:0.94}}>
          {isTracked?<><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> Saved</>:<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> Track</>}
        </motion.button>
      </div>

      {/* ROW 5: Apply */}
      {job.job_apply_link&&(
        <motion.a
          href={job.job_apply_link} target="_blank" rel="noopener noreferrer"
          whileHover={{scale:1.02,boxShadow:'0 8px 32px rgba(245,158,11,0.35)'}}
          whileTap={{scale:0.98}}
          style={{width:'100%',background:hot&&earlyBirdMode?'linear-gradient(135deg,#ef4444,#fbbf24)':'linear-gradient(135deg,var(--gold),var(--gold-hover))',border:'none',borderRadius:12,padding:'12px',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'var(--font-primary)',letterSpacing:'-0.2px',textDecoration:'none',textAlign:'center',display:'block',boxShadow:'0 4px 16px rgba(245,158,11,0.25),inset 0 1px 0 rgba(255,255,255,0.15)',transition:'all 0.2s ease'}}
          onClick={e=>e.stopPropagation()}
        >
          {hot&&earlyBirdMode?"⚡ Apply Now — Beat the Rush!":"Apply Now →"}
        </motion.a>
      )}

      {/* ROW 6: Auto Apply — secondary CTA */}
      {(autoApplyResult==="applied"||autoApplyResult==="low_match"||isAutoApplying)?(
        isAutoApplying?(
          <div style={{textAlign:'center',fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.25)",paddingTop:2}}>
            <span className="spin-sm" style={{display:'inline-block',verticalAlign:'middle',marginRight:4}}/> Analyzing…
          </div>
        ):autoApplyResult==="applied"?(
          <div style={{textAlign:'center',fontSize:10,fontWeight:600,color:"#34d399",paddingTop:2}}>✅ Applied</div>
        ):(
          <div style={{width:'100%',padding:'8px 10px',borderRadius:8,background:'rgba(251,191,36,0.10)',border:'1px solid rgba(251,191,36,0.35)',textAlign:'center',fontSize:11,fontWeight:600,color:'#fbbf24',letterSpacing:'-0.1px',lineHeight:1.4}}>
            ⚠️ Low Match{autoApplyScore!==undefined?` — ${autoApplyScore}%`:''} · Review Before Applying
          </div>
        )
      ):(
        <motion.button
          onClick={e=>{e.stopPropagation();onAutoApply();}}
          disabled={isAutoApplying}
          title="AI scores your resume, tracks as Applied, and opens the job link"
          whileHover={{color:'rgba(255,255,255,0.5)',borderColor:'rgba(255,255,255,0.14)'}}
          whileTap={{scale:0.97}}
          style={{
            width:"100%",padding:"5px",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",fontSize:10,fontWeight:500,
            cursor:"pointer",fontFamily:'var(--font-primary)',background:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:'all 0.15s ease',
            color:"rgba(255,255,255,0.22)",letterSpacing:"0.1px"
          }}
        >
          ⚡ Auto Apply
        </motion.button>
      )}
    </motion.div>
  );
}

interface Preferences {
  jobTitles: string;
  minSalary: string;
  locationTypes: string[];
  jobTypes: string[];
}
const DEFAULT_PREFS: Preferences = { jobTitles:"", minSalary:"", locationTypes:[], jobTypes:[] };

function PreferencesModal({ onClose, lm, onSave }: { onClose:()=>void; lm?:boolean; onSave?:(p:Preferences)=>void }) {
  const [prefs, setPrefs] = useState<Preferences>(()=>{
    try { const s=localStorage.getItem("vegaply_preferences"); return s?JSON.parse(s):DEFAULT_PREFS; } catch { return DEFAULT_PREFS; }
  });
  const [saved, setSaved] = useState(false);
  const t={t1:lm?"#111":"#fff",t2:lm?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.45)",t3:lm?"rgba(0,0,0,0.35)":"rgba(255,255,255,0.3)",bd:lm?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.07)",bg:lm?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.025)",inp:lm?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.04)",inpb:lm?"rgba(0,0,0,0.1)":"rgba(255,255,255,0.09)"};

  const toggleArr=(arr:string[], val:string)=>arr.includes(val)?arr.filter(v=>v!==val):[...arr,val];

  const savePrefs=()=>{
    localStorage.setItem("vegaply_preferences", JSON.stringify(prefs));
    onSave?.(prefs);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const label=(txt:string)=>(<div style={{fontSize:11,fontWeight:700,color:t.t2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>{txt}</div>);
  const checkRow=(arr:string[], val:string, display:string, setter:(v:string[])=>void)=>(
    <label key={val} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"6px 10px",borderRadius:8,background:arr.includes(val)?"rgba(245,158,11,0.1)":"transparent",border:`1px solid ${arr.includes(val)?"rgba(245,158,11,0.3)":t.bd}`,transition:"all .15s"}}>
      <input type="checkbox" checked={arr.includes(val)} onChange={()=>setter(toggleArr(arr,val))} style={{accentColor:"#f59e0b",width:14,height:14}}/>
      <span style={{fontSize:12,fontWeight:500,color:arr.includes(val)?"#fbbf24":t.t2}}>{display}</span>
    </label>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-head">
          <div style={{fontSize:28}}>⚙️</div>
          <div>
            <h2 className="modal-title">Job Preferences</h2>
            <p className="modal-sub">Personalize your job search experience</p>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Desired job titles */}
          <div>
            {label("Desired Job Titles")}
            <input
              type="text"
              className="dark-input"
              placeholder="e.g. Software Engineer, Data Analyst, Product Manager"
              value={prefs.jobTitles}
              onChange={e=>setPrefs(p=>({...p,jobTitles:e.target.value}))}
              style={{width:"100%",boxSizing:"border-box"}}
            />
            <div style={{fontSize:10,color:t.t3,marginTop:5}}>Separate multiple titles with commas</div>
          </div>

          {/* Minimum salary */}
          <div>
            {label("Minimum Salary (USD / year)")}
            <input
              type="number"
              className="dark-input"
              placeholder="e.g. 80000"
              value={prefs.minSalary}
              onChange={e=>setPrefs(p=>({...p,minSalary:e.target.value}))}
              style={{width:"100%",boxSizing:"border-box"}}
              min={0}
            />
          </div>

          {/* Location type */}
          <div>
            {label("Preferred Work Location")}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {checkRow(prefs.locationTypes,"remote","🌐 Remote",v=>setPrefs(p=>({...p,locationTypes:v})))}
              {checkRow(prefs.locationTypes,"hybrid","🏢 Hybrid",v=>setPrefs(p=>({...p,locationTypes:v})))}
              {checkRow(prefs.locationTypes,"onsite","📍 On-site",v=>setPrefs(p=>({...p,locationTypes:v})))}
            </div>
          </div>

          {/* Job types */}
          <div>
            {label("Job Type")}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {checkRow(prefs.jobTypes,"full-time","⏰ Full-time",v=>setPrefs(p=>({...p,jobTypes:v})))}
              {checkRow(prefs.jobTypes,"part-time","🕐 Part-time",v=>setPrefs(p=>({...p,jobTypes:v})))}
              {checkRow(prefs.jobTypes,"contract","📋 Contract",v=>setPrefs(p=>({...p,jobTypes:v})))}
            </div>
          </div>

          {/* Save */}
          <button
            className="gradient-btn"
            onClick={savePrefs}
            style={{marginTop:4}}
          >
            {saved?"✅ Preferences Saved!":"Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getApplicantEstimate(h: number): string | null {
  if (h >= 999) return null;
  if (h <= 1) return '~2 applicants';
  if (h <= 2) return '~5 applicants';
  if (h <= 4) return '~12 applicants';
  if (h <= 6) return '~20 applicants';
  if (h <= 12) return '~45 applicants';
  if (h <= 24) return '~80 applicants';
  if (h <= 48) return '~150 applicants';
  if (h <= 72) return '~200 applicants';
  return '200+ applicants';
}

function scoreJob(job: JobWithMatch): number {
  let score = 0;
  const hoursOld = getHoursAgo(job.job_posted_at_datetime_utc);
  if (hoursOld <= 2) score += 100;
  else if (hoursOld <= 6) score += 80;
  else if (hoursOld <= 12) score += 60;
  else if (hoursOld <= 24) score += 40;
  else if (hoursOld <= 72) score += 20;
  if (isH1bSponsor(job.employer_name)) score += 15;
  if (job.match) {
    if (job.match.matchScore >= 80) score += 30;
    else if (job.match.matchScore >= 60) score += 20;
    else if (job.match.matchScore >= 40) score += 10;
  }
  return score;
}

export default function Home() {
  const [jobRole,setJobRole]=useState("");const [location,setLocation]=useState("");
  const searchParams = useSearchParams();
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
  const [onboardError,setOnboardError]=useState("");
  const [showOnboard,setShowOnboard]=useState(false);
  const [obTermLines,setObTermLines]=useState<string[]>([]);
  const [obTermItems,setObTermItems]=useState<{text:string;color:string}[]>([]);
  const [showResumeHistory,setShowResumeHistory]=useState(false);
  const [resumeHistory,setResumeHistory]=useState<{id:string;file_name:string;created_at:string;resume_text:string}[]>([]);
  const [showMobileSearch,setShowMobileSearch]=useState(false);
  const [showMobileSidebar,setShowMobileSidebar]=useState(false);
  const [shareToast,setShareToast]=useState(false);
  const [autoApplyCount,setAutoApplyCount]=useState(0);
  const [autoApplying,setAutoApplying]=useState<string|null>(null);
  const [autoApplyResults,setAutoApplyResults]=useState<Record<string,'applied'|'low_match'>>({});
  const [autoApplyScores,setAutoApplyScores]=useState<Record<string,number>>({});
  const [autoApplyToast,setAutoApplyToast]=useState<string|null>(null);
  const [autoApplyModal,setAutoApplyModal]=useState<{job:JobWithMatch;tailoredBullets:{original:string;tailored:string;reason:string}[];keywordsAdded:string[];score:number;atsTip:string}|null>(null);
  const [showPreferences,setShowPreferences]=useState(false);
  const [savedPrefs,setSavedPrefs]=useState<Preferences>(DEFAULT_PREFS);
  const [activeMode,setActiveMode]=useState<'all'|'earlybird'|'h1b'>('all');
  const [quickMatches, setQuickMatches] = useState<Record<string, {
    score: number,
    matching: string[],
    missing: string[],
    recommendation: string,
    loading: boolean
  }>>({})

  const lsGet=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");return localStorage.getItem(uid?`${key}_${uid}`:key);};
  const lsSet=(key:string,val:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.setItem(uid?`${key}_${uid}`:key,val);};
  const lsRemove=(key:string)=>{const uid=localStorage.getItem("applysmart_user_id");localStorage.removeItem(uid?`${key}_${uid}`:key);localStorage.removeItem(key);};

  useEffect(()=>{
    setMounted(true);
    const savedTheme=localStorage.getItem("applysmart_theme");
    if(savedTheme==="light")setDarkMode(false);
    try{const t=localStorage.getItem("applysmart_tracker");if(t)setTrackedApps(JSON.parse(t));}catch{}
    try{const today=new Date().toISOString().slice(0,10);const c=localStorage.getItem(`vegaply_autoapply_${today}`);if(c)setAutoApplyCount(parseInt(c,10)||0);}catch{}
    const savedRole=localStorage.getItem("applysmart_jobRole");
    const savedLocation=localStorage.getItem("applysmart_location");
    let loadedPrefs=DEFAULT_PREFS;
    try{const s=localStorage.getItem("vegaply_preferences");if(s)loadedPrefs=JSON.parse(s);}catch{}
    setSavedPrefs(loadedPrefs);
    if(savedRole)setJobRole(savedRole);
    if(savedLocation)setLocation(savedLocation);
    if(!savedRole&&loadedPrefs.jobTitles){const titles=loadedPrefs.jobTitles.split(',').map((t:string)=>t.trim()).filter(Boolean);if(titles.length>0)setJobRole(titles[0]);}
    if(!savedRole||!savedLocation)return;
    if(savedRole&&savedLocation){
      setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
      fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole:savedRole,location:savedLocation,earlyBird:false})})
        .then(r=>r.json()).then(data=>setJobs(data?.data||[])).catch(console.error)
        .finally(()=>setLoading(false));
      setLoading(true);setJobs([]);
    }
    import("@/lib/supabase").then(async({supabase})=>{
      const{data}=await supabase.auth.getUser();
      if(data.user?.email)setUserEmail(data.user.email);
      const uid=data.user?.id;
      if(uid){
        localStorage.setItem("applysmart_user_id",uid);
        // Force onboarding if ?onboard=true in URL
        const forceOnboard = searchParams.get('onboard') === 'true'
        if (forceOnboard) {
          localStorage.removeItem(`applysmart_onboarded_${uid}`)
          setShowOnboard(true)
          return
        }
        // After getting the user session, check Supabase for onboarding status
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarded, resume_text, job_role, location')
            .eq('id', uid)
            .single()

          if (error) throw error

          // Show onboarding if:
          // 1. No profile exists yet, OR
          // 2. onboarded flag is false, OR
          // 3. resume_text is empty
          if (!profile || !profile.onboarded || !profile.resume_text) {
            setShowOnboard(true)
            // Pre-fill if they have partial data
            if (profile?.job_role) setJobRole(profile.job_role)
            if (profile?.location) setLocation(profile.location)
          }
        } catch (e) {
          // Fallback to localStorage if Supabase fails
          const onboarded = localStorage.getItem(`applysmart_onboarded_${uid}`)
          if (!onboarded) setShowOnboard(true)
        }
        const toured=localStorage.getItem(`applysmart_toured_${uid}`);
        if(!toured)setShowWelcomeTour(false);
      }
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
            const{data:rd}=await supabase.from("resumes").select("resume_text,file_name").eq("user_id",currentUserId).order("created_at",{ascending:false}).limit(1).maybeSingle();
            if(rd?.resume_text){setResumeText(rd.resume_text);setResumeFileName(rd.file_name??"Resume");lsSet("applysmart_resume",rd.resume_text);lsSet("applysmart_resume_name",rd.file_name??"Resume");}
          }
        }
        localStorage.setItem("applysmart_user_id",currentUserId);
        // Load apply_tracking from Supabase and merge with localStorage
        const { data: trackedFromDB } = await supabase
          .from("apply_tracking")
          .select("*")
          .eq("user_id", currentUserId)
          .order("applied_at", { ascending: false });

        if (trackedFromDB && trackedFromDB.length > 0) {
          setTrackedApps(prev => {
            const existing = new Map(prev.map(a => [a.job?.job_id, a]));

            const fromDB: TrackedApp[] = trackedFromDB.map(row => ({
              id: row.job_id || row.id,
              status: "Applied" as AppStatus,
              appliedDate: row.applied_at,
              notes: "",
              job: {
                job_id: row.job_id || row.id,
                job_title: row.job_title || "Unknown Role",
                employer_name: row.company_name || "Unknown Company",
                job_apply_link: row.apply_url || "",
                job_city: "",
                job_state: "",
                job_country: "",
                job_description: "",
                job_posted_at_timestamp: 0,
                job_employment_type: "",
                source: row.ats_type || "other"
              } as Job
            }));

            fromDB.forEach(dbApp => {
              if (!existing.has(dbApp.job?.job_id)) {
                existing.set(dbApp.job?.job_id, dbApp);
              }
            });

            return Array.from(existing.values());
          });
        }
      });
    });
  },[]);

  const fetchJobs=async(mode:"normal"|"earlybird",role?:string,loc?:string)=>{
    const r=role??jobRole;const l=loc??location;
    if(!r||!l)return;
    if(mode==="normal"){setLoading(true);setJobs([]);}else{setEbLoading(true);setEarlyBirdJobs([]);setAutoOpenDone(false);}
    try{const res=await fetch("/api/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobRole:r,location:l,earlyBird:mode==="earlybird"})});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();const raw:JobWithMatch[]=data?.data||[];const sorted=[...raw].sort((a,b)=>scoreJob(b)-scoreJob(a));if(mode==="normal")setJobs(sorted);else setEarlyBirdJobs(sorted);}catch(err){console.error("fetchJobs error:",err);}
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
    try{const res=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});const tailor:TailorResult=await res.json();const updated={...job,tailor,tailorLoading:false};setList(list.map(j=>j.job_id===job.job_id?updated:j));setTailorJob(updated);}catch(err){console.error('[Tailor] failed:',err);setList(list.map(j=>j.job_id===job.job_id?{...j,tailorLoading:false}:j));setAutoApplyToast("⚠️ Tailor analysis failed — please try again");setTimeout(()=>setAutoApplyToast(""),4000);}
  };

  const handleQuickMatch = async (job: any) => {
    const jobId = job.job_id
    if (quickMatches[jobId]) return // already loaded

    setQuickMatches(prev => ({
      ...prev,
      [jobId]: { score: 0, matching: [], missing: [],
                 recommendation: '', loading: true }
    }))

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: resumeText || '',
          job: {
            job_title: job.job_title,
            employer_name: job.employer_name,
            job_description: job.job_description?.slice(0, 1500) || '',
            job_highlights: job.job_highlights || {}
          }
        })
      })
      const data = await response.json()

      setQuickMatches(prev => ({
        ...prev,
        [jobId]: {
          score: data.matchScore || data.score || 0,
          matching: data.matchedSkills || data.matchingSkills || [],
          missing: data.missingSkills || [],
          recommendation: data.matchSummary || data.recommendation || data.summary || '',
          loading: false
        }
      }))
    } catch {
      setQuickMatches(prev => ({
        ...prev,
        [jobId]: { score: 0, matching: [], missing: [],
                   recommendation: 'Could not load match', loading: false }
      }))
    }
  }

  const handleInterview=(job:JobWithMatch)=>{
    setInterviewJob(job);
  };

  const handleAutoApply=async(job:JobWithMatch)=>{
    if(!resumeText){alert("Upload your resume first to use Auto Apply!");return;}
    const today=new Date().toISOString().slice(0,10);
    if(autoApplyCount>=30){
      setAutoApplyToast("Daily limit reached (30/30). Resets tomorrow!");
      setTimeout(()=>setAutoApplyToast(null),4000);
      return;
    }
    if(autoApplyResults[job.job_id]==="applied")return;
    setAutoApplying(job.job_id);
    try{
      setAutoApplyToast("Analyzing job...");
      // Pass 1 — tailor
      setAutoApplyToast("Tailoring resume...");
      const tailorRes=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});
      let tailorData=await tailorRes.json();
      // Pass 1 — match
      setAutoApplyToast("Checking ATS score...");
      const matchRes=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});
      const matchData:MatchResult=await matchRes.json();
      let score=matchData.matchScore??0;
      let missingSkills:string[]=matchData.missingSkills??[];
      // Pass 2 — re-tailor if score < 60
      if(score<60&&missingSkills.length>0){
        setAutoApplyToast("Re-tailoring for better match...");
        const instruction=`Previous ATS score was ${Math.round(score)}%. Focus on these missing keywords: ${missingSkills.slice(0,8).join(", ")}. Rewrite bullets to include these terms.`;
        const reTailorRes=await fetch("/api/tailor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job,instruction})});
        tailorData=await reTailorRes.json();
        const reMatchRes=await fetch("/api/match",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeText,job})});
        const reMatchData:MatchResult=await reMatchRes.json();
        score=reMatchData.matchScore??score;
        missingSkills=reMatchData.missingSkills??missingSkills;
      }
      const finalScore=Math.round(score);
      setAutoApplyScores(prev=>({...prev,[job.job_id]:finalScore}));
      setAutoApplyToast(null);
      setAutoApplyModal({job,tailoredBullets:tailorData.tailoredBullets??[],keywordsAdded:tailorData.keywordsAdded??[],score:finalScore,atsTip:tailorData.atsTip??""});
    }catch(err){
      console.error("[AutoApply] failed:",err);
      setAutoApplyResults(prev=>({...prev,[job.job_id]:"low_match"}));
      setAutoApplyToast("⚠️ Could not analyze match — please review the job before applying");
      setTimeout(()=>setAutoApplyToast(null),5000);
    }
    setAutoApplying(null);
  };

  const handleConfirmApply=async()=>{
    if(!autoApplyModal)return;
    const{job,score}=autoApplyModal;
    const today=new Date().toISOString().slice(0,10);
    const applyLink=job.job_apply_link||(job as any).url;
    if(applyLink)window.open(applyLink,"_blank");
    setTrackedApps(prev=>{const exists=prev.find(a=>a.job.job_id===job.job_id);let next:TrackedApp[];if(exists){next=prev.map(a=>a.job.job_id===job.job_id?{...a,status:"Applied" as AppStatus}:a);}else{next=[...prev,{job,status:"Applied" as AppStatus,appliedDate:new Date().toISOString(),notes:"",id:job.job_id+Date.now()}];}localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;});
    const newCount=autoApplyCount+1;
    setAutoApplyCount(newCount);
    localStorage.setItem(`vegaply_autoapply_${today}`,String(newCount));
    setAutoApplyResults(prev=>({...prev,[job.job_id]:"applied"}));
    fetch("/api/autoapply-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:userEmail,jobTitle:job.job_title,company:job.employer_name,location:[job.job_city,job.job_state,job.job_country].filter(Boolean).join(", "),appliedDate:new Date().toISOString(),score,userName:userEmail.split("@")[0]})}).catch(err=>console.error("[AutoApply] email failed:",err));
    setAutoApplyToast(`✅ Applied to ${job.employer_name} — confirmation email sent`);
    setTimeout(()=>setAutoApplyToast(null),5000);
    setAutoApplyModal(null);
  };

  const addToTracker=(job:Job)=>{if(trackedApps.find(a=>a.job.job_id===job.job_id))return;setTrackedApps(prev=>{const next=[...prev,{job,status:"Saved" as AppStatus,appliedDate:new Date().toISOString(),notes:"",id:job.job_id+Date.now()}];localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;});};
  const toggleSave=(jobId:string)=>setSavedJobs(prev=>{const n=new Set(prev);n.has(jobId)?n.delete(jobId):n.add(jobId);return n;});
  const prefTitles=savedPrefs.jobTitles.split(',').map(t=>t.trim()).filter(Boolean);
  const filterJobs=(list:JobWithMatch[])=>list.filter(job=>{
    if(filterType!=="ALL"&&job.job_employment_type!==filterType)return false;
    if(filterRemote&&!job.job_is_remote)return false;
    if(filterDate!=="ANY"&&job.job_posted_at_datetime_utc){const days=(Date.now()-new Date(job.job_posted_at_datetime_utc).getTime())/86400000;if(filterDate==="TODAY"&&days>1)return false;if(filterDate==="WEEK"&&days>7)return false;if(filterDate==="MONTH"&&days>30)return false;}
    if(prefTitles.length>0&&!prefTitles.some(t=>job.job_title.toLowerCase().includes(t.toLowerCase())))return false;
    return true;
  });

  const isEarlyBird = (job: any): boolean => {
    const ts = job.job_posted_at_timestamp
    if (!ts || ts === 0) return true
    const hoursOld = (Date.now() / 1000 - ts) / 3600
    return hoursOld <= 72
  }

  const isH1B = (job: any): boolean => isH1bSponsor(job.employer_name)

  const modeFilteredJobs=activeMode==='earlybird'
    ?jobs.filter(j=>getEarlyBirdStatus(j).isEarly)
    :activeMode==='h1b'
    ?jobs.filter(isH1B)
    :jobs;
  const smartEbCount=jobs.filter(j=>getEarlyBirdStatus(j).isEarly).length;
  const h1bCount=jobs.filter(isH1B).length;
  const allSaved=[...jobs,...earlyBirdJobs].filter((j,i,arr)=>savedJobs.has(j.job_id)&&arr.findIndex(x=>x.job_id===j.job_id)===i);

  const displayJobs=activeTab==="results"?filterJobs(modeFilteredJobs):activeTab==="earlybird"?jobs.filter(j=>getEarlyBirdStatus(j).isEarly):allSaved;
  const isEbMode=activeTab==="earlybird";
  const hotCount=jobs.filter(j=>getEarlyBirdStatus(j).isHotJob).length;
  const totalPages=Math.ceil(displayJobs.length/JOBS_PER_PAGE);
  const paginatedJobs=displayJobs.slice((currentPage-1)*JOBS_PER_PAGE,currentPage*JOBS_PER_PAGE);
  const currentLoading=isEbMode?ebLoading:loading;
  const allJobs=[...jobs,...earlyBirdJobs];
  const totalSearched=allJobs.length;

  // AI Intelligence Panel computed values
  const panelFreshJobs = jobs.filter(j => getEarlyBirdStatus(j).isEarly);
  const panelHotJobs   = jobs.filter(j => getEarlyBirdStatus(j).isHotJob);
  const panelH1bJobs   = jobs.filter(j => getH1BStatus(j) !== null);
  const panelLowComp   = jobs.filter(j => {
    const comp = (j as any).competition_level ?? '';
    return /easy|very low|low/i.test(comp);
  });
  const topCompaniesMap = jobs.reduce((acc: Record<string,number>, j) => {
    if (j.employer_name) acc[j.employer_name] = (acc[j.employer_name] || 0) + 1;
    return acc;
  }, {});
  const topCompaniesList = Object.entries(topCompaniesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
  const getCoachingInsight = (): string => {
    if (!resumeText) return 'Upload your resume to unlock AI coaching';
    if (jobs.length === 0) return 'Search for jobs to see personalized insights';
    if (panelHotJobs.length > 5) return `🔥 ${panelHotJobs.length} HOT jobs posted recently — apply in the next 2 hours`;
    if (panelH1bJobs.length > 20) return `🌐 ${panelH1bJobs.length} H1B-friendly roles found — great opportunity`;
    if (panelFreshJobs.length > 0) return `⚡ ${panelFreshJobs.length} early jobs found — you are ahead of most applicants`;
    return '💡 Apply to low-competition roles first for best callback rates';
  };

  const completeOnboarding=async()=>{
    const{data:{user}}=await supabase.auth.getUser();
    if(user){
      // Save to Supabase
      await supabase.from('profiles').upsert({
        id: user.id,
        onboarded: true,
        job_role: jobRole,
        location: location,
        resume_text: resumeText,
        updated_at: new Date().toISOString()
      })
      // Keep localStorage as backup
      localStorage.setItem(`applysmart_onboarded_${user.id}`, 'true')
    }
    setShowOnboard(false);
    if(onboardRole&&onboardLocation){
      localStorage.setItem("applysmart_jobRole",onboardRole);
      localStorage.setItem("applysmart_location",onboardLocation);
      setHasSearched(true);setCurrentPage(1);setActiveTab("results");setFilterType("ALL");setFilterDate("ANY");setFilterRemote(false);
      await fetchJobs("normal",onboardRole,onboardLocation);
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

  useEffect(()=>{
    if(onboardStep!==2)return;
    const TERM_LINES:{text:string;color:string}[]=[
      {text:"vegaply:~ user$ ./analyze-resume",color:"#fff"},
      {text:"▸ Scanning resume...",color:"#39ff14"},
      {text:"✔ Python · React · SQL detected",color:"#39ff14"},
      {text:"✔ 4 years experience",color:"#39ff14"},
      {text:"✔ Calculating match scores...",color:"#39ff14"},
      {text:"✔ 847 jobs matched",color:"#fbbf24"},
      {text:"▸ Top match: Google ML Engineer",color:"#f59e0b"},
      {text:"✔ Match Score: 94% — Strong Match",color:"#39ff14"},
      {text:"Ready. Let's get you hired. ✓",color:"#fff"},
    ];
    const delays=[0,1000,2000,3000,4000,5000,6000,7000,8000];
    const allTimeouts:ReturnType<typeof setTimeout>[]=[];
    const runSequence=()=>{
      setObTermItems([]);
      delays.forEach((d,i)=>{
        const t=setTimeout(()=>setObTermItems(prev=>[...prev,TERM_LINES[i]]),d);
        allTimeouts.push(t);
      });
    };
    runSequence();
    const loop=setInterval(runSequence,12000);
    return()=>{allTimeouts.forEach(clearTimeout);clearInterval(loop);};
  },[onboardStep]);

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
    <div data-theme={darkMode?"dark":"light"} style={{background:"radial-gradient(circle at 18% 22%,rgba(120,130,150,0.10),transparent 38%),radial-gradient(circle at 82% 72%,rgba(90,100,120,0.08),transparent 42%),linear-gradient(145deg,#1b1d22 0%,#23262d 100%)",minHeight:'100vh'}}>
      <style>{`
        :root {
          /* === BACKGROUNDS === */
          --bg-page:      #0a0a0c;
          --bg-surface:   #141418;
          --bg-elevated:  #1c1c22;
          --bg-input:     #1a1a1f;
          --bg-hover:     rgba(255,255,255,0.03);

          /* === TEXT === */
          --text-primary:   #f5f5f7;
          --text-secondary: #a1a1aa;
          --text-tertiary:  #6b6b75;
          --text-disabled:  #404048;

          /* === BORDERS === */
          --border-subtle: rgba(255,255,255,0.06);
          --border-normal: rgba(255,255,255,0.10);
          --border-strong: rgba(255,255,255,0.18);
          --border-focus:  rgba(245,158,11,0.45);

          /* === ACCENT: AMBER GOLD (human actions, brand) === */
          --gold:         #f59e0b;
          --gold-hover:   #fbbf24;
          --gold-subtle:  rgba(245,158,11,0.12);
          --gold-glow:    rgba(245,158,11,0.25);

          /* === ACCENT: ELECTRIC CYAN (AI, intelligence) === */
          --cyan:         #06b6d4;
          --cyan-hover:   #22d3ee;
          --cyan-subtle:  rgba(6,182,212,0.12);
          --cyan-glow:    rgba(6,182,212,0.25);

          /* === STATUS === */
          --success:        #10b981;
          --success-subtle: rgba(16,185,129,0.12);
          --warning:        #fbbf24;
          --warning-subtle: rgba(251,191,36,0.12);
          --danger:         #ef4444;
          --danger-subtle:  rgba(239,68,68,0.12);

          /* === SPACING (8px grid) === */
          --space-1: 4px;
          --space-2: 8px;
          --space-3: 12px;
          --space-4: 16px;
          --space-5: 20px;
          --space-6: 24px;
          --space-8: 32px;
          --space-10: 40px;
          --space-12: 48px;
          --space-16: 64px;

          /* === RADIUS === */
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
          --radius-full: 9999px;

          /* === SHADOWS === */
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
          --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
          --shadow-lg: 0 12px 32px rgba(0,0,0,0.5);
          --shadow-glow-gold: 0 0 24px rgba(245,158,11,0.20);
          --shadow-glow-cyan: 0 0 24px rgba(6,182,212,0.20);

          /* === ANIMATION === */
          --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
          --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
          --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
          --dur-fast:  120ms;
          --dur-base:  200ms;
          --dur-slow:  400ms;
          --dur-xslow: 600ms;

          /* === TYPOGRAPHY SCALE === */
          --text-xs:   11px;
          --text-sm:   13px;
          --text-base: 14px;
          --text-md:   16px;
          --text-lg:   20px;
          --text-xl:   28px;
          --text-2xl:  40px;
          --text-3xl:  56px;
        }

        /* === GLOBAL KEYFRAMES (for reuse across components) === */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(245,158,11,0); }
          50%      { box-shadow: 0 0 20px rgba(245,158,11,0.3); }
        }

        .anim-fade-up   { animation: fadeUp    400ms var(--ease-out) both; }
        .anim-slide-down{ animation: slideDown 300ms var(--ease-out) both; }
        .anim-count-up  { animation: countUp   600ms var(--ease-out) both; }
        .stagger-children > *:nth-child(1) { animation-delay:   0ms; }
        .stagger-children > *:nth-child(2) { animation-delay:  60ms; }
        .stagger-children > *:nth-child(3) { animation-delay: 120ms; }
        .stagger-children > *:nth-child(4) { animation-delay: 180ms; }
        .stagger-children > *:nth-child(5) { animation-delay: 240ms; }
        .stagger-children > *:nth-child(6) { animation-delay: 300ms; }
        .stagger-children > *:nth-child(7) { animation-delay: 360ms; }
        .stagger-children > *:nth-child(8) { animation-delay: 420ms; }

        @keyframes scaleInSoft {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes skeletonWave {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes fadeSoft {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .anim-scale-in   { animation: scaleInSoft  var(--dur-slow) var(--ease-out) both; }
        .anim-toast-slide{ animation: toastSlideUp var(--dur-base) var(--ease-out) both; }
        .anim-fade-soft  { animation: fadeSoft     var(--dur-slow) var(--ease-out) both; }
        .skeleton {
          background: linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-hover) 50%, var(--bg-elevated) 100%);
          background-size: 200% 100%;
          animation: skeletonWave 1.8s linear infinite;
          border-radius: var(--radius-md);
        }

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;padding:0;background:var(--bg-page);color:var(--text-primary);font-family:var(--font-primary);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.25);border-radius:99px}
        @keyframes ambientFloat{0%,100%{transform:scale(1) translate(0,0)}33%{transform:scale(1.08) translate(8px,-12px)}66%{transform:scale(0.96) translate(-6px,8px)}}
        @keyframes softGlow{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.0)}50%{box-shadow:0 0 20px 2px rgba(245,158,11,0.08)}}
        @keyframes focusGlow{0%{box-shadow:0 0 0 0 rgba(245,158,11,0.15)}to{box-shadow:0 0 0 6px rgba(245,158,11,0.0)}}
        @keyframes cardHoverGlow{0%,100%{box-shadow:0 12px 32px rgba(245,158,11,0.08),inset 0 1px 0 rgba(255,255,255,0.05)}50%{box-shadow:0 12px 40px rgba(245,158,11,0.12),inset 0 1px 0 rgba(255,255,255,0.08)}}
        @keyframes buttonPulse{0%,100%{box-shadow:0 4px 14px rgba(245,158,11,0.25)}50%{box-shadow:0 4px 20px rgba(245,158,11,0.40)}}
        @keyframes premiumShimmer{0%{background-position:0% center}100%{background-position:200% center}}

        /* TOPBAR */
        .topbar{position:sticky;top:0;z-index:50;height:60px;padding:0 var(--space-5);display:flex;align-items:center;gap:var(--space-4);background:var(--bg-surface);border-bottom:1px solid var(--border-subtle);backdrop-filter:blur(20px)}
        .topbar-logo{font-family:var(--font-display);font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;flex-shrink:0;margin-right:8px;cursor:pointer;display:flex;align-items:center}
        .topbar-logo span{font-style:italic;background:linear-gradient(135deg,#f59e0b,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .topbar-search{display:flex;align-items:center;gap:8px;flex:1;max-width:560px}
        .topbar-search-box{flex:1 1 auto;max-width:640px;min-width:400px;display:flex;align-items:center;height:40px;background:var(--bg-input);border:1px solid var(--border-normal);border-radius:var(--radius-md);overflow:hidden;transition:border-color var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
        .topbar-search-box:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--gold-subtle)}
        .topbar-input{flex:1 1 200px;min-width:160px;height:100%;padding:0 var(--space-4);background:transparent;border:none;outline:none;color:var(--text-primary);font-family:var(--font-primary);font-size:var(--text-sm)}
        .topbar-input::placeholder{color:var(--text-tertiary)}
        .topbar-input-loc{flex:0 0 140px;width:140px;height:100%;padding:0 var(--space-4);background:transparent;border:none;outline:none;color:var(--text-primary);font-family:var(--font-primary);font-size:var(--text-sm);border-left:1px solid var(--border-subtle)}
        .topbar-input-loc::placeholder{color:var(--text-tertiary)}
        .topbar-sep{width:1px;height:24px;background:var(--border-subtle);flex-shrink:0}
        .search-btn{height:40px;padding:0 var(--space-5);background:var(--gold);color:#1a1a1f;border:none;border-radius:var(--radius-md);font-family:var(--font-primary);font-size:var(--text-sm);font-weight:600;cursor:pointer;transition:background var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out),box-shadow var(--dur-base) var(--ease-out);flex-shrink:0}
        .search-btn:hover{background:var(--gold-hover);box-shadow:var(--shadow-glow-gold)}
        .search-btn:active{transform:scale(0.97)}
        .search-btn:disabled{opacity:0.35;cursor:not-allowed}
        @keyframes ebGlow{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.25)}50%{box-shadow:0 0 0 6px rgba(251,191,36,0)}}
        .eb-btn{height:36px;padding:0 var(--space-4);background:transparent;border:1px solid var(--gold-subtle);border-radius:var(--radius-md);color:var(--gold);font-family:var(--font-primary);font-size:var(--text-sm);font-weight:600;cursor:pointer;display:flex;align-items:center;gap:var(--space-2);transition:all var(--dur-base) var(--ease-out);flex-shrink:0}
        .eb-btn:hover{background:var(--gold-subtle);border-color:var(--gold)}
        .eb-btn.active{background:var(--gold);color:#1a1a1f;border-color:var(--gold);box-shadow:var(--shadow-glow-gold)}
        .eb-btn:disabled{opacity:0.35;cursor:not-allowed}
        .h1b-btn{height:36px;padding:0 var(--space-4);background:transparent;border:1px solid var(--cyan-subtle);border-radius:var(--radius-md);color:var(--cyan);font-family:var(--font-primary);font-size:var(--text-sm);font-weight:600;cursor:pointer;display:flex;align-items:center;gap:var(--space-2);transition:all var(--dur-base) var(--ease-out);flex-shrink:0}
        .h1b-btn:hover{background:var(--cyan-subtle);border-color:var(--cyan)}
        .h1b-btn.active{background:var(--cyan);color:#0a0a0c;border-color:var(--cyan);box-shadow:var(--shadow-glow-cyan)}
        .refresh-btn{height:36px;padding:0 var(--space-3);background:transparent;border:1px solid var(--border-subtle);border-radius:var(--radius-md);color:var(--text-secondary);font-family:var(--font-primary);font-size:var(--text-sm);font-weight:500;cursor:pointer;transition:all var(--dur-base) var(--ease-out);flex-shrink:0}
        .refresh-btn:hover{color:var(--text-primary);border-color:var(--border-normal);background:var(--bg-hover)}
        .refresh-btn:disabled{opacity:0.35;cursor:not-allowed}
        .refresh-btn.spinning svg{animation:spin360 .8s linear infinite}
        @keyframes spin360{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .refresh-toast{position:fixed;bottom:28px;right:28px;background:rgba(9,12,23,0.97);border:1px solid rgba(52,211,153,0.28);border-radius:12px;padding:12px 18px;font-size:13px;font-weight:600;color:#34d399;display:flex;align-items:center;gap:8px;z-index:600;backdrop-filter:blur(16px);animation:toastSlideUp var(--dur-base) var(--ease-out) both}
        .topbar-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0}
        .nav-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
        .pill-eb{background:rgba(251,191,36,0.07);color:#fbbf24;border:1px solid rgba(251,191,36,0.18)}
        .pill-tracker{background:rgba(245,158,11,0.09);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)}
        .user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#fbbf24);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
        .logout-btn{background:transparent;border:none;color:rgba(255,255,255,0.30);font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font-primary);letter-spacing:0.1px;padding:6px 10px;border-radius:8px;transition:color 0.18s ease}

        /* LAYOUT */
        .app-layout{display:flex;min-height:calc(100vh - 60px);background:var(--bg-page);position:relative;z-index:1}
        .sidebar{width:260px;flex-shrink:0;background:var(--bg-surface);border-right:1px solid var(--border-subtle);padding:var(--space-5) var(--space-4) var(--space-10) var(--space-4);display:flex;flex-direction:column;gap:var(--space-5);position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto}
        .content{flex:1;min-width:0;padding:var(--space-6) var(--space-8);max-width:calc(100vw - 260px - 320px);display:flex;flex-direction:column;gap:var(--space-6)}
        .right-panel{width:320px;flex-shrink:0;background:var(--bg-surface);border-left:1px solid var(--border-subtle);padding:var(--space-5) var(--space-4);display:flex;flex-direction:column;gap:var(--space-6);position:sticky;top:60px;height:calc(100vh - 60px);overflow-y:auto}
        @media(max-width:1200px){.right-panel{display:none!important}.content{max-width:calc(100vw - 260px)}}

        /* RIGHT PANEL COMPONENTS */
        .right-label{font-family:var(--font-primary);font-size:var(--text-xs);font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--space-4)}
        .activity-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)}
        .activity-card{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-1);transition:border-color var(--dur-base) var(--ease-out)}
        .activity-card:hover{border-color:var(--border-normal)}
        .activity-label{font-family:var(--font-primary);font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary)}
        .activity-number{font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px;line-height:1.1}
        .activity-number.gold{color:var(--gold)}
        .activity-number.cyan{color:var(--cyan)}
        .activity-sub{font-family:var(--font-primary);font-size:var(--text-xs);color:var(--text-secondary);display:flex;align-items:center;gap:4px}
        .coach-card{background:var(--cyan-subtle);border:1px solid rgba(6,182,212,0.25);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2);transition:border-color var(--dur-base) var(--ease-out)}
        .coach-card:hover{border-color:var(--cyan);box-shadow:0 0 12px var(--cyan-subtle)}
        .coach-card-label{font-family:var(--font-primary);font-size:var(--text-xs);font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--cyan)}
        .coach-card-text{font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-primary);line-height:1.5}
        .tracker-row{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-2)}
        .tracker-pill{background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-3) var(--space-2);display:flex;flex-direction:column;align-items:center;gap:2px;transition:border-color var(--dur-base) var(--ease-out)}
        .tracker-pill:hover{border-color:var(--border-normal)}
        .tracker-label{font-family:var(--font-primary);font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:var(--text-tertiary)}
        .tracker-number{font-family:var(--font-display);font-size:var(--text-lg);font-weight:700;color:var(--text-primary);line-height:1}
        .tracker-number.applied{color:var(--success)}
        .tracker-number.interview{color:var(--gold)}
        .tracker-number.offer{color:var(--cyan)}
        .tracker-number.rejected{color:var(--danger)}
        .hiring-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-radius:var(--radius-md);cursor:pointer;transition:background var(--dur-base) var(--ease-out)}
        .hiring-row:hover{background:var(--bg-hover)}
        .hiring-avatar{width:32px;height:32px;flex-shrink:0;border-radius:var(--radius-md);background:linear-gradient(135deg,var(--gold) 0%,#c97a0a 100%);color:#1a1a1f;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:var(--text-sm);font-weight:700}
        .hiring-name{flex:1;font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-primary);font-weight:500}
        .hiring-rank{font-family:var(--font-primary);font-size:var(--text-xs);color:var(--text-tertiary);font-weight:500}
        .live-item{display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)}
        .live-item:last-child{border-bottom:none}
        .live-dot{width:6px;height:6px;border-radius:var(--radius-full);background:var(--success);margin-top:6px;flex-shrink:0;box-shadow:0 0 6px var(--success);animation:pulse 2s ease-in-out infinite}
        .live-text{flex:1;font-family:var(--font-primary);font-size:var(--text-xs);color:var(--text-secondary);line-height:1.4}
        .live-time{font-family:var(--font-primary);font-size:10px;color:var(--text-tertiary);margin-left:var(--space-2);flex-shrink:0}

        /* SIDEBAR */
        .sidebar-card{background:transparent;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:var(--space-5);transition:border-color var(--dur-base) var(--ease-out),background var(--dur-base) var(--ease-out)}
        .sidebar-card:hover{border-color:var(--border-normal);background:var(--bg-hover)}
        .sidebar-card-title{font-family:var(--font-primary);font-size:var(--text-xs);font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:var(--space-4)}
        .sidebar-card-sub{font-size:11px;color:var(--text-tertiary);margin-bottom:10px;line-height:1.5}
        .resume-drop{border:1.5px dashed rgba(255,255,255,0.09);border-radius:11px;background:rgba(255,255,255,0.02);padding:14px 10px;text-align:center;cursor:pointer;transition:all 0.2s ease;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:500;color:rgba(255,255,255,0.22);line-height:1.7;font-family:var(--font-primary)}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.04)}
        .filter-label{font-size:var(--text-xs);font-weight:500;color:var(--text-tertiary);font-family:var(--font-primary);margin-bottom:6px}
        .filter-select{width:100%;height:36px;padding:0 var(--space-3);background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-primary);font-size:var(--text-sm);cursor:pointer;outline:none;margin-bottom:7px;transition:border-color var(--dur-base) var(--ease-out)}
        .filter-select:hover{border-color:var(--border-normal)}
        .filter-select:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--gold-subtle)}
        .resume-drop:hover,.resume-drop.dragging{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.04)}
        .dark-input{width:100%;background:rgba(13,18,32,0.8);border:1px solid rgba(93,104,130,0.15);border-radius:8px;padding:8px 12px;font-size:12px;font-family:var(--font-primary);color:rgba(255,255,255,0.8);outline:none;transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1);margin-bottom:6px}
        .dark-input::placeholder{color:rgba(255,255,255,0.18)}
        .dark-input:focus{border-color:rgba(245,158,11,0.5);box-shadow:0 0 0 3px rgba(245,158,11,0.08),inset 0 0 0 1px rgba(245,158,11,0.1)}
        .gradient-btn{width:100%;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;border:none;border-radius:8px;padding:10px;font-size:12px;font-weight:600;font-family:var(--font-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 2px 12px rgba(245,158,11,0.15)}
        .gradient-btn:hover{opacity:0.88;box-shadow:0 6px 20px rgba(245,158,11,0.28),0 0 12px rgba(245,158,11,0.12);transform:translateY(-1px)}
        .gradient-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none}
        .ghost-btn{font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);background:none;border:1px solid rgba(93,104,130,0.15);border-radius:8px;padding:8px 12px;cursor:pointer;font-family:var(--font-primary);transition:all 0.24s ease}
        .ghost-btn:hover{color:rgba(255,255,255,0.65);border-color:rgba(93,104,130,0.3);background:rgba(93,104,130,0.04);box-shadow:0 0 8px rgba(245,158,11,0.04)}
        .send-jobs-btn{width:100%;background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.20);border-radius:9px;padding:9px;font-size:11px;font-weight:600;color:#f59e0b;cursor:pointer;font-family:var(--font-primary);transition:all 0.26s cubic-bezier(0.34,1.56,0.64,1)}
        .send-jobs-btn:hover{background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.35);box-shadow:0 0 12px rgba(245,158,11,0.10)}
        .gmail-input{width:100%;height:40px;padding:0 var(--space-4);background:var(--bg-input);border:1px solid var(--border-normal);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-primary);font-size:var(--text-sm);transition:border-color var(--dur-base) var(--ease-out)}
        .gmail-input:focus{outline:none;border-color:var(--border-focus);box-shadow:0 0 0 3px var(--gold-subtle)}
        .gmail-input::placeholder{color:var(--text-tertiary)}
        .gmail-btn{width:100%;height:40px;background:var(--gold);color:#1a1a1f;border:none;border-radius:var(--radius-md);font-family:var(--font-primary);font-size:var(--text-sm);font-weight:600;cursor:pointer;transition:background var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out);margin-top:var(--space-3)}
        .gmail-btn:hover{background:var(--gold-hover);box-shadow:var(--shadow-glow-gold)}
        .gmail-btn:disabled{opacity:0.35;cursor:not-allowed}
        .edit-prefs-btn{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:8px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);cursor:pointer;font-family:var(--font-primary);transition:all 0.24s ease}
        .edit-prefs-btn:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14);box-shadow:0 0 8px rgba(245,158,11,0.04)}
        .toggle-row{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.35);margin-top:10px}
        .toggle{width:36px;height:20px;background:rgba(93,104,130,0.15);border-radius:10px;position:relative;cursor:pointer;transition:background .2s;border:none;outline:none;flex-shrink:0}
        .toggle.on{background:linear-gradient(135deg,#f59e0b,#fbbf24)}
        .toggle::after{content:'';position:absolute;width:14px;height:14px;background:#fff;border-radius:50%;top:3px;left:3px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.4)}
        .toggle.on::after{left:19px}

        /* TABS — pill style */
        .tabs-row{display:flex;align-items:center;gap:var(--space-6);border-bottom:1px solid var(--border-subtle);padding-bottom:var(--space-3);margin-bottom:0;flex-shrink:0}
        .tab{position:relative;background:transparent;border:none;padding:var(--space-2) 0;font-family:var(--font-primary);font-size:var(--text-sm);font-weight:500;color:var(--text-tertiary);cursor:pointer;display:flex;align-items:center;gap:var(--space-2);transition:color var(--dur-base) var(--ease-out);white-space:nowrap}
        .tab:hover{color:var(--text-secondary)}
        .tab.active{color:var(--text-primary);font-weight:600}
        .tab.active::after{content:'';position:absolute;bottom:-13px;left:0;right:0;height:2px;background:var(--gold);border-radius:var(--radius-full);animation:scaleIn var(--dur-slow) var(--ease-out)}
        .tab-count{background:var(--bg-hover);color:var(--text-tertiary);font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full);border:1px solid var(--border-subtle)}
        .tab.active .tab-count{background:var(--gold-subtle);color:var(--gold);border-color:rgba(245,158,11,0.25)}
        .results-count{font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-secondary)}
        .results-count strong{color:var(--text-primary);font-weight:600}
        .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-16) var(--space-8);gap:var(--space-5);text-align:center}
        .empty-icon{width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:var(--gold-subtle);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius-xl);font-size:32px;color:var(--gold);box-shadow:var(--shadow-glow-gold)}
        .empty-title{font-family:var(--font-display);font-size:var(--text-xl);font-weight:600;color:var(--text-primary);letter-spacing:-0.5px}
        .empty-sub{font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-secondary);max-width:420px;line-height:1.6}
        .empty-chips{display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:center;margin-top:var(--space-4)}
        .empty-chip{padding:var(--space-2) var(--space-4);background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-full);font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-secondary);cursor:pointer;transition:all var(--dur-base) var(--ease-out)}
        .empty-chip:hover{color:var(--text-primary);border-color:var(--gold);background:var(--gold-subtle);transform:translateY(-1px)}

        /* JOB GRID — 2-col */
        .jobs-list{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;padding:14px 16px!important}
        @media(max-width:900px){.jobs-list{grid-template-columns:1fr!important}}
        .job-card{background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:var(--space-5);transition:border-color var(--dur-slow) var(--ease-out),transform var(--dur-slow) var(--ease-out),box-shadow var(--dur-slow) var(--ease-out);display:flex;flex-direction:column;gap:var(--space-4)}
        .job-card:hover{border-color:var(--border-normal);transform:translateY(-2px);box-shadow:var(--shadow-md),var(--shadow-glow-gold)}
        .job-card-hot{border-color:rgba(251,191,36,0.25)!important}
        .job-card-accent{position:absolute;top:0;left:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--gold),#9a74df);border-radius:16px 0 0 16px;opacity:0;transition:opacity 0.2s ease;pointer-events:none}
        .job-card:hover .job-card-accent{opacity:1}
        .job-card-hot:hover{box-shadow:0 12px 32px rgba(251,191,36,0.10),inset 0 1px 0 rgba(255,255,255,0.08),0 0 24px rgba(251,191,36,0.10)!important}

        /* JOB CARD COMPONENTS */
        .job-header{display:flex;align-items:flex-start;gap:var(--space-3)}
        .job-logo{width:44px;height:44px;flex-shrink:0;border-radius:var(--radius-md);background:linear-gradient(135deg,var(--gold) 0%,#c97a0a 100%);color:#1a1a1f;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:var(--text-md);font-weight:700}
        .job-title{font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--text-primary);letter-spacing:-0.2px;line-height:1.3}
        .job-meta{font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-secondary);line-height:1.4;margin-top:var(--space-1)}
        .job-time{font-family:var(--font-primary);font-size:var(--text-xs);color:var(--text-tertiary);flex-shrink:0}
        .job-badges{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
        .badge-hot{background:var(--danger-subtle);color:var(--danger);border:1px solid rgba(239,68,68,0.25)}
        .badge-early{background:var(--gold-subtle);color:var(--gold);border:1px solid rgba(245,158,11,0.25)}
        .badge-h1b{background:var(--cyan-subtle);color:var(--cyan);border:1px solid rgba(6,182,212,0.25)}
        .badge-applicants{background:var(--bg-hover);color:var(--text-tertiary);border:1px solid var(--border-subtle)}
        .job-description{font-family:var(--font-primary);font-size:var(--text-sm);color:var(--text-secondary);line-height:1.55;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .action-row{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-2)}
        .action-btn{height:36px;background:transparent;border:1px solid var(--border-subtle);border-radius:var(--radius-md);color:var(--text-secondary);font-family:var(--font-primary);font-size:var(--text-xs);font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:var(--space-1);transition:all var(--dur-base) var(--ease-out)}
        .action-btn:hover{color:var(--text-primary);border-color:var(--border-normal);background:var(--bg-hover)}
        .action-btn.ai:hover{color:var(--cyan);border-color:var(--cyan-subtle);box-shadow:0 0 12px var(--cyan-subtle)}
        .match-preview{background:var(--cyan-subtle);border:1px solid rgba(6,182,212,0.25);border-radius:var(--radius-md);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)}

        /* ACTION BUTTONS */
        .action-card-btn{flex:1;min-width:fit-content;border-radius:7px;padding:6px 11px;font-size:11px;font-weight:600;font-family:var(--font-primary);letter-spacing:0.1px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.55);transition:all 0.26s cubic-bezier(0.34,1.56,0.64,1);white-space:nowrap}
        .action-card-btn:hover{background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.28);color:#fbbf24;box-shadow:0 0 12px rgba(245,158,11,0.08)}
        .action-card-btn.match-btn{background:rgba(255,255,255,0.03);border-color:rgba(93,104,130,0.12);color:rgba(255,255,255,0.38);transition:all 0.24s ease}
        .action-card-btn.match-btn:hover{box-shadow:0 0 0 rgba(0,0,0,0)}
        .action-card-btn.match-btn.done{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.22);color:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,0.08)}
        .action-card-btn.interview-btn.done{background:rgba(52,211,153,0.07);border-color:rgba(52,211,153,0.18);color:#34d399;box-shadow:0 0 8px rgba(52,211,153,0.07)}
        .action-card-btn.skillgap-btn.done{background:rgba(139,92,246,0.07);border-color:rgba(139,92,246,0.22);color:#a78bfa;box-shadow:0 0 8px rgba(139,92,246,0.06)}
        .action-card-btn.cover-btn.done{background:rgba(236,72,153,0.07);border-color:rgba(236,72,153,0.18);color:#f472b6;box-shadow:0 0 8px rgba(236,72,153,0.06)}
        .action-card-btn.tailor-btn.done{background:rgba(251,191,36,0.07);border-color:rgba(251,191,36,0.18);color:#fbbf24;box-shadow:0 0 8px rgba(251,191,36,0.06)}
        .action-card-btn.track-btn{flex:0;padding:7px 12px;transition:all 0.24s ease}
        .action-card-btn.track-btn.tracked{background:rgba(52,211,153,0.07);border-color:rgba(52,211,153,0.18);color:#34d399;box-shadow:0 0 8px rgba(52,211,153,0.07)}
        .action-card-btn:disabled{opacity:0.3;cursor:not-allowed}

        /* BADGES */
        .badge{height:22px;padding:0 var(--space-2);border-radius:var(--radius-sm);font-family:var(--font-primary);font-size:var(--text-xs);font-weight:600;display:inline-flex;align-items:center;gap:4px;letter-spacing:0.2px}
        .badge-type{background:rgba(245,158,11,0.1);color:#fbbf24;border:1px solid rgba(245,158,11,0.2)}
        .badge-remote{background:rgba(52,211,153,0.08);color:#34d399;border:1px solid rgba(52,211,153,0.15)}
        .badge-salary{background:rgba(52,211,153,0.06);color:#34d399;border:1px solid rgba(52,211,153,0.12)}
        .badge-time{background:var(--gold-subtle);color:var(--gold);border:1px solid rgba(245,158,11,0.25)}

        /* APPLY */
        .apply-btn{width:100%;height:44px;background:var(--gold)!important;color:#1a1a1f!important;border:none!important;border-radius:var(--radius-md)!important;font-family:var(--font-primary);font-size:var(--text-sm);font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:var(--space-2);transition:background var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out),transform var(--dur-fast) var(--ease-spring)!important;animation:none!important;background-size:auto!important;letter-spacing:-0.1px;text-decoration:none}
        .apply-btn:hover{background:var(--gold-hover)!important;box-shadow:var(--shadow-glow-gold)!important;transform:none!important}
        .apply-btn:active{transform:scale(0.98)!important}
        .apply-btn-hot{background:linear-gradient(135deg,#ef4444,#fbbf24)!important}
        .apply-btn-hot:hover{box-shadow:0 8px 32px rgba(251,115,22,0.35),0 0 20px rgba(251,115,22,0.12)!important}

        /* EB BANNER */
        .eb-banner{background:rgba(251,191,36,0.02);border:1px solid rgba(251,191,36,0.08);border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}

        /* PAGINATION */
        .pagination{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:32px}
        .page-btn{width:34px;height:34px;border-radius:8px;border:1px solid rgba(93,104,130,0.12);background:rgba(13,18,32,0.6);font-size:12px;font-weight:500;font-family:var(--font-primary);cursor:pointer;color:rgba(255,255,255,0.3);transition:all 0.26s cubic-bezier(0.34,1.56,0.64,1)}
        .page-btn:hover:not(:disabled){background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.65);box-shadow:0 0 8px rgba(245,158,11,0.06)}
        .page-btn.active{background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.28);color:#f59e0b;font-weight:700;box-shadow:0 0 12px rgba(245,158,11,0.08)}
        .page-btn:disabled{opacity:.18;cursor:not-allowed}

        /* SKELETON */
        .skel{background:rgba(93,104,130,0.1);border-radius:8px;position:relative;overflow:hidden}
        .skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent);animation:shimmer 1.8s infinite}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes skeletonShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes ebPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.2;transform:scale(0.6)}}
        @keyframes cardGlow{0%,100%{box-shadow:0 2px 8px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05)}50%{box-shadow:0 2px 8px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05),0 0 20px rgba(245,158,11,0.08)}}
        @keyframes cardPulse{0%,100%{border-color:rgba(255,255,255,0.08)}50%{border-color:rgba(245,158,11,0.15)}}
        @keyframes hotGlow{0%,100%{box-shadow:0 2px 6px rgba(249,115,22,0.2)}50%{box-shadow:0 2px 14px rgba(249,115,22,0.5)}}
        @keyframes buttonShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes btnShimmer{0%{background-position:0% center}100%{background-position:200% center}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.0)}50%{box-shadow:0 0 0 4px rgba(245,158,11,0.08)}}

        /* SPINNERS */
        .spin{width:16px;height:16px;border:2px solid rgba(245,158,11,0.15);border-top-color:#f59e0b;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        .spin-sm{width:11px;height:11px;border:2px solid rgba(255,255,255,0.08);border-top-color:#f59e0b;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes simBounce{0%,80%,100%{transform:translateY(0);opacity:0.25}40%{transform:translateY(-5px);opacity:0.8}}

        /* MODALS */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(16px);animation:fi .18s}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .modal{background:#0a0a10;border:1px solid rgba(255,255,255,0.08);border-radius:20px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;padding:32px;position:relative;animation:scaleInSoft var(--dur-slow) var(--ease-out) both;scrollbar-width:thin}
        @keyframes su{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:50%;width:30px;height:30px;font-size:12px;cursor:pointer;color:rgba(255,255,255,0.35);transition:all .2s;display:flex;align-items:center;justify-content:center}
        .modal-close:hover{background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.2)}
        .modal-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .modal-logo{width:52px;height:52px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);flex-shrink:0}
        .modal-logo img{width:100%;height:100%;object-fit:contain}
        .modal-title{font-family:var(--font-display);font-size:20px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:4px}
        .modal-sub{font-size:13px;color:#f59e0b;font-weight:500}
        .modal-tabs{display:flex;gap:3px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;margin-bottom:18px}
        .mtab{flex:1;padding:8px;border:none;border-radius:7px;font-size:11px;font-weight:600;font-family:var(--font-primary);cursor:pointer;background:transparent;color:rgba(255,255,255,0.3);transition:all .2s}
        .mtab.active{background:rgba(245,158,11,0.12);color:#fbbf24}
        .btn-tracked{background:rgba(52,211,153,0.07)!important;border-color:rgba(52,211,153,0.18)!important;color:#34d399!important}

        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}

        /* THEME TOGGLE */
        .theme-toggle{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);cursor:pointer;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);transition:all 0.26s cubic-bezier(0.34,1.56,0.64,1);flex-shrink:0}
        .theme-toggle:hover{background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.25);color:#f59e0b;box-shadow:0 0 12px rgba(245,158,11,0.08)}

        /* LIGHT MODE */
        [data-theme="light"] body{background:#f4f5f9;color:#0f0f14}
        [data-theme="light"] .topbar{background:rgba(255,255,255,0.95);border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .topbar-logo{color:#0f0f14}
        [data-theme="light"] .topbar-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.09);color:#0f0f14}
        [data-theme="light"] .topbar-input::placeholder{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .topbar-input:focus{background:rgba(245,158,11,0.05);border-color:rgba(245,158,11,0.35)}
        [data-theme="light"] .refresh-btn{color:rgba(0,0,0,0.4)}
        [data-theme="light"] .refresh-btn:hover{color:rgba(0,0,0,0.7)}
        [data-theme="light"] .theme-toggle{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.09);color:rgba(0,0,0,0.45)}
        [data-theme="light"] .theme-toggle:hover{background:rgba(245,158,11,0.08);color:#f59e0b}
        [data-theme="light"] .logout-btn{color:rgba(0,0,0,0.35);border-color:rgba(0,0,0,0.09)}
        [data-theme="light"] .nav-pill.pill-eb{background:rgba(251,191,36,0.12)}
        [data-theme="light"] .nav-pill.pill-tracker{background:rgba(245,158,11,0.1)}
        [data-theme="light"] .dark-input{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.09);color:#0f0f14}
        [data-theme="light"] .dark-input::placeholder{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .toggle-row{color:rgba(0,0,0,0.45)}
        [data-theme="light"] .ghost-btn{color:rgba(0,0,0,0.45);border-color:rgba(0,0,0,0.1)}
        [data-theme="light"] .ghost-btn:hover{color:rgba(0,0,0,0.75);border-color:rgba(0,0,0,0.2)}
        [data-theme="light"] .job-card-hot{border-color:rgba(251,191,36,0.25)!important}
        [data-theme="light"] .action-card-btn{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.08);color:rgba(0,0,0,0.45)}
        [data-theme="light"] .action-card-btn:hover{background:rgba(245,158,11,0.07);border-color:rgba(245,158,11,0.22);color:#f59e0b}
        [data-theme="light"] .action-card-btn.match-btn.done{background:rgba(245,158,11,0.07);border-color:rgba(245,158,11,0.2);color:#f59e0b}
        [data-theme="light"] .action-card-btn.interview-btn.done{background:rgba(52,211,153,0.07);border-color:rgba(52,211,153,0.2);color:#059669}
        [data-theme="light"] .action-card-btn.tailor-btn.done{background:rgba(251,191,36,0.07);border-color:rgba(251,191,36,0.2);color:#d97706}
        [data-theme="light"] .action-card-btn.track-btn.tracked{background:rgba(52,211,153,0.07);border-color:rgba(52,211,153,0.2);color:#059669}
        [data-theme="light"] .page-btn{background:#fff;border-color:rgba(0,0,0,0.08);color:rgba(0,0,0,0.4)}
        [data-theme="light"] .page-btn:hover:not(:disabled){background:rgba(245,158,11,0.05);color:#f59e0b}
        [data-theme="light"] .skel{background:linear-gradient(90deg,rgba(0,0,0,0.04) 25%,rgba(0,0,0,0.07) 50%,rgba(0,0,0,0.04) 75%);background-size:200% 100%}
        [data-theme="light"] .modal{background:#fff;border-color:rgba(0,0,0,0.08)}
        [data-theme="light"] .modal-close{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.08);color:rgba(0,0,0,0.35)}
        [data-theme="light"] .modal-head{border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .modal-title{color:#0f0f14}
        [data-theme="light"] .modal-tabs{background:rgba(0,0,0,0.04)}
        [data-theme="light"] .mtab{color:rgba(0,0,0,0.3)}
        [data-theme="light"] .mtab.active{background:rgba(245,158,11,0.1);color:#f59e0b}
        [data-theme="light"] .overlay{background:rgba(0,0,0,0.4);backdrop-filter:blur(12px)}
        [data-theme="light"] .refresh-toast{background:rgba(255,255,255,0.97);border-color:rgba(52,211,153,0.4)}
        [data-theme="light"] .eb-banner{background:rgba(251,191,36,0.04);border-color:rgba(251,191,36,0.15)}
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
          .jobs-list{gap:6px}

          .tabs-row{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;gap:0;flex-wrap:nowrap}
          .tabs-row::-webkit-scrollbar{display:none}
          .tab{padding:10px 14px;font-size:12px;flex-shrink:0}

          .search-btn,.eb-btn{min-height:44px;height:44px;padding:0 14px}
          .action-card-btn{padding:8px 6px;min-height:40px;font-size:10px}
          .action-btns{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:5px}
          .action-btns .action-card-btn{flex:none!important;width:100%!important;min-width:0!important;justify-content:center;overflow:hidden}
          .action-btns .action-card-btn.track-btn{flex:none!important;padding:8px 6px;width:100%!important;min-width:0!important}
          .page-btn{width:38px;height:38px;font-size:13px}
          .apply-btn{padding:13px;min-height:44px;font-size:13px}

          .overlay{padding:0;align-items:flex-end;padding-top:60px}
          .modal{max-width:100%;border-radius:20px 20px 0 0;padding:24px 18px;max-height:90vh}
          .modal-close{top:12px;right:12px}

          .mobile-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:350;display:flex;flex-direction:column;justify-content:flex-end;backdrop-filter:blur(4px)}
          .mobile-sidebar-sheet{background:#0d0d14;border-radius:20px 20px 0 0;padding:16px;max-height:80vh;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.08)}
          .mob-filters-btn{display:flex!important}
          .mob-filters-row{display:flex!important}
        }
        .mob-search-btn,.mob-sidebar-btn,.mob-signout-btn,.mob-eb-btn,.mob-filters-btn,.mob-filters-row{display:none}
        @media(min-width:769px){.mobile-search-panel{display:none!important}}
        [data-theme="light"] .mobile-search-panel{background:rgba(255,255,255,0.98);border-bottom-color:rgba(0,0,0,0.07)}
        [data-theme="light"] .mobile-sidebar-sheet{background:#fff;border-top-color:rgba(0,0,0,0.08)}
      `}</style>

      {/* AMBIENT GLOW */}
      <div style={{position:'fixed',top:'10%',right:'5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.04) 0%,transparent 70%)',pointerEvents:'none',zIndex:0,animation:'ambientFloat 9s ease-in-out infinite'}}/>
      <div style={{position:'fixed',bottom:'15%',left:'20%',width:380,height:380,borderRadius:'50%',background:'radial-gradient(circle,rgba(142,178,155,0.025) 0%,transparent 70%)',pointerEvents:'none',zIndex:0,animation:'ambientFloat 12s ease-in-out infinite reverse'}}/>

      {/* TOPBAR */}
      <motion.nav
        className="topbar"
        initial={{opacity:0,y:-8}}
        animate={{opacity:1,y:0}}
        transition={{duration:0.4,ease:'easeOut'}}
      >
        <div style={{display:'flex',alignItems:'center',gap:8,marginRight:14,flexShrink:0,cursor:'pointer'}} onClick={()=>window.location.href='/'}>
          <div style={{width:30,height:30,background:'linear-gradient(135deg,var(--gold),var(--gold-hover))',borderRadius:9,border:'1px solid rgba(139,92,246,0.4)',boxShadow:'0 0 16px rgba(245,158,11,0.35)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="16" height="16" viewBox="0 0 200 200">
              <path d="M100,76 L34,118 L66,113 Z" fill="#fbbf24"/>
              <path d="M100,76 L166,118 L134,113 Z" fill="#c4b5fd"/>
              <ellipse cx="100" cy="92" rx="8" ry="16" fill="#f59e0b"/>
              <circle cx="100" cy="76" r="7" fill="#f59e0b"/>
              <polygon points="100,66 107,62 100,61" fill="#fcd34d"/>
              <line x1="96" y1="108" x2="88" y2="126" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              <line x1="100" y1="109" x2="100" y2="128" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round"/>
              <line x1="104" y1="108" x2="112" y2="126" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round"/>
              <path d="M82,144 A18,18 0 0,1 118,144" fill="#f59e0b" opacity="0.6"/>
            </svg>
          </div>
          <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:800,color:'#ffffff',letterSpacing:'-0.5px',lineHeight:1}}>Vega<span style={{fontStyle:'italic',background:'linear-gradient(135deg,#f59e0b,#ec4899)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>ply</span></span>
        </div>
        <div className="topbar-search">
          <div className="topbar-search-box">
            <input className="topbar-input" type="text" placeholder="Job role (e.g. Data Analyst)" value={jobRole} onChange={e=>setJobRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
            <div className="topbar-sep"/>
            <input className="topbar-input-loc" type="text" placeholder="Location" value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/>
          </div>
          <motion.button className="search-btn" whileHover={{scale:1.04,filter:'brightness(1.12)'}} whileTap={{scale:0.97}} onClick={handleSearch} disabled={loading}>{loading?"Searching…":"Search"}</motion.button>
          <motion.button className={`eb-btn${activeMode==='earlybird'?' active':''}`} whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>{const newMode=activeMode==='earlybird'?'all':'earlybird';setActiveMode(newMode);if(newMode!=='all')setActiveTab('results');}}>{ebLoading?"Scanning…":"⚡ Early Bird"}</motion.button>
          <motion.button className={`h1b-btn${activeMode==='h1b'?' active':''}`} whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>{const newMode=activeMode==='h1b'?'all':'h1b';setActiveMode(newMode);if(newMode!=='all')setActiveTab('results');}}>🌐 H1B</motion.button>
          {hasSearched&&<button className={`refresh-btn${isRefreshing?" spinning":""}`} onClick={handleRefresh} disabled={isRefreshing} title="Refresh jobs">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {isRefreshing?"Refreshing…":"Refresh"}
          </button>}
        </div>
        <div className="topbar-right">
          {/* Mobile: search toggle */}
          <button className="mob-search-btn theme-toggle" onClick={()=>setShowMobileSearch(s=>!s)} style={{color:showMobileSearch?"#f59e0b":"inherit"}} title="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          {/* Mobile: early bird quick-access */}
          <button className="mob-eb-btn" onClick={handleEarlyBirdSearch} disabled={ebLoading} style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:8,padding:"6px 10px",fontSize:13,cursor:"pointer",color:"#fbbf24",alignItems:"center",gap:4,minHeight:36}}>⚡</button>
          {mounted&&earlyBirdJobs.length>0&&<span className="nav-pill pill-eb">⚡ {earlyBirdJobs.length} Early</span>}
          {mounted&&trackedApps.length>0&&<span className="nav-pill pill-tracker">{trackedApps.length} Tracked</span>}
          {mounted&&autoApplyCount>0&&<span className="nav-pill" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.25)"}}>{autoApplyCount}/30 Applied</span>}
          {mounted&&prefTitles.length>0&&<span className="nav-pill" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.25)",cursor:"pointer",display:"flex",alignItems:"center",gap:5}} onClick={()=>setShowPreferences(true)}><span style={{width:6,height:6,borderRadius:"50%",background:"#f59e0b",display:"inline-block",flexShrink:0}}/>Prefs active</span>}
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
      </motion.nav>

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

      <motion.div className="app-layout" initial={{opacity:0,y:8,scale:0.99}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}}>
        {/* SIDEBAR */}
        <motion.aside className="sidebar" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{duration:0.4,delay:0.1,ease:'easeOut'}}>
          <div className="sidebar-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <div className="sidebar-card-title">🎯 AI Resume Match</div>
              <button onClick={loadResumeHistory} style={{fontSize:10,color:"#f59e0b",background:"none",border:"1px solid rgba(245,158,11,0.2)",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"}}>History</button>
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
            {autoApplyCount>0&&<div style={{fontSize:11,color:"#f59e0b",textAlign:"center",marginTop:7,fontWeight:600}}>{autoApplyCount}/30 auto-applied today</div>}
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

          {/* PREFERENCES */}
          <div className="sidebar-card" style={{marginTop:4}}>
            <div className="sidebar-card-title">⚙️ Job Preferences</div>
            <div className="sidebar-card-sub">Active filters for your job search</div>
            {mounted&&prefTitles.length>0?(
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                {prefTitles.map((t,i)=>(
                  <span key={i} style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"rgba(245,158,11,0.12)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.25)"}}>{t}</span>
                ))}
              </div>
            ):(
              <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginBottom:10}}>No preferences set</div>
            )}
            <button onClick={()=>setShowPreferences(true)} style={{width:"100%",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"8px 0",fontSize:12,fontWeight:600,color:"#f59e0b",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(245,158,11,0.15)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(245,158,11,0.08)")}>
              ⚙️ Edit Preferences
            </button>
          </div>

          {/* SHARE VEGAPLY */}
          <div className="sidebar-card" style={{marginTop:4,background:"rgba(245,158,11,0.05)",borderColor:"rgba(245,158,11,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <div className="sidebar-card-title" style={{margin:0,color:"#fbbf24"}}>Know someone job hunting?</div>
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
              style={{width:"100%",background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:10,padding:"8px 0",fontSize:12,fontWeight:600,color:"#f59e0b",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(245,158,11,0.2)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(245,158,11,0.12)")}
            >
              {shareToast?"✓ Link copied!":"Share Vegaply →"}
            </button>
          </div>
        </motion.aside>

        {/* MAIN */}
        <main className="content">
          {/* Mobile filters row — hidden on desktop via CSS, shown on mobile */}
          <div className="mob-filters-row" style={{display:"none",gap:8,marginBottom:14,alignItems:"center"}}>
            <button className="mob-filters-btn" onClick={()=>setShowMobileSidebar(true)} style={{background:darkMode?"rgba(245,158,11,0.1)":"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,color:"#f59e0b",cursor:"pointer",fontFamily:"inherit",alignItems:"center",gap:6,minHeight:36}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              Filters{(filterType!=="ALL"||filterDate!=="ANY"||filterRemote)?" ●":""}
            </button>
            {jobRole&&location&&<span className="mob-filters-btn" style={{fontSize:11,color:darkMode?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.4)",background:"none",border:"none",padding:0,minHeight:"auto"}}>{jobRole} · {location}</span>}
          </div>

          <div className="tabs-row">
            <button className={`tab${activeTab==="results"?" active":""}`} onClick={()=>{setActiveTab("results");setCurrentPage(1);}}>
              Results {modeFilteredJobs.length>0&&<span style={{background:'rgba(245,158,11,0.18)',color:'#f59e0b',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:999,marginLeft:6}}>{filterJobs(modeFilteredJobs).length}</span>}
              {activeTab==="results"&&<motion.div layoutId="tab-underline" style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#f59e0b,#fbbf24)',borderRadius:'2px 2px 0 0'}} transition={{type:'spring',stiffness:400,damping:30}}/>}
            </button>
            <button className={`tab tab-eb${activeTab==="earlybird"?" active":""}`} onClick={()=>{setActiveTab("earlybird");setCurrentPage(1);}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px rgba(52,211,153,0.8)",display:"inline-block",animation:"ebPulse 2s ease-in-out infinite",flexShrink:0}}/>
                ⚡ Early Bird
              </span>
              {earlyBirdJobs.length>0&&<span style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,marginLeft:6,border:'1px solid rgba(251,191,36,0.35)'}}>{earlyBirdJobs.length}</span>}
              {activeTab==="earlybird"&&<motion.div layoutId="tab-underline" style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#fbbf24,#f97316)',borderRadius:'2px 2px 0 0'}} transition={{type:'spring',stiffness:400,damping:30}}/>}
            </button>
            <button className={`tab${activeTab==="saved"?" active":""}`} onClick={()=>{setActiveTab("saved");setCurrentPage(1);}}>
              Saved {savedJobs.size>0&&<span style={{background:'rgba(245,158,11,0.18)',color:'#f59e0b',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:999,marginLeft:6}}>{savedJobs.size}</span>}
              {activeTab==="saved"&&<motion.div layoutId="tab-underline" style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#f59e0b,#fbbf24)',borderRadius:'2px 2px 0 0'}} transition={{type:'spring',stiffness:400,damping:30}}/>}
            </button>
            <button className={`tab tab-tracker${activeTab==="tracker"?" active":""}`} onClick={()=>setActiveTab("tracker")}>
              Tracker {trackedApps.length>0&&<span style={{background:'rgba(245,158,11,0.18)',color:'#f59e0b',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:999,marginLeft:6}}>{trackedApps.length}</span>}
              {activeTab==="tracker"&&<motion.div layoutId="tab-underline" style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#f59e0b,#f59e0b)',borderRadius:'2px 2px 0 0'}} transition={{type:'spring',stiffness:400,damping:30}}/>}
            </button>
            <button className={`tab tab-analytics${activeTab==="analytics"?" active":""}`} onClick={()=>setActiveTab("analytics")}>
              Analytics
              {activeTab==="analytics"&&<motion.div layoutId="tab-underline" style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#34d399,#10b981)',borderRadius:'2px 2px 0 0'}} transition={{type:'spring',stiffness:400,damping:30}}/>}
            </button>
          </div>

          <motion.div key={activeTab} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:0.3,ease:[0.16,1,0.3,1]}}>
          {activeTab==="tracker"&&<TrackerView lm={!darkMode} apps={trackedApps}
            onUpdateStatus={(id,s)=>setTrackedApps(prev=>{const next=prev.map(a=>a.id===id?{...a,status:s}:a);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
            onUpdateNotes={(id,n)=>setTrackedApps(prev=>{const next=prev.map(a=>a.id===id?{...a,notes:n}:a);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
            onRemove={id=>setTrackedApps(prev=>{const next=prev.filter(a=>a.id!==id);localStorage.setItem("applysmart_tracker",JSON.stringify(next));return next;})}
          />}
          {activeTab==="analytics"&&<AnalyticsView lm={!darkMode} apps={trackedApps} savedCount={savedJobs.size} totalSearched={totalSearched}/>}

          {(activeTab==="results"||activeTab==="earlybird"||activeTab==="saved")&&(
            <>
              {activeTab==="results"&&activeMode==='h1b'&&hasSearched&&(
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{background:'linear-gradient(135deg,rgba(52,211,153,0.06),rgba(16,185,129,0.04))',border:'1px solid rgba(52,211,153,0.12)',borderRadius:12,padding:'10px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#34d399'}}>
                  🌐 Showing only verified H1B sponsoring companies · <strong style={{color:'#34d399'}}>{modeFilteredJobs.length} jobs found</strong>
                </motion.div>
              )}
              {activeTab==="results"&&activeMode==='earlybird'&&hasSearched&&(
                <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{background:'linear-gradient(135deg,rgba(251,191,36,0.06),rgba(249,115,22,0.04))',border:'1px solid rgba(251,191,36,0.12)',borderRadius:12,padding:'10px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#fbbf24'}}>
                  ⚡ Jobs posted in the last 24 hours · Apply before hundreds of others · <strong>{modeFilteredJobs.length} fresh jobs</strong>
                </motion.div>
              )}
              {activeTab==="earlybird"&&earlyBirdJobs.length>0&&!ebLoading&&(
                <>
                  <div style={{background:'linear-gradient(135deg,rgba(251,191,36,0.08),rgba(249,115,22,0.06))',border:'1px solid rgba(251,191,36,0.15)',borderRadius:12,padding:'10px 20px',margin:'0 0 12px 0',display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#fbbf24'}}>
                    <span style={{fontSize:16}}>⚡</span>
                    <span>You&apos;re seeing jobs posted in the last 24 hours — <strong>apply now before hundreds of others do</strong></span>
                  </div>
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
                </>
              )}

              {autoOpenDone&&<div style={{background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:12,fontWeight:600,color:"#10b981",display:"flex",alignItems:"center",gap:8}}>🚀 Opened top 3 matches in new tabs!</div>}

              {currentLoading&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px',padding:'14px 16px'}}>
                  {[...Array(5)].map((_,i)=><SkeletonRow key={i}/>)}
                </div>
              )}

              {!currentLoading&&paginatedJobs.length>0&&(
                <>
                  <div style={{fontSize:11,color:darkMode?"rgba(255,255,255,0.22)":"rgba(0,0,0,0.4)",marginBottom:14}}>
                    Showing <strong style={{color:darkMode?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.65)"}}>{(currentPage-1)*JOBS_PER_PAGE+1}–{Math.min(currentPage*JOBS_PER_PAGE,displayJobs.length)}</strong> of <strong style={{color:darkMode?"rgba(255,255,255,0.45)":"rgba(0,0,0,0.65)"}}>{displayJobs.length}</strong> jobs
                    {isEbMode&&<span style={{color:"#f59e0b",fontWeight:600}}> · ⚡ All posted today</span>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px',padding:'14px 16px'}}>
                    <AnimatePresence mode="popLayout">
                    {paginatedJobs.map((job,idx)=>(
                      <JobCard
                        key={`${job.job_id}-${idx}`}
                        index={idx}
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
                        onAutoApply={()=>handleAutoApply(job)}
                        autoApplyResult={autoApplyResults[job.job_id]??null}
                        autoApplyScore={autoApplyScores[job.job_id]}
                        isAutoApplying={autoApplying===job.job_id}
                        lm={!darkMode}
                        quickMatches={quickMatches}
                        handleQuickMatch={handleQuickMatch}
                        resumeText={resumeText}
                      />
                    ))}
                    </AnimatePresence>
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
                activeTab==="results"&&activeMode==='h1b'&&hasSearched?(
                  <div style={{textAlign:'center',padding:'60px 20px'}}>
                    <div style={{fontSize:40,marginBottom:16}}>🌐</div>
                    <div style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,0.7)',marginBottom:8}}>No H1B sponsors found for this role</div>
                    <div style={{fontSize:14,color:'rgba(255,255,255,0.35)',marginBottom:20}}>Try &quot;Software Engineer&quot;, &quot;Data Scientist&quot; or &quot;Product Manager&quot; — most H1B sponsors hire for tech roles</div>
                    <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                      {['Software Engineer','Data Scientist','Product Manager'].map(r=>(
                        <button key={r} onClick={()=>{setJobRole(r);setActiveMode('all');}} style={{background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:100,padding:'7px 16px',fontSize:12,color:'#8eb29b',cursor:'pointer',fontFamily:'inherit'}}>{r}</button>
                      ))}
                    </div>
                  </div>
                ):activeTab==="saved"?(
                  <div style={{textAlign:"center",padding:"56px 24px",background:darkMode?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.02)",borderRadius:12,border:`1px dashed ${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}`}}>
                    <div style={{fontSize:36,marginBottom:12}}>🔖</div>
                    <h3 style={{fontSize:16,color:darkMode?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)",marginBottom:6,fontWeight:700}}>No saved jobs</h3>
                    <p style={{fontSize:12,color:darkMode?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.35)"}}>Bookmark jobs to see them here</p>
                  </div>
                ):activeTab==="earlybird"?(
                  <div style={{textAlign:"center",padding:"56px 24px",background:darkMode?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.02)",borderRadius:12,border:`1px dashed ${darkMode?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.08)"}`}}>
                    <div style={{fontSize:36,marginBottom:12}}>⚡</div>
                    <h3 style={{fontSize:16,color:darkMode?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)",marginBottom:6,fontWeight:700}}>No fresh jobs found for this search</h3>
                    <p style={{fontSize:12,color:darkMode?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.35)",marginBottom:16}}>Try a broader search term like &quot;Software Engineer&quot; or &quot;Data Analyst&quot;</p>
                    <button onClick={()=>setActiveTab("results")} style={{background:'rgba(214,178,104,0.11)',border:'1px solid rgba(214,178,104,0.22)',borderRadius:100,padding:'8px 20px',fontSize:12,color:'#d6b268',cursor:'pointer',fontFamily:'inherit'}}>← Back to Results</button>
                  </div>
                ):(
                  <motion.div
                    initial={{opacity:0,scale:0.95}}
                    animate={{opacity:1,scale:1}}
                    transition={{duration:0.5,ease:[0.34,1.56,0.64,1]}}
                    style={{textAlign:'center',padding:'80px 40px'}}
                  >
                    <motion.div
                      animate={{y:[0,-8,0]}}
                      transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}
                      style={{fontSize:52,marginBottom:20,opacity:0.5}}
                    >⚡</motion.div>
                    <div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,0.8)',marginBottom:8,letterSpacing:'-0.5px'}}>Find your next role</div>
                    <div style={{fontSize:14,color:'rgba(255,255,255,0.25)',marginBottom:32,lineHeight:1.7}}>750+ fresh jobs from Google, Stripe, Figma and more.<br/>Updated every 3 minutes.</div>
                    <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',maxWidth:500,margin:'0 auto'}}>
                      {['Software Engineer','Data Scientist','Product Manager','UX Designer','ML Engineer','DevOps Engineer'].map(role=>(
                        <motion.button
                          key={role}
                          onClick={()=>setJobRole(role)}
                          whileHover={{scale:1.05,backgroundColor:'rgba(245,158,11,0.15)',borderColor:'rgba(245,158,11,0.4)'}}
                          whileTap={{scale:0.97}}
                          style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:100,padding:'8px 18px',fontSize:12,color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit'}}
                        >{role}</motion.button>
                      ))}
                    </div>
                  </motion.div>
                )
              )}
            </>
          )}
          </motion.div>
        </main>

        {/* RIGHT PANEL — AI Intelligence */}
        <motion.aside
          className="right-panel"
          initial={{opacity:0,x:16}}
          animate={{opacity:1,x:0}}
          transition={{duration:0.45,delay:0.15,ease:'easeOut'}}
          style={{background:'rgba(22,24,34,0.90)',borderLeft:'1px solid rgba(255,255,255,0.06)',padding:'18px 14px',overflowY:'auto',display:'flex',flexDirection:'column',gap:20}}
        >

          {/* TODAY'S ACTIVITY */}
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'2.2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:10,fontFamily:'var(--font-primary)'}}>Today's Activity</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
              {([
                {label:'Jobs Found',    value:jobs.length,           sub:'Available now', color:'rgba(255,255,255,0.85)'},
                {label:'Early Bird',   value:panelFreshJobs.length,  sub:'⚡ Fresh',       color:'#d6b268'},
                {label:'H1B Jobs',     value:panelH1bJobs.length,    sub:'Verified',      color:'#8eb29b'},
                {label:'Low Comp',     value:panelLowComp.length,    sub:'Apply first',   color:'var(--gold)'},
              ] as {label:string;value:number;sub:string;color:string}[]).map((stat,i)=>(
                <motion.div key={stat.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3+i*0.08}}
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:13,padding:'12px 11px',position:'relative',overflow:'hidden'}}
                >
                  <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)'}}/>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:5,fontFamily:'var(--font-primary)'}}>{stat.label}</div>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:'var(--font-display)',color:stat.color,letterSpacing:'-1px',lineHeight:1}}>
                    <motion.span key={stat.value} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:[0.16,1,0.3,1]}}>{stat.value}</motion.span>
                  </div>
                  <div style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.30)',marginTop:3,fontFamily:'var(--font-primary)'}}>{stat.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI COACHING INSIGHT */}
          <div style={{background:'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(154,116,223,0.05))',border:'1px solid rgba(245,158,11,0.15)',borderRadius:14,padding:'13px 14px'}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(245,158,11,0.6)',marginBottom:8,fontFamily:'var(--font-primary)'}}>AI Career Coach</div>
            <p style={{fontSize:12,fontWeight:400,color:'rgba(255,255,255,0.55)',lineHeight:1.65,margin:0,fontFamily:'var(--font-primary)'}}>{getCoachingInsight()}</p>
          </div>

          {/* APPLICATION TRACKER */}
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'2.2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:10,fontFamily:'var(--font-primary)'}}>Application Tracker</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
              {([
                {label:'Applied',   value:trackedApps.filter(a=>a.status==='Applied').length,     color:'var(--gold)'},
                {label:'Interview', value:trackedApps.filter(a=>a.status==='Interviewing').length, color:'#8eb29b'},
                {label:'Offer',     value:trackedApps.filter(a=>a.status==='Offer').length,       color:'#d6b268'},
                {label:'Rejected',  value:trackedApps.filter(a=>a.status==='Rejected').length,    color:'rgba(239,68,68,0.65)'},
              ] as {label:string;value:number;color:string}[]).map(col=>(
                <div key={col.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'9px 5px',textAlign:'center'}}>
                  <div style={{fontSize:7,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(255,255,255,0.22)',marginBottom:4,fontFamily:'var(--font-primary)'}}>{col.label}</div>
                  <div style={{fontSize:20,fontWeight:800,fontFamily:'var(--font-display)',color:col.color,letterSpacing:'-0.5px'}}>{col.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI MATCH SCORES */}
          {jobs.filter(j=>j.match).length>0&&(
            <div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:'2.2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:10,fontFamily:'var(--font-primary)'}}>Your Match Scores</div>
              {jobs.filter(j=>j.match).sort((a,b)=>(b.match?.matchScore??0)-(a.match?.matchScore??0)).slice(0,4).map((j,i)=>{
                const pct=j.match!.matchScore;
                const barColor=pct>=70?'linear-gradient(90deg,var(--gold),#8eb29b)':pct>=50?'linear-gradient(90deg,#d6b268,#c9922a)':'linear-gradient(90deg,rgba(239,68,68,0.7),rgba(220,38,38,0.7))';
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,0.45)',width:60,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--font-primary)'}}>{j.employer_name?.split(' ')[0]}</div>
                    <div style={{flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:999,overflow:'hidden'}}>
                      <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,ease:'easeOut'}} style={{height:'100%',borderRadius:999,background:barColor}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.35)',width:28,textAlign:'right' as const,fontFamily:'var(--font-primary)'}}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOP COMPANIES HIRING */}
          {topCompaniesList.length>0&&(
            <div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:'2.2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:10,fontFamily:'var(--font-primary)'}}>Top Hiring Now</div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {topCompaniesList.map((name,i)=>{
                  const logo=getLogoStyle(name);
                  return(
                    <div key={name} style={{display:'flex',alignItems:'center',gap:9,padding:'7px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10}}>
                      <div style={{width:24,height:24,borderRadius:7,background:logo.bg,color:logo.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,fontFamily:'var(--font-display)'}}>{name[0].toUpperCase()}</div>
                      <span style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.55)',fontFamily:'var(--font-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{name}</span>
                      <span style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.25)',fontFamily:'var(--font-primary)',flexShrink:0}}>#{i+1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIVE ACTIVITY */}
          <div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'2.2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',marginBottom:10,fontFamily:'var(--font-primary)'}}>Live Activity</div>
            {[
              {dot:'#8eb29b',text:'Someone in Austin applied to ML Engineer at Stripe',time:'2m'},
              {dot:'#d6b268',text:'Someone in NYC got interview at Figma',time:'5m'},
              {dot:'var(--gold)',text:'Someone in Seattle found H1B role',time:'8m'},
            ].map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:item.dot,marginTop:3,flexShrink:0}}/>
                <div style={{fontSize:10,fontWeight:400,color:'rgba(255,255,255,0.35)',lineHeight:1.5,flex:1,fontFamily:'var(--font-primary)'}}>{item.text}</div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',flexShrink:0,fontFamily:'var(--font-primary)'}}>{item.time}</div>
              </div>
            ))}
          </div>

        </motion.aside>
      </motion.div>

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

            <button onClick={()=>setShowMobileSidebar(false)} style={{marginTop:16,width:"100%",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* WELCOME TOUR */}
      {showWelcomeTour&&<WelcomeTour onClose={closeTour}/>}

      {/* ONBOARDING */}
      {showOnboard&&(
        <div className="onboard-overlay">
          <style>{`
            .onboard-overlay{position:fixed;inset:0;z-index:1000;background:#060608;display:flex;flex-direction:column;}
            .onboard-main{display:grid;grid-template-columns:1fr 1fr;flex:1;min-height:0;align-items:start;}
            .onboard-left{padding:60px;padding-bottom:120px;overflow-y:auto;min-height:0;height:100%;}
            .onboard-right{background:rgba(245,158,11,0.05);border-left:1px solid rgba(255,255,255,0.06);position:sticky;top:0;height:calc(100vh - 4px);overflow:hidden;}
            .onboard-step-label{font-size:11px;color:#f59e0b;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;font-weight:600;}
            .onboard-title{font-family:'Playfair Display',serif;font-size:clamp(32px,4vw,52px);font-weight:900;line-height:1.05;letter-spacing:-1.5px;margin-bottom:16px;}
            .onboard-title em{font-style:italic;background:linear-gradient(135deg,#f59e0b,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
            .onboard-sub{font-size:15px;color:rgba(255,255,255,0.4);font-weight:300;line-height:1.7;margin-bottom:40px;}
            .onboard-preview{position:relative;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;}
            .preview-card{position:absolute;width:280px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;backdrop-filter:blur(12px);animation:obCardFloat 8s ease-in-out infinite;left:50%;transform:translateX(-50%);bottom:-140px;}
            .preview-card:nth-child(1){animation-delay:0s;}
            .preview-card:nth-child(2){animation-delay:2s;}
            .preview-card:nth-child(3){animation-delay:4s;}
            .preview-card:nth-child(4){animation-delay:6s;}
            @keyframes obCardFloat{0%{transform:translateX(-50%) translateY(0);opacity:0;}8%{opacity:1;}80%{opacity:1;}100%{transform:translateX(-50%) translateY(-700px);opacity:0;}}
            @keyframes floatUp{0%{transform:translateY(0);opacity:0;}10%{opacity:1;}80%{opacity:1;}100%{transform:translateY(-600px);opacity:0;}}
            .ob-terminal{background:#0a0a0f;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;font-family:'Courier New',monospace;font-size:13px;min-height:280px;}
            .ob-term-line{color:#34d399;line-height:1.9;animation:termFadeIn .3s ease both;}
            .ob-term-line.dim{color:rgba(255,255,255,0.3);}
            @keyframes termFadeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
            @keyframes drawCircle{to{stroke-dashoffset:0;}}
            @keyframes drawCheck{to{stroke-dashoffset:0;}}
            @keyframes ob-fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
            @keyframes slideInFromRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
            @keyframes slideOutToLeft{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-40px)}}
            @keyframes progressFill{from{width:0%}to{width:${(onboardStep/3)*100}%}}
            @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
            @keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1);opacity:1}}
            @media(max-width:768px){.onboard-main{grid-template-columns:1fr;}.onboard-right{display:none!important;}.onboard-left{padding:32px 24px;padding-bottom:120px;}}
            .onboard-progress{position:relative;width:100%;height:4px;background:rgba(255,255,255,0.08);overflow:hidden;}
            .onboard-progress-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);transition:width 0.6s cubic-bezier(0.4,0,0.2,1);}
            .ob-input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:12px 16px;font-size:14px;font-family:'DM Sans',sans-serif;color:#fff;outline:none;transition:all .2s;margin-bottom:16px;}
            .ob-input:focus{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.1);}
            .ob-input::placeholder{color:rgba(255,255,255,0.25);}
            .ob-chip{margin-bottom:8px;}
            .ob-drop-zone{border:2px dashed rgba(245,158,11,0.3);border-radius:16px;padding:32px;text-align:center;cursor:pointer;transition:all .3s;background:rgba(245,158,11,0.02);position:relative;overflow:hidden;}
            .ob-drop-zone:hover,.ob-drop-zone.dragging{border-color:#f59e0b;background:rgba(245,158,11,0.06);}
            .ob-drop-zone.dragover{border-color:#10b981;background:rgba(16,185,129,0.06);}
            .ob-drop-zone::before{content:'';position:absolute;inset:0;background:linear-gradient(45deg,transparent,rgba(245,158,11,0.03),transparent);transform:translateX(-100%);transition:transform .6s;}
            .ob-drop-zone:hover::before{transform:translateX(100%);}
            .ob-success-icon{width:48px;height:48px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:bounceIn .6s ease;}
            .ob-error{color:#ef4444;font-size:12px;margin-top:8px;}
            .ob-validation{display:flex;align-items:center;gap:6px;font-size:12px;margin-top:8px;}
            .ob-validation.valid{color:#10b981;}
            @keyframes termBlink{0%,100%{opacity:1}50%{opacity:0}}
            @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            @keyframes spin360{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          `}</style>

          {/* Progress bar at top */}
          <div className="onboard-progress">
            <div className="onboard-progress-fill" style={{width:`${(onboardStep/3)*100}%`, animation: onboardStep > 1 ? 'progressFill 0.6s ease' : 'none'}}/>
          </div>

          {onboardStep<3?(
            <div className="onboard-main">
              {/* LEFT PANEL */}
              <div className="onboard-left">
                {onboardStep===1&&(
                  <div key="step1" style={{animation:"slideInFromRight .5s ease both"}}>
                    <div className="onboard-step-label">Step 1 of 3 · Quick setup</div>
                    <h1 className="onboard-title">
                      Welcome to <em>Vegaply</em>
                    </h1>
                    <p className="onboard-sub">The AI job search platform that finds fresh roles, scores your resume, and helps you apply first. Let's get you set up in under 2 minutes.</p>

                    <div style={{marginBottom: 32}}>
                      <label style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",letterSpacing:1,textTransform:"uppercase",marginBottom:8,display:"block"}}>What role are you looking for?</label>
                      <input className="ob-input" value={onboardRole} onChange={e=>setOnboardRole(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&onboardRole.trim()&&setOnboardLocation(onboardLocation||'Remote')&&setOnboardStep(2)}
                        placeholder="e.g. Data Analyst, Software Engineer"/>
                      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:0}}>
                        {["Software Engineer","Data Analyst","UX Designer","Product Manager","ML Engineer","Cloud Engineer","Marketing Manager","Business Analyst"].map((role,i)=>(
                          <button key={role} className={`ob-chip${onboardRole===role?" selected":""}`}
                            onClick={()=>setOnboardRole(role)}
                            style={{background:onboardRole===role?"linear-gradient(135deg,#f59e0b,#fbbf24)":"rgba(245,158,11,0.08)",border:`1px solid ${onboardRole===role?"transparent":"rgba(245,158,11,0.22)"}`,borderRadius:100,padding:"5px 13px",fontSize:12,fontWeight:600,color:onboardRole===role?"#fff":"#fbbf24",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",transform:onboardRole===role?"scale(1.05)":"scale(1)"}}>
                            {role}
                          </button>
                        ))}
                      </div>
                      {onboardRole.trim() && <div className="ob-validation valid"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Great choice!</div>}
                    </div>

                    <div style={{marginBottom: 40}}>
                      <label style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",letterSpacing:1,textTransform:"uppercase",marginBottom:8,display:"block"}}>Preferred location</label>
                      <input className="ob-input" value={onboardLocation} onChange={e=>setOnboardLocation(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&onboardRole.trim()&&onboardLocation.trim()&&setOnboardStep(2)}
                        placeholder="e.g. Remote, New York, San Francisco"/>
                      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:0}}>
                        {["Remote","New York","San Francisco","London","Toronto","Austin","Seattle","Chicago"].map((loc,i)=>(
                          <button key={loc} className={`ob-chip${onboardLocation===loc?" selected":""}`}
                            onClick={()=>setOnboardLocation(loc)}
                            style={{background:onboardLocation===loc?"linear-gradient(135deg,#f59e0b,#fbbf24)":"rgba(245,158,11,0.08)",border:`1px solid ${onboardLocation===loc?"transparent":"rgba(245,158,11,0.22)"}`,borderRadius:100,padding:"5px 13px",fontSize:12,fontWeight:600,color:onboardLocation===loc?"#fff":"#fbbf24",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",transform:onboardLocation===loc?"scale(1.05)":"scale(1)"}}>
                            {loc}
                          </button>
                        ))}
                      </div>
                      {onboardLocation.trim() && <div className="ob-validation valid"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Perfect location!</div>}
                    </div>

                    <button className="ob-btn" disabled={!onboardRole.trim()||!onboardLocation.trim()}
                      onClick={()=>{if(onboardRole.trim()&&onboardLocation.trim()){setObTermLines([]);setObTermItems([]);setOnboardStep(2);}}}
                      style={{width:"100%",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:12,padding:"14px 40px",fontSize:15,fontWeight:700,color:"#fff",cursor:!onboardRole.trim()||!onboardLocation.trim()?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:"-.2px",transition:"all .2s",opacity:!onboardRole.trim()||!onboardLocation.trim()?0.45:1,boxShadow:!onboardRole.trim()||!onboardLocation.trim()?"none":"0 8px 24px rgba(245,158,11,0.35)"}}>
                      Continue — Upload Resume →
                    </button>
                  </div>
                )}

                {onboardStep===2&&(
                  <div key="step2" style={{animation:"slideInFromRight .5s ease both"}}>
                    <div className="onboard-step-label">Step 2 of 3 · Upload resume</div>
                    <h1 className="onboard-title">
                      Upload your <em>resume</em>
                    </h1>
                    <p className="onboard-sub">Upload your PDF once. We'll use AI to score every job match, write tailored cover letters, and fill applications automatically.</p>

                    {/* Enhanced Resume Upload */}
                    <div className={`ob-drop-zone${onboardParsing?" dragging":""}`}
                      onDragOver={e=>{e.preventDefault();}}
                      onDragLeave={e=>{e.preventDefault();}}
                      onDrop={async(e)=>{
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (!file || !file.name.endsWith('.pdf')) return;
                        setOnboardParsing(true); setOnboardError("");
                        try {
                          const text = await parsePdfFile(file);
                          setResumeText(text);
                          setResumeFileName(file.name);
                          lsSet("applysmart_resume", text);
                          lsSet("applysmart_resume_name", file.name);
                          setOnboardStep(3);
                        } catch (err: any) {
                          setOnboardError(err?.message || "Failed to parse PDF.");
                        }
                        setOnboardParsing(false);
                      }}
                      onClick={()=>{
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf';
                        input.onchange = async(e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          setOnboardParsing(true); setOnboardError("");
                          try {
                            const text = await parsePdfFile(file);
                            setResumeText(text);
                            setResumeFileName(file.name);
                            lsSet("applysmart_resume", text);
                            lsSet("applysmart_resume_name", file.name);
                            setOnboardStep(3);
                          } catch (err: any) {
                            setOnboardError(err?.message || "Failed to parse PDF.");
                          }
                          setOnboardParsing(false);
                        };
                        input.click();
                      }}
                    >
                      {onboardParsing ? (
                        <div style={{textAlign:"center"}}>
                          <div className="spin" style={{marginBottom:16}}/>
                          <div style={{fontSize:16,fontWeight:600,color:"#f59e0b",marginBottom:8}}>Analyzing your resume...</div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Extracting text and skills</div>
                        </div>
                      ) : resumeText ? (
                        <div style={{textAlign:"center"}}>
                          <div className="ob-success-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <div style={{fontSize:16,fontWeight:600,color:"#10b981",marginBottom:8}}>Resume uploaded!</div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:16}}>{resumeFileName}</div>
                          <button className="ob-btn" onClick={(e)=>{e.stopPropagation();setOnboardStep(3);}}
                            style={{background:"linear-gradient(135deg,#10b981,#34d399)",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:600,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                            Continue →
                          </button>
                        </div>
                      ) : (
                        <div style={{textAlign:"center"}}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:16}}>
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <div style={{fontSize:16,fontWeight:600,color:"rgba(255,255,255,0.8)",marginBottom:8}}>Drop your resume PDF here</div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:onboardError?8:16}}>or click to browse • We support PDF files only</div>
                          {onboardError&&<div style={{fontSize:12,color:"#ef4444",marginBottom:12,maxWidth:280,lineHeight:1.5}}>{onboardError}</div>}
                          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",padding:"4px 8px",borderRadius:6}}>✓ AI Analysis</div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",padding:"4px 8px",borderRadius:6}}>✓ Auto Apply</div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.05)",padding:"4px 8px",borderRadius:6}}>✓ Cover Letters</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{marginTop:20,textAlign:"center"}}>
                      <button className="ob-btn" onClick={()=>{setResumeText("");setResumeFileName("");setOnboardStep(3);}}
                        style={{background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit"}}>
                        Skip for now →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL */}
              <div className="onboard-right">
                <div className="onboard-preview">
                  {onboardStep===1&&(
                    <div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {/* Radial glow */}
                      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:420,height:420,background:"radial-gradient(circle,rgba(245,158,11,0.13),transparent 70%)",pointerEvents:"none"}}/>
                      {/* Floating job cards */}
                      {[
                        {init:"G",color:"linear-gradient(135deg,#f59e0b,#fbbf24)",title:"Senior ML Engineer",company:"Google",time:"2m ago",hot:true},
                        {init:"A",color:"linear-gradient(135deg,#ec4899,#f43f5e)",title:"Product Designer",company:"Airbnb",time:"5m ago",hot:false},
                        {init:"S",color:"linear-gradient(135deg,#10b981,#34d399)",title:"Staff Engineer",company:"Stripe",time:"8m ago",hot:true},
                        {init:"F",color:"linear-gradient(135deg,#f59e0b,#d97706)",title:"Data Scientist",company:"Figma",time:"12m ago",hot:false},
                      ].map((card,i)=>(
                        <div key={i} className="preview-card" style={{animationDelay:`${i*2}s`}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                            <div style={{width:36,height:36,borderRadius:10,background:card.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>{card.init}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{card.title}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{card.company}</div>
                            </div>
                            {card.hot&&<div style={{fontSize:10,fontWeight:700,background:"rgba(249,115,22,0.15)",color:"#f97316",border:"1px solid rgba(249,115,22,0.3)",borderRadius:100,padding:"2px 8px",flexShrink:0}}>HOT</div>}
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <div style={{fontSize:10,fontWeight:600,background:"rgba(52,211,153,0.1)",color:"#34d399",border:"1px solid rgba(52,211,153,0.2)",borderRadius:100,padding:"3px 8px"}}>{card.time}</div>
                            <div style={{fontSize:10,fontWeight:600,background:"rgba(52,211,153,0.1)",color:"#34d399",border:"1px solid rgba(52,211,153,0.2)",borderRadius:100,padding:"3px 8px"}}>~3 applicants</div>
                          </div>
                        </div>
                      ))}
                      <div style={{position:"absolute",bottom:24,left:0,right:0,textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.2)",letterSpacing:"0.3px"}}>
                        750+ fresh jobs · Updated every 3 minutes
                      </div>
                    </div>
                  )}
                  {onboardStep===2&&(
                    <div style={{width:360,background:"#0d1117",borderRadius:14,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.06)"}}>
                      {/* macOS title bar */}
                      <div style={{background:"#161b22",padding:"10px 14px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f56",flexShrink:0}}/>
                        <div style={{width:12,height:12,borderRadius:"50%",background:"#ffbd2e",flexShrink:0}}/>
                        <div style={{width:12,height:12,borderRadius:"50%",background:"#27c93f",flexShrink:0}}/>
                        <div style={{flex:1,textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'Courier New',monospace",letterSpacing:"0.2px"}}>vegaply — analyze-resume</div>
                      </div>
                      {/* Terminal output */}
                      <div style={{padding:"16px 18px",fontFamily:"'Courier New',monospace",fontSize:12,lineHeight:1.85,minHeight:260}}>
                        {obTermItems.map((item,i)=>(
                          <div key={i} style={{color:item.color,animation:"termFadeIn .3s ease both",animationDelay:`${i*0.05}s`,opacity:0,animationFillMode:"forwards",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {item.text}
                          </div>
                        ))}
                        {obTermItems.length<9&&(
                          <span style={{display:"inline-block",width:8,height:14,background:"#39ff14",verticalAlign:"text-bottom",animation:"termBlink 1s ease infinite"}}/>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ):(
            /* STEP 3 — Success */
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
              <div style={{textAlign:"center",animation:"ob-fadeUp .5s ease both",maxWidth:480}}>
                {/* Animated checkmark */}
                <div style={{marginBottom:32}}>
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(52,211,153,0.15)" strokeWidth="3"/>
                    <circle cx="48" cy="48" r="42" fill="none" stroke="#34d399" strokeWidth="3"
                      style={{strokeDasharray:264,strokeDashoffset:264,animation:"drawCircle 0.9s cubic-bezier(.34,1,.64,1) .1s forwards"}}/>
                    <path d="M 28 48 L 42 62 L 68 34" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{strokeDasharray:68,strokeDashoffset:68,animation:"drawCheck 0.5s cubic-bezier(.34,1,.64,1) 0.9s forwards"}}/>
                  </svg>
                </div>

                <div style={{fontSize:11,color:"#34d399",letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:12}}>Setup complete!</div>
                <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(32px,5vw,48px)",fontWeight:900,letterSpacing:"-1.5px",lineHeight:1.05,color:"#fff",marginBottom:12}}>
                  Ready to apply <em>first.</em>
                </h1>
                <p style={{fontSize:15,color:"rgba(255,255,255,0.35)",fontWeight:300,lineHeight:1.75,marginBottom:32}}>
                  Your profile is ready. We'll show you jobs posted in the last 24 hours, scored by how well they match your resume.
                </p>

                {/* Summary pills */}
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:36}}>
                  {[
                    {icon:"🎯",label:onboardRole||jobRole||"Your role"},
                    {icon:"📍",label:onboardLocation||location||"Your location"},
                    {icon:"📄",label:resumeText?"Resume uploaded":"No resume yet"},
                  ].map((item,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:100,padding:"7px 14px",fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:500,animation:`bounceIn .6s ease ${i*0.1}s both`}}>
                      <span>{item.icon}</span>{item.label}
                    </div>
                  ))}
                </div>

                <button className="ob-btn" onClick={completeOnboarding}
                  style={{background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",borderRadius:14,padding:"16px 48px",fontSize:16,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit",letterSpacing:"-.2px",animation:"pulse 2s ease-in-out infinite"}}>
                  Find My Jobs →
                </button>
              </div>
            </div>
          )}
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
              <div key={r.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${i===0?"rgba(245,158,11,0.25)":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:14,marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"#fff",marginBottom:3}}>{r.file_name}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{new Date(r.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>{i===0&&<div style={{fontSize:9,color:"#f59e0b",fontWeight:700,marginTop:3,letterSpacing:"0.3px"}}>ACTIVE</div>}</div>
                <button onClick={()=>{setResumeText(r.resume_text);setResumeFileName(r.file_name);lsSet("applysmart_resume",r.resume_text);lsSet("applysmart_resume_name",r.file_name);setShowResumeHistory(false);}} style={{background:i===0?"rgba(245,158,11,0.08)":"linear-gradient(135deg,#f59e0b,#fbbf24)",color:i===0?"#f59e0b":"#fff",border:i===0?"1px solid rgba(245,158,11,0.25)":"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {i===0?"Active":"Use This"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FLOATING HELP */}
      <HelpPanel/>

      {/* PREFERENCES MODAL */}
      {showPreferences&&<PreferencesModal lm={!darkMode} onClose={()=>setShowPreferences(false)} onSave={(p)=>setSavedPrefs(p)}/>}

      {/* REFRESH TOAST */}
      {refreshToast&&(
        <div className="refresh-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Updated just now — new jobs found
        </div>
      )}

      {/* AUTO APPLY CONFIRM MODAL */}
      {autoApplyModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setAutoApplyModal(null)}>
          <div style={{background:"#0e0e16",border:"1px solid rgba(245,158,11,0.25)",borderRadius:16,padding:24,maxWidth:520,width:"100%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 48px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:2}}>Auto Apply Preview</div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{autoApplyModal.job.job_title}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{autoApplyModal.job.employer_name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:22,fontWeight:800,color:autoApplyModal.score>=70?"#34d399":autoApplyModal.score>=50?"#fbbf24":"#f87171"}}>{autoApplyModal.score}%</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600}}>ATS MATCH</div>
              </div>
            </div>
            {autoApplyModal.score<50&&(
              <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#f87171",marginBottom:14,fontWeight:500}}>
                ⚠️ Low ATS match after 2 passes. Consider applying manually with a more targeted resume.
              </div>
            )}
            {autoApplyModal.tailoredBullets.length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.35)",marginBottom:8}}>Tailored Bullets</div>
                {autoApplyModal.tailoredBullets.map((b,i)=>(
                  <div key={i} style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                    <div style={{fontSize:11,color:"#fbbf24",fontWeight:600,marginBottom:2}}>✦ {b.tailored}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{b.reason}</div>
                  </div>
                ))}
              </div>
            )}
            {autoApplyModal.keywordsAdded.length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:"rgba(255,255,255,0.35)",marginBottom:6}}>Keywords Added</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{autoApplyModal.keywordsAdded.map((k,i)=><span key={i} style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:6,background:"rgba(52,211,153,0.08)",color:"#34d399",border:"1px solid rgba(52,211,153,0.18)"}}>{k}</span>)}</div>
              </div>
            )}
            {autoApplyModal.atsTip&&<div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.14)",borderRadius:8,padding:"8px 12px",fontSize:11,color:"rgba(245,158,11,0.75)",marginBottom:16}}>💡 {autoApplyModal.atsTip}</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleConfirmApply} style={{flex:1,padding:"10px 0",borderRadius:9,background:"linear-gradient(135deg,#f59e0b,#fbbf24)",border:"none",color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.2px"}}>Confirm &amp; Apply →</button>
              <button onClick={()=>setAutoApplyModal(null)} style={{padding:"10px 18px",borderRadius:9,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO APPLY TOAST */}
      {autoApplyToast&&(
        <div className="refresh-toast" style={{
          borderColor:autoApplyToast.startsWith("✅")?"rgba(52,211,153,0.35)":autoApplyToast.startsWith("⚠️")?"rgba(245,158,11,0.35)":"rgba(255,255,255,0.1)",
          color:autoApplyToast.startsWith("✅")?"#34d399":autoApplyToast.startsWith("⚠️")?"#fbbf24":"rgba(255,255,255,0.6)",
          bottom:72,maxWidth:400
        }}>
          {autoApplyToast}
        </div>
      )}
    </div>
  );
}
