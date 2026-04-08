import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    const prompt = `You are an expert interview coach. Analyze this job posting and resume, then return ONLY valid JSON with no markdown or explanation.

JOB TITLE: ${job.job_title}
COMPANY: ${job.employer_name}
JOB DESCRIPTION: ${job.job_description?.slice(0, 2000)}
QUALIFICATIONS: ${job.job_highlights?.Qualifications?.join(", ") ?? ""}

RESUME:
${resumeText?.slice(0, 2000) ?? "Not provided"}

Return exactly this JSON structure:
{
  "likelyQuestions": [
    {"question": "Tell me about yourself", "category": "Behavioral", "tip": "Focus on relevant experience", "sampleAnswer": "2-3 sentence answer"}
  ],
  "technicalQuestions": [
    {"question": "Technical question here", "category": "Technical", "tip": "Show your process", "sampleAnswer": "2-3 sentence answer"}
  ],
  "questionsToAsk": ["Question you should ask the interviewer"],
  "keyThemes": ["Theme 1", "Theme 2"],
  "redFlags": ["Potential concern to address"]
}

Include 4 likelyQuestions, 3 technicalQuestions, 3 questionsToAsk, 3 keyThemes, 2 redFlags.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "{}";
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      likelyQuestions: Array.isArray(result.likelyQuestions) ? result.likelyQuestions : [],
      technicalQuestions: Array.isArray(result.technicalQuestions) ? result.technicalQuestions : [],
      questionsToAsk: Array.isArray(result.questionsToAsk) ? result.questionsToAsk : [],
      keyThemes: Array.isArray(result.keyThemes) ? result.keyThemes : [],
      redFlags: Array.isArray(result.redFlags) ? result.redFlags : [],
    });
  } catch (err) {
    console.error("Interview API error:", err);
    return NextResponse.json({
      likelyQuestions: [],
      technicalQuestions: [],
      questionsToAsk: [],
      keyThemes: [],
      redFlags: [],
    });
  }
}