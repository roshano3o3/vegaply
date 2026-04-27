import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const prompt = `You are an expert resume writer. Your job is to rewrite a candidate's resume to perfectly match a specific job description.

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2000) || "Not provided"}

CANDIDATE'S CURRENT RESUME:
${resumeText.slice(0, 3000)}

Rewrite the resume to:
1. Match the job description keywords exactly
2. Rewrite the professional summary for this specific role
3. Reorder and rewrite bullet points to highlight most relevant experience first
4. Add missing keywords from job description naturally
5. Keep all facts true — never invent experience
6. Target 90%+ ATS score for this specific job

Return ONLY a JSON object with this exact structure, no preamble:
{
  "summary": "2-3 sentence professional summary tailored to this role",
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "keywords_added": ["keyword1", "keyword2"],
  "ats_score_estimate": 92
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data?.content?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-resume error:", error);
    return NextResponse.json({ error: "Failed to generate resume" }, { status: 500 });
  }
}
