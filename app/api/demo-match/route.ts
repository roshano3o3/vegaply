import { NextResponse } from "next/server";

export const maxDuration = 30;

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Resets on cold start; upgrade to Upstash Redis for persistent limits.
const LIMIT    = 5;
const WINDOW   = 60 * 60 * 1000; // 1 hour in ms

interface RateEntry { count: number; resetAt: number }
const rateMap = new Map<string, RateEntry>();

function getIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

function checkRate(ip: string): boolean {
  const now  = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many demo requests. Please sign up to continue." },
      { status: 429 }
    );
  }

  try {
    const { resume, jobDescription } = await req.json();

    if (typeof resume !== "string" || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const prompt = `You are an expert ATS resume analyzer. Analyze this resume against the job description and return ONLY a valid JSON object — no markdown, no code fences, no commentary.

RESUME:
${resume.slice(0, 3000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

Return exactly this JSON shape (all fields required):
{
  "matchScore": 72,
  "skillsMatched": 12,
  "skillsTotal": 18,
  "keywordsFound": 8,
  "keywordsTotal": 15,
  "experienceFit": "Strong",
  "missingItems": ["TypeScript proficiency", "System design experience", "AWS certifications"],
  "tailoredBulletBefore": "Worked on backend systems and improved performance.",
  "tailoredBulletAfter": "Engineered distributed backend microservices in Node.js, reducing API latency by 40% across 2M+ daily active users."
}

Rules:
- matchScore: integer 0-100 reflecting genuine resume-to-JD fit
- skillsMatched / skillsTotal: realistic integers based on actual skill overlap
- keywordsFound / keywordsTotal: realistic integers for ATS keyword coverage
- experienceFit: exactly one of "Strong", "Moderate", or "Weak"
- missingItems: 2-4 specific skills or qualifications genuinely absent from the resume
- tailoredBulletBefore: copy one weak or vague bullet verbatim from the resume
- tailoredBulletAfter: rewrite it to be quantified, ATS-optimized, and job-specific`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic ${response.status}`);

    const data = await response.json();
    const raw = data?.content?.[0]?.text ?? "{}";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    // Extract the first complete JSON object
    let jsonStr = "{}";
    if (cleaned.startsWith("{")) {
      let depth = 0, end = -1;
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === "{") depth++;
        else if (cleaned[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      jsonStr = end !== -1 ? cleaned.slice(0, end + 1) : "{}";
    } else {
      const m = cleaned.match(/\{[\s\S]*?\}/);
      jsonStr = m ? m[0] : "{}";
    }

    const r = JSON.parse(jsonStr);

    const toInt = (v: unknown, fallback = 0): number => {
      const n = Number(v);
      return isNaN(n) ? fallback : Math.round(Math.max(0, n));
    };
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

    return NextResponse.json({
      matchScore:           clamp(toInt(r.matchScore, 50), 0, 100),
      skillsMatched:        toInt(r.skillsMatched, 8),
      skillsTotal:          toInt(r.skillsTotal, 15),
      keywordsFound:        toInt(r.keywordsFound, 6),
      keywordsTotal:        toInt(r.keywordsTotal, 12),
      experienceFit:        ["Strong", "Moderate", "Weak"].includes(r.experienceFit)
                              ? r.experienceFit : "Moderate",
      missingItems:         Array.isArray(r.missingItems)
                              ? r.missingItems.slice(0, 5).map(String)
                              : [],
      tailoredBulletBefore: typeof r.tailoredBulletBefore === "string"
                              ? r.tailoredBulletBefore : "",
      tailoredBulletAfter:  typeof r.tailoredBulletAfter === "string"
                              ? r.tailoredBulletAfter : "",
    });
  } catch (err) {
    console.error("demo-match error:", err);
    return NextResponse.json({ error: "analysis_failed" }, { status: 500 });
  }
}
