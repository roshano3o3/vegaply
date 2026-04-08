// FILE: app/api/interview/route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { job, resumeText } = await req.json();

    const prompt = `You are an expert interview coach. Generate interview preparation content for this specific job.

Job Title: ${job.job_title}
Company: ${job.employer_name}
Description: ${job.job_description?.slice(0, 2000) ?? ""}
Qualifications: ${job.job_highlights?.Qualifications?.join(", ") ?? ""}
${resumeText ? `Candidate Resume:\n${resumeText.slice(0, 2000)}` : ""}

Return ONLY valid JSON (no markdown, no explanation):
{
  "likelyQuestions": [
    {
      "question": "Tell me about yourself",
      "category": "Behavioral",
      "tip": "Focus on your most relevant experience for this role",
      "sampleAnswer": "A 2-3 sentence strong sample answer tailored to this job"
    }
  ],
  "technicalQuestions": [
    {
      "question": "technical question based on job requirements",
      "category": "Technical",
      "tip": "what to focus on",
      "sampleAnswer": "brief ideal answer"
    }
  ],
  "questionsToAsk": [
    "Smart question candidate should ask the interviewer"
  ],
  "keyThemes": ["theme1", "theme2", "theme3"],
  "redFlags": ["thing to avoid saying/doing in this interview"]
}

Generate 5 behavioral questions, 4 technical questions, 4 questions to ask, 4 key themes, 3 red flags.`;

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
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { likelyQuestions: [], technicalQuestions: [], questionsToAsk: [], keyThemes: [], redFlags: [] },
      { status: 500 }
    );
  }
}