import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

export const maxDuration = 45;

function extractJson(raw: string): Record<string, unknown> {
  const clean = raw.replace(/```json|```/g, "").trim();
  const s = clean.startsWith("{") ? clean : (clean.match(/\{[\s\S]*/)?.[0] ?? "{}");
  let depth = 0, end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  try { return JSON.parse(end !== -1 ? s.slice(0, end + 1) : s); } catch { return {}; }
}

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();
    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const companyName = job.employer_name ?? job.company_name ?? "the company";
    const jobTitle = job.job_title ?? "the role";
    const qualifications: string = job.job_highlights?.Qualifications?.join("; ") ?? "";

    const prompt = `You are an expert resume writer and ATS analyst. Return ONLY valid JSON, no markdown, no explanation.

STRICT RULES — violating any rule makes the output invalid:
1. Use ONLY information from the candidate's resume. Never invent employers, titles, dates, degrees, metrics, percentages, or skills.
2. Preserve every job, project, and education entry. If the resume has 4 jobs, output 4 jobs. Never drop roles.
3. Preserve original job titles, company names, and dates exactly. Only rephrase bullet content.
4. Do NOT add skills the resume does not mention or clearly demonstrate.
5. If a section is absent from the resume, output an empty array for it.
6. Do NOT start the summary with "I am seeking" or "I am excited".

TARGET ROLE: ${jobTitle} at ${companyName}
JOB DESCRIPTION: ${(job.job_description ?? "").slice(0, 3000)}
REQUIRED QUALIFICATIONS: ${qualifications}

CANDIDATE RESUME:
${resumeText.slice(0, 6000)}

TAILORING INSTRUCTIONS:
- summary: 3-5 sentences targeting this exact role. Describe what the candidate has done, not what they want. Use only real background from the resume.
- Experience bullets: reorder within each role by relevance to this job. Rephrase with JD keywords where the underlying skill genuinely exists. Lead every bullet with a strong action verb. Keep ALL original bullets — do not drop any.
- Projects: include only if present in resume. Rephrase bullets using JD-relevant language where appropriate.
- Skills: keep all skills from the resume, ordered by relevance to this job. No additions.
- keywords_added: list the JD keywords you incorporated through rephrasing (max 10).

ATS SCORING INSTRUCTIONS:
- matchScore: integer 0-100 estimating keyword overlap and role fit. Be honest; do not inflate.
- matchLabel: one of "Excellent" | "Strong" | "Good" | "Fair" | "Low"
- matchedSkills: up to 8 skills from the resume that appear in or closely match JD requirements.
- missingSkills: up to 6 skills mentioned in the JD that are absent or weak in the resume.

Return exactly this JSON shape (all fields required, arrays may be empty but must be present):
{
  "matchScore": 78,
  "matchLabel": "Strong",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1"],
  "resume": {
    "summary": "3-5 sentence professional summary",
    "experience": [
      {
        "title": "exact title from resume",
        "company": "exact company from resume",
        "dates": "exact dates from resume or empty string",
        "location": "location if present else empty string",
        "bullets": ["bullet 1", "bullet 2", "bullet 3"]
      }
    ],
    "projects": [
      {
        "name": "exact project name",
        "bullets": ["description or achievement bullet"]
      }
    ],
    "education": [
      {
        "degree": "exact degree",
        "school": "exact school",
        "dates": "exact dates or empty string",
        "location": "location if present else empty string"
      }
    ],
    "certifications": ["exact cert name"],
    "skills": ["skill1", "skill2"],
    "keywords_added": ["keyword1", "keyword2"],
    "ats_score_estimate": 78
  }
}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(40_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[apply-preview] Anthropic error:", response.status, body.slice(0, 200));
      return NextResponse.json({ error: `Anthropic API ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const raw = (data?.content?.[0]?.text ?? "") as string;
    const result = extractJson(raw);

    if (!result.resume || typeof result.matchScore !== "number") {
      console.error("[apply-preview] Incomplete output. Keys:", Object.keys(result));
      return NextResponse.json({ error: "Incomplete AI output" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[apply-preview] error:", err);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
