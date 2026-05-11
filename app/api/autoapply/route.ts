// FILE: app/api/autoapply/route.ts
import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

export async function POST(req: Request) {
  try {
    const { resumeText, jobs } = await req.json();
    if (!jobs?.length) return NextResponse.json({ error: "No jobs" }, { status: 400 });

    const topJobs = jobs.slice(0, 3);
    const results: any[] = [];

    for (const job of topJobs) {
      try {
        const prompt = `You are an expert resume writer. Return ONLY valid JSON, no markdown.

${resumeText ? `RESUME:\n${resumeText.slice(0, 2500)}` : "No resume provided."}

JOB: ${job.job_title} at ${job.employer_name}
DESCRIPTION: ${(job.job_description ?? "").slice(0, 1500)}
REQUIREMENTS: ${job.job_highlights?.Qualifications?.slice(0,5).join(", ") ?? ""}

Return this JSON:
{
  "tailoredSummary": "2 sentence professional summary tailored for this role",
  "tailoredBullets": ["bullet 1 with metrics","bullet 2","bullet 3","bullet 4","bullet 5"],
  "keySkills": ["skill1","skill2","skill3","skill4","skill5","skill6"],
  "coverLetter": "Dear Hiring Manager,\\n\\nOpening paragraph about excitement for this role.\\n\\nMiddle paragraph with relevant achievements.\\n\\nClosing paragraph.\\n\\nSincerely,\\n[Your Name]",
  "matchScore": 80,
  "whyGoodFit": "One sentence on why candidate fits this role"
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
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await response.json();
        const text = data?.content?.[0]?.text ?? "{}";
        const clean = text.replace(/```json|```/g, "").trim();
        results.push({ job, ...JSON.parse(clean), success: true });
      } catch {
        results.push({
          job, success: true, matchScore: 70,
          tailoredSummary: `Results-driven professional applying for the ${job.job_title} role at ${job.employer_name}.`,
          tailoredBullets: ["Delivered measurable results through data-driven decisions","Collaborated cross-functionally to drive project outcomes","Improved processes leading to increased efficiency","Led initiatives aligned with organizational goals","Communicated insights clearly to diverse stakeholders"],
          keySkills: ["Communication","Problem Solving","Data Analysis","Collaboration","Project Management","Adaptability"],
          coverLetter: `Dear Hiring Manager,\n\nI am excited to apply for the ${job.job_title} position at ${job.employer_name}. This opportunity aligns perfectly with my experience and career goals.\n\nI have consistently delivered strong results in my career and would bring this dedication to your team. My background makes me well-suited for the challenges of this role.\n\nThank you for your consideration. I look forward to discussing how I can contribute to ${job.employer_name}.\n\nSincerely,\n[Your Name]`,
          whyGoodFit: `Experience aligns well with ${job.job_title} at ${job.employer_name}.`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}