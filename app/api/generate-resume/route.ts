import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { resumeText, job, profile } = await req.json();

    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const profileName = profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

    const prompt = `You are an elite resume writer tailoring a REAL candidate's resume for a specific job. Your job: TRANSFORM existing experience into stronger language — NEVER invent.

═══════════════════════════════════════════
CANDIDATE PROFILE (use exactly if provided, else extract from resume)
═══════════════════════════════════════════
Name: ${profileName || "EXTRACT FROM RESUME"}
Email: ${profile?.email || "EXTRACT FROM RESUME"}
Phone: ${profile?.phone || "EXTRACT FROM RESUME"}
LinkedIn: ${profile?.linkedin_url || "EXTRACT FROM RESUME IF PRESENT"}
Location: ${profile?.location || "EXTRACT FROM RESUME"}

═══════════════════════════════════════════
CANDIDATE'S FULL RESUME (source of truth — ALL content derives from here)
═══════════════════════════════════════════
${resumeText}

═══════════════════════════════════════════
TARGET JOB
═══════════════════════════════════════════
Title: ${job.job_title || ""}
Company: ${job.employer_name || ""}
Description: ${(job.job_description || "").slice(0, 2500)}
Required: ${job.job_highlights?.Qualifications?.join("; ") || ""}

═══════════════════════════════════════════
RULES — NON-NEGOTIABLE
═══════════════════════════════════════════

DO:
✓ Rephrase every bullet using strong action verbs (Led, Architected, Drove, Reduced, Shipped, Owned, Scaled, Delivered, Optimized)
✓ Reorder bullets within each role so the most JD-relevant ones appear first
✓ Pull metrics that ARE in the resume forward and emphasize them
✓ Weave keywords from the JD into bullets ONLY where they truthfully match real experience
✓ Write a fresh 3–4 sentence professional summary tailored to THIS specific job using ONLY facts from the resume
✓ Include EVERY job, project, certification, skill, and education entry the candidate has — drop nothing

DO NOT:
✗ Invent metrics ($X, Y%, N users) — if it's not in the resume, do not create it
✗ Invent technologies, frameworks, or tools not listed
✗ Invent companies, titles, or dates
✗ Add education, certs, or projects not on the resume
✗ Output the literal phrase "Tailored Resume" anywhere

═══════════════════════════════════════════
ALLOWED REPHRASING — EXAMPLES
═══════════════════════════════════════════

Resume: "Worked on Python pipeline for data processing"
JD wants: "ETL, Python, large datasets"
✓ "Built Python ETL pipeline powering downstream analytics workflows"
✗ "Built Python ETL pipeline processing 10M+ records daily"  ← invented number

Resume: "Helped reduce inventory cost by 5%"
✓ "Drove 5% inventory cost reduction through data-driven optimization"
✗ "Drove $250K inventory cost reduction"  ← invented dollar amount

═══════════════════════════════════════════
OUTPUT — Return ONLY valid JSON, no markdown, no explanation
═══════════════════════════════════════════

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string or empty",
  "location": "string",
  "summary": "3-4 sentences tailored to this job using only true facts",
  "experience": [
    { "title": "string", "company": "string", "location": "string", "dates": "string", "bullets": ["string"] }
  ],
  "education": [
    { "degree": "string", "institution": "string", "location": "string", "dates": "string" }
  ],
  "projects": [
    { "name": "string", "description": "string", "bullets": ["string"] }
  ],
  "certifications": ["string"],
  "skills": { "category": ["skill"] }
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();

    console.log("[generate-resume] raw output length:", text.length);

    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[generate-resume] error:", error);
    return NextResponse.json(
      { error: "Failed to generate tailored resume" },
      { status: 500 }
    );
  }
}
