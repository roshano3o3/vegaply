import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    if (!resumeText || !job) {
      return NextResponse.json({ error: "Missing resumeText or job" }, { status: 400 });
    }

    const prompt = `You are an expert resume writer. Your job is to rephrase a candidate's existing resume content to better match a job description — WITHOUT removing or inventing anything.

ABSOLUTE RULES:
1. PRESERVE every job, project, certification, skill, and bullet point from their resume
2. NEVER invent metrics, percentages, dollar amounts, or specific numbers
3. NEVER add experience, skills, or accomplishments not already in their resume
4. ONLY rephrase existing bullets using job-relevant keywords from the job description
5. Keep ALL personal info exactly as it appears (name, email, phone, location)
6. If their resume has 5 jobs, keep all 5. If it has 3 projects, keep all 3.
7. Skills section: keep all their existing skills, prioritize ordering by job relevance

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2500) || "Not provided"}

CANDIDATE'S FULL RESUME (this is the ONLY source of truth — extract EVERYTHING):
${resumeText.slice(0, 6000)}

Return ONLY a JSON object with this exact structure, no preamble. Include ALL sections the candidate has — if they have projects include projects array, if they have certifications include certifications array. Do NOT skip sections:

{
  "name": "candidate's actual name",
  "email": "candidate's actual email",
  "phone": "candidate's actual phone",
  "location": "candidate's actual location",
  "summary": "2-3 sentence summary using ONLY their real background, rephrased for this job",
  "experience": [
    {
      "title": "exact title",
      "company": "exact company",
      "dates": "exact dates",
      "bullets": ["all their actual bullets, rephrased with job keywords"]
    }
  ],
  "projects": [
    {
      "name": "exact project name",
      "description": "their actual description, rephrased with job keywords",
      "tech": ["technologies they listed"]
    }
  ],
  "education": [
    {
      "degree": "exact degree",
      "school": "exact school",
      "dates": "exact dates"
    }
  ],
  "certifications": ["all their exact certifications"],
  "skills": ["all their skills, ordered by job relevance"],
  "keywords_added": ["job keywords incorporated through rephrasing"],
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
