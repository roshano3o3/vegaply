import { NextResponse } from "next/server";
import { CLAUDE_SONNET_MODEL } from "@/lib/ai/config";

export const maxDuration = 60;

// ── JSON extraction ────────────────────────────────────────────────────────────

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

// ── Output validation helpers ──────────────────────────────────────────────────

// Returns true if the raw resume text appears to contain work experience entries.
// Requires both a year pattern (e.g. 2019–2023) AND a role/company indicator
// so we don't flag bare skills-only resumes.
function resumeHasExperience(text: string): boolean {
  const hasYear    = /\b20\d{2}\b/.test(text);
  const hasRoleKey = /\b(engineer|developer|analyst|manager|intern|associate|consultant|designer|lead|director|specialist|coordinator|administrator|worked|employment|experience)\b/i.test(text);
  return hasYear && hasRoleKey;
}

// Returns true if the raw resume text appears to contain an education section.
function resumeHasEducation(text: string): boolean {
  return /\b(university|college|bachelor|master|degree|b\.s\.|m\.s\.|b\.a\.|m\.a\.|phd|bs\b|ms\b|mba|b\.eng|m\.eng|graduate|undergraduate)\b/i.test(text);
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();
    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const companyName    = job.employer_name ?? job.company_name ?? "the company";
    const jobTitle       = job.job_title ?? "the role";
    const qualifications = (job.job_highlights?.Qualifications ?? []).join("; ");

    // Raised from 6 000 → 10 000 chars so late-career / multi-role resumes
    // are not silently truncated before the model sees them.
    const resumeInput = resumeText.slice(0, 10_000);

    // Raised from 3 000 → 4 000 chars to give Sonnet richer role context.
    const jdInput = (job.job_description ?? "").slice(0, 4_000);

    const prompt = `You are a senior resume writer and ATS specialist. Your output is used directly in a professional job application. Return ONLY valid JSON — no markdown, no explanation, no commentary outside the JSON object.

═══ ABSOLUTE RULES — ANY VIOLATION MAKES THE OUTPUT UNUSABLE ═══
1. Use ONLY content from the candidate's resume below. Never invent employers, job titles, companies, dates, degrees, metrics, percentages, dollar amounts, or skills.
2. Preserve every work experience entry. If the resume has 3 jobs, output 3 jobs. Never drop or merge roles.
3. Preserve original job titles, company names, and dates character-for-character. Only the bullet content may be rewritten.
4. Do NOT add skills the resume does not contain or clearly demonstrate.
5. If a section is absent from the resume, output an empty array — never omit the key.
6. Do NOT use filler openers: "I am seeking", "I am excited", "Responsible for", "Helped with", "Assisted in". Every bullet must lead with a strong, specific action verb.
7. Do NOT fabricate or infer metrics. If the original bullet says "improved performance", do not change it to "improved performance by 40%".

═══ TARGET ROLE ═══
Position : ${jobTitle}
Company  : ${companyName}
Required : ${qualifications}

═══ JOB DESCRIPTION ═══
${jdInput}

═══ CANDIDATE RESUME ═══
${resumeInput}

═══ TAILORING INSTRUCTIONS ═══
summary:
  - 3–4 sentences. Open with the candidate's professional identity and years of relevant experience (if stated).
  - Directly connect their actual background to what this specific role and company require.
  - Incorporate 2–3 high-value JD keywords naturally — do not list them mechanically.
  - Do not describe what the candidate "is looking for". Describe what they have done and what they bring.

experience bullets (per role):
  - Keep every bullet from the original. Do not drop bullets to save space.
  - Place the most JD-relevant bullets first within each role.
  - Rephrase bullets using JD language only where the underlying skill genuinely exists in the original.
  - Vary action verbs — do not repeat the same verb more than twice across all bullets.
  - Where the original states a result or metric, preserve it exactly. Do not strengthen or weaken numbers.

projects:
  - Include only if present in the resume. Rephrase bullets using JD-relevant language where appropriate.
  - Preserve project names exactly.

skills:
  - List all skills from the resume, ordered by relevance to this JD. No additions, no removals.

keywords_added:
  - List only JD keywords that were organically woven into rephrased bullet or summary text.
  - Do not list terms already verbatim in the original resume.
  - Maximum 10 items.

matchScore / matchLabel:
  - matchScore: integer 0–100. Honest keyword-overlap and role-fit estimate. Do not inflate.
  - matchLabel: exactly one of "Excellent" | "Strong" | "Good" | "Fair" | "Low"

matchedSkills : up to 8 resume skills that appear in or closely match JD requirements.
missingSkills : up to 6 JD skills clearly absent or weak in the resume.

═══ REQUIRED OUTPUT SHAPE ═══
Return exactly this structure. All keys must be present. Arrays may be empty but must not be omitted.

{
  "matchScore": 78,
  "matchLabel": "Strong",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1"],
  "resume": {
    "summary": "3–4 sentence professional summary targeting this role",
    "experience": [
      {
        "title": "exact title from resume",
        "company": "exact company from resume",
        "dates": "exact dates from resume or empty string",
        "location": "location if present else empty string",
        "bullets": ["bullet 1", "bullet 2"]
      }
    ],
    "projects": [
      {
        "name": "exact project name",
        "bullets": ["achievement or description bullet"]
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
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      CLAUDE_SONNET_MODEL,
        max_tokens: 4000,
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[apply-preview] Anthropic error:", response.status, body.slice(0, 200));
      return NextResponse.json({ error: `Anthropic API ${response.status}` }, { status: 502 });
    }

    const data   = await response.json();
    const raw    = (data?.content?.[0]?.text ?? "") as string;
    const result = extractJson(raw);

    // ── Structural validation ────────────────────────────────────────────────
    // Gate 1: top-level shape must be present.
    if (!result.resume || typeof result.matchScore !== "number") {
      console.error("[apply-preview] Incomplete output. Keys:", Object.keys(result));
      return NextResponse.json({ error: "Incomplete AI output" }, { status: 500 });
    }

    const resumeObj = result.resume as Record<string, unknown>;

    // Gate 2: experience[] must not be empty when the source resume clearly
    // contains work history. An empty array here means the model ran out of
    // tokens or misread the JSON structure — both are silent quality failures.
    if (
      resumeHasExperience(resumeText) &&
      (!Array.isArray(resumeObj.experience) || (resumeObj.experience as unknown[]).length === 0)
    ) {
      console.error("[apply-preview] Validation failed: experience[] empty despite work history in resume");
      return NextResponse.json({ error: "Incomplete AI output" }, { status: 500 });
    }

    // Gate 3: education[] must not be silently dropped when the source resume
    // contains an education section.
    if (
      resumeHasEducation(resumeText) &&
      (!Array.isArray(resumeObj.education) || (resumeObj.education as unknown[]).length === 0)
    ) {
      console.error("[apply-preview] Validation failed: education[] empty despite education in resume");
      return NextResponse.json({ error: "Incomplete AI output" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[apply-preview] error:", err);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
