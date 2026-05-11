import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();
    if (!resumeText) return NextResponse.json({ error: "No resume text" }, { status: 400 });

    const prompt = `You are an expert ATS (Applicant Tracking System) and career coach. Analyze this resume and return ONLY a JSON object with no markdown, no code blocks, no explanation.

Be strict and harsh. Most resumes have real weaknesses. A weak resume should score 30-50. A resume missing an education section scores maximum 60. A resume with no quantified achievements (numbers, percentages, dollar amounts) scores maximum 65. Only exceptional, complete, polished resumes with strong metrics, clean formatting, and comprehensive content should score above 85. Average resumes score 50-70. Be realistic — do not be generous.

Keep all feedback strings under 100 characters. Limit strengths and improvements to 3 items each, redFlags to 2 items. Return ONLY valid JSON, no preamble.

RESUME:
${resumeText.slice(0, 4000)}

Return exactly this JSON (all fields required, all scores must be integers 0-100):
{
  "atsScore": 0,
  "overallScore": 0,
  "breakdown": {
    "contactInfo": { "score": 0, "passed": false, "feedback": "" },
    "workExperience": { "score": 0, "passed": false, "feedback": "" },
    "education": { "score": 0, "passed": false, "feedback": "" },
    "skills": { "score": 0, "passed": false, "feedback": "" },
    "achievements": { "score": 0, "passed": false, "feedback": "" },
    "length": { "score": 0, "passed": false, "feedback": "" },
    "actionVerbs": { "score": 0, "passed": false, "feedback": "" },
    "keywords": { "score": 0, "passed": false, "feedback": "" }
  },
  "strengths": [],
  "improvements": [],
  "redFlags": []
}`;

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
    const raw = data?.content?.[0]?.text ?? "{}";
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const toInt = (v: unknown) => {
      const n = typeof v === "string" ? parseFloat(v) : Number(v);
      return isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
    };
    const safeSub = (key: string) => ({
      score: toInt(result.breakdown?.[key]?.score),
      passed: result.breakdown?.[key]?.passed === true,
      feedback: typeof result.breakdown?.[key]?.feedback === "string" ? result.breakdown[key].feedback : "",
    });

    return NextResponse.json({
      atsScore: toInt(result.atsScore),
      overallScore: toInt(result.overallScore),
      breakdown: {
        contactInfo:    safeSub("contactInfo"),
        workExperience: safeSub("workExperience"),
        education:      safeSub("education"),
        skills:         safeSub("skills"),
        achievements:   safeSub("achievements"),
        length:         safeSub("length"),
        actionVerbs:    safeSub("actionVerbs"),
        keywords:       safeSub("keywords"),
      },
      strengths:           Array.isArray(result.strengths)    ? result.strengths    : [],
      improvements:        Array.isArray(result.improvements) ? result.improvements : [],
      redFlags:            Array.isArray(result.redFlags)     ? result.redFlags     : [],
      atsKeywordsFound:    [],
      atsKeywordsMissing:  [],
      estimatedExperience: "",
      recommendedRoles:    [],
    });
  } catch (err) {
    console.error("Resume score API error:", err);
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}
