import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    const prompt = `You are a career skills analyst. Compare this resume against the job posting and return ONLY valid JSON with no markdown or explanation.

RESUME:
${resumeText?.slice(0, 3000)}

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2000)}
REQUIRED QUALIFICATIONS: ${job.job_highlights?.Qualifications?.join(", ") ?? ""}

Return exactly this JSON:
{
  "missingSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "strongSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "courses": [
    { "skill": "skill name", "title": "course title", "platform": "Coursera", "url": "https://coursera.org/..." },
    { "skill": "skill name", "title": "course title", "platform": "YouTube", "url": "https://youtube.com/..." },
    { "skill": "skill name", "title": "course title", "platform": "Udemy", "url": "https://udemy.com/..." }
  ]
}

Rules:
- missingSkills: up to 6 specific skills/technologies the resume lacks but the job needs
- strongSkills: up to 6 specific skills the resume clearly demonstrates that match the job
- courses: one recommended course per missing skill (max 5), use real platform names like Coursera, edX, LinkedIn Learning, YouTube, Udemy, freeCodeCamp. URLs should be plausible but may not be exact.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "{}";
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills.slice(0, 6) : [],
      strongSkills:  Array.isArray(result.strongSkills)  ? result.strongSkills.slice(0, 6)  : [],
      courses:       Array.isArray(result.courses)       ? result.courses.slice(0, 5)        : [],
    });
  } catch (err) {
    console.error("Skill gap API error:", err);
    return NextResponse.json({ missingSkills: [], strongSkills: [], courses: [] });
  }
}
