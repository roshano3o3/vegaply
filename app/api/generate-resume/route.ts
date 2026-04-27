import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const prompt = `You are an expert resume writer. Your ONLY job is to rephrase the candidate's existing resume content to match a job description. You CANNOT invent any new facts, numbers, achievements, or experiences.

CRITICAL RULES:
1. NEVER invent metrics, percentages, dollar amounts, or specific numbers that aren't already in the candidate's resume
2. NEVER add experience, skills, or accomplishments the candidate doesn't have
3. ONLY rephrase existing bullets to use job-relevant keywords
4. Preserve all factual content — names, company names, job titles, dates, real metrics
5. Keep all personal info (name, email, phone, education) EXACTLY as it appears
6. If the candidate's resume has weak content, leave it weak — don't fabricate

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2000) || "Not provided"}

CANDIDATE'S CURRENT RESUME (this is the ONLY source of truth):
${resumeText.slice(0, 4000)}

Now extract and rephrase the candidate's resume to better match this job. Return ONLY a JSON object with this exact structure, no preamble:
{
  "name": "candidate's actual name from resume",
  "email": "candidate's actual email from resume",
  "phone": "candidate's actual phone from resume",
  "location": "candidate's actual location from resume",
  "summary": "2-3 sentence professional summary using ONLY facts from their existing resume, rephrased to highlight relevant aspects for this job",
  "experience": [
    {
      "title": "exact job title from their resume",
      "company": "exact company name from their resume",
      "dates": "exact dates from their resume",
      "bullets": ["rephrased bullet using their actual achievements with job-relevant wording"]
    }
  ],
  "education": [
    {
      "degree": "exact degree from their resume",
      "school": "exact school from their resume",
      "dates": "exact dates"
    }
  ],
  "skills": ["only skills that exist in their resume, prioritize ones matching the job"],
  "keywords_added": ["job keywords successfully incorporated through rephrasing"],
  "ats_score_estimate": 85
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
