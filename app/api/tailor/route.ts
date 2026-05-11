import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { resumeText, job } = await req.json();

    const prompt = `You are a resume tailoring expert. Return ONLY valid JSON (no markdown, no explanation).

Resume:
${resumeText?.slice(0, 3000)}

Job Title: ${job.job_title}
Company: ${job.employer_name}
Description: ${job.job_description?.slice(0, 2000)}

Return this exact JSON:
{
  "tailoredBullets": [
    {
      "original": "original bullet from resume",
      "tailored": "rewritten bullet using job keywords",
      "reason": "why this change helps"
    }
  ],
  "keywordsAdded": ["keyword1","keyword2","keyword3"],
  "atsTip": "one specific ATS tip for this job"
}

Pick 3 resume bullets to rewrite. Focus on matching the job's language.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ tailoredBullets: [], keywordsAdded: [], atsTip: "Could not tailor resume." });
  }
}
4