/**
 * Shared helper: generate tailored_resume_text + cover_letter_text for one job.
 *
 * Called by:
 *   - app/api/daily-queue/process/route.ts  (queue processor)
 *
 * Outputs plain text for both columns so the future apply step can use them
 * directly without parsing JSON.
 */

import { CLAUDE_MODEL } from "@/lib/ai/config";

interface Job {
  job_title:       string;
  employer_name:   string;
  job_description: string;
}

interface GenerateInput {
  resumeText: string;
  job:        Job;
}

interface GenerateOutput {
  tailored_resume_text: string;
  cover_letter_text:    string;
}

// Robust JSON extractor — handles markdown fences and truncated tail content.
function extractJson(raw: string): Record<string, unknown> {
  const clean = raw.replace(/```json|```/g, "").trim();
  const s = clean.startsWith("{") ? clean : (clean.match(/\{[\s\S]*/)?.[0] ?? "{}");

  // Walk braces to find the outermost closing brace
  let depth = 0;
  let end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  try {
    return JSON.parse(end !== -1 ? s.slice(0, end + 1) : s);
  } catch {
    return {};
  }
}

export async function generateApplicationContent(
  input: GenerateInput,
): Promise<GenerateOutput> {
  const { resumeText, job } = input;

  const prompt = `You are an expert resume writer. Return ONLY valid JSON, no markdown, no explanation.

RESUME:
${resumeText.slice(0, 2500)}

JOB: ${job.job_title} at ${job.employer_name}
DESCRIPTION: ${job.job_description.slice(0, 1500)}

Return exactly this JSON:
{
  "tailored_resume_text": "Professional Summary:\\n[2-3 sentences using only facts from the resume, rephrased for this specific job]\\n\\nKey Achievements:\\n• [top achievement from resume, rephrased with job-relevant keywords]\\n• [second achievement]\\n• [third achievement]\\n\\nKey Skills: [5-6 most relevant skills from resume, comma-separated]",
  "cover_letter_text": "Dear Hiring Manager,\\n\\n[Opening: 2 sentences expressing genuine interest in the ${job.job_title} role at ${job.employer_name} and one specific reason why.]\\n\\n[Middle: 2-3 sentences highlighting the most relevant achievement from the resume with a concrete outcome.]\\n\\nThank you for your consideration. I look forward to the opportunity to discuss how my background fits your team's needs.\\n\\nSincerely,\\n[Your Name]"
}

Rules:
- Do NOT invent metrics, percentages, or any fact not present in the resume.
- Rephrase only — never fabricate new experience or skills.
- Keep tailored_resume_text under 400 words.
- Keep cover_letter_text under 200 words.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      CLAUDE_MODEL,
      max_tokens: 1500,
      messages:   [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data  = await response.json();
  const text  = (data?.content?.[0]?.text ?? "") as string;
  const result = extractJson(text);

  const resumeOut  = typeof result.tailored_resume_text === "string" ? result.tailored_resume_text.trim() : "";
  const letterOut  = typeof result.cover_letter_text    === "string" ? result.cover_letter_text.trim()    : "";

  if (!resumeOut || !letterOut) {
    throw new Error(`Incomplete AI output — got ${JSON.stringify(Object.keys(result))}`);
  }

  return {
    tailored_resume_text: resumeOut,
    cover_letter_text:    letterOut,
  };
}
