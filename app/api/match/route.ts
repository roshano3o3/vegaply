import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    const prompt = `You are an expert ATS resume analyzer. Analyze this resume against the job posting and return ONLY a valid JSON object with no markdown, no code blocks, no explanation.

RESUME:
${resumeText?.slice(0, 3000)}

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2000)}
REQUIRED QUALIFICATIONS: ${job.job_highlights?.Qualifications?.join(", ") ?? ""}

Return exactly this JSON (all fields required, matchScore must be an integer 0-100):
{"matchScore":75,"matchLabel":"Strong","matchSummary":"Two sentence summary of fit.","matchedSkills":["skill1","skill2","skill3"],"missingSkills":["skill1","skill2"],"coverLetter":"Short 3 sentence personalized cover letter."}`;

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
    const text = data?.content?.[0]?.text ?? "{}";
    console.log("Claude raw:", text.slice(0, 200));
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const toInt = (v: any) => {
      const n = typeof v === "string" ? parseFloat(v) : Number(v);
      return isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
    };

    return NextResponse.json({
      matchScore:       toInt(result.matchScore),
      matchLabel:       result.matchLabel ?? "Low",
      matchSummary:     result.matchSummary ?? "Unable to analyze.",
      matchedSkills:    Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
      missingSkills:    Array.isArray(result.missingSkills) ? result.missingSkills : [],
      coverLetter:      result.coverLetter ?? "",
      atsScore:         0,
      atsKeywordsFound: [],
      atsKeywordsMissing: [],
      topTip:           "",
    });
  } catch (err) {
    console.error("Match API error:", err);
    return NextResponse.json({
      matchScore: 0, atsScore: 0, matchLabel: "Low", matchSummary: "Unable to analyze.",
      matchedSkills: [], missingSkills: [], atsKeywordsFound: [], atsKeywordsMissing: [],
      topTip: "", coverLetter: "",
    });
  }
}