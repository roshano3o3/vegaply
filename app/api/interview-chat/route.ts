import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

async function callClaude(prompt: string, maxTokens: number) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return (
    data?.completion ??
    data?.output_text ??
    data?.text ??
    data?.content?.[0]?.text ??
    data?.message?.content ??
    ""
  );
}

function parseJsonPayload<T>(text: string): T | null {
  if (!text) return null;
  const candidate = text.trim();
  const jsonMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, job, question, questionType, answer, allQA } = body;

    // ── Generate 5 questions ──────────────────────────────────────────────
    if (action === "start") {
      const prompt = `You are an expert technical recruiter conducting a mock interview for a ${job.job_title} position at ${job.employer_name}.

JOB DESCRIPTION: ${(job.job_description ?? "").slice(0, 1200)}
KEY QUALIFICATIONS: ${job.job_highlights?.Qualifications?.slice(0, 5).join("; ") ?? ""}

Generate exactly 5 interview questions. Mix 3 behavioral and 2 technical. Make them specific to this role.

Return ONLY valid JSON array (no markdown):
[
  { "question": "full question text", "type": "Behavioral", "focus": "short topic e.g. Leadership" },
  { "question": "...", "type": "Technical", "focus": "e.g. System Design" }
]`;

      const text = await callClaude(prompt, 800);
      const questions = parseJsonPayload<any[]>(text) ?? [];
      return NextResponse.json({ questions });
    }

    // ── Evaluate a single answer ──────────────────────────────────────────
    if (action === "evaluate") {
      const prompt = `You are an expert interviewer evaluating a candidate's answer for a ${job.job_title} role at ${job.employer_name}.

Question type: ${questionType ?? "Behavioral"}
Question: "${question}"
Candidate's answer: "${answer || "(no answer given)"}"

Evaluate this answer. Be direct and constructive.

Return ONLY valid JSON (no markdown):
{
  "score": <integer 1-10>,
  "verdict": "<one punchy sentence summarizing the answer quality>",
  "strengths": ["<what they did well, be specific>", "<another strength if applicable>"],
  "improvements": ["<concrete actionable tip>", "<another tip if applicable>"],
  "betterAnswer": "<one sentence on what would make this answer excellent>"
}

Scoring guide: 9-10=exceptional, 7-8=solid, 5-6=adequate, 3-4=weak, 1-2=missing the point.`;

      const text = await callClaude(prompt, 600);
      const feedback = parseJsonPayload<any>(text) ?? {
        score: 5,
        verdict: "Answer received.",
        strengths: [],
        improvements: ["Provide more specific examples."],
        betterAnswer: "Add a concrete example with measurable results.",
      };
      return NextResponse.json({ feedback });
    }

    // ── Generate overall summary ──────────────────────────────────────────
    if (action === "summary") {
      const avgScore = allQA.reduce((s: number, qa: any) => s + (Number(qa.score) || 0), 0) / Math.max(allQA.length, 1);
      const scoreList = allQA.map((qa: any, i: number) => `Q${i + 1} (${qa.type}): ${qa.score}/10`).join(", ");

      const prompt = `You are summarizing a mock interview for a ${job.job_title} role at ${job.employer_name}.

Per-question scores: ${scoreList}
Average score: ${avgScore.toFixed(1)}/10

Generate a brief, honest post-interview summary. Return ONLY valid JSON (no markdown):
{
  "overallScore": <integer 1-100, scale the ${avgScore.toFixed(1)} average appropriately>,
  "verdict": "<1–2 sentence honest verdict on interview performance>",
  "strengths": ["<key strength 1>", "<key strength 2>", "<key strength 3>"],
  "improvements": ["<area to improve 1>", "<area to improve 2>"],
  "recommendation": "<one of: Strong Hire / Hire / Borderline / Needs More Prep / Not Ready>"
}`;

      const text = await callClaude(prompt, 500);
      const summary = parseJsonPayload<any>(text) ?? {
        overallScore: Math.round(avgScore * 10),
        verdict: "Interview complete.",
        strengths: ["Completed all questions"],
        improvements: ["Continue practicing"],
        recommendation: "Needs More Prep",
      };
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("interview-chat error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
