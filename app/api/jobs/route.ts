// FILE: app/api/jobs/route.ts
import { NextResponse } from "next/server";

// ── Normalised job shape shared by all sources ───────────────────────────────
interface NormalisedJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_city: string;
  job_state?: string;
  job_country: string;
  job_posted_at_timestamp: number;
  job_posted_at_datetime_utc: string | null;
  job_apply_link: string;
  job_description: string;
  job_employment_type: string;
  job_is_remote?: boolean;
  job_highlights?: { Qualifications?: string[]; Responsibilities?: string[]; Benefits?: string[] };
  source?: string;
  [key: string]: unknown; // allow JSearch passthrough fields
}

// ── SOURCE A: JSearch (5 pages) ──────────────────────────────────────────────
async function fetchJSearch(jobRole: string, location: string, earlyBird: boolean): Promise<NormalisedJob[]> {
  try {
    const apiKey = process.env.RAPIDAPI_KEY ?? "";
    console.log("[JSearch] API key present:", !!apiKey, "| earlyBird:", earlyBird);
    const dateFilter = earlyBird ? "today" : "all";
    const pageRequests = Array.from({ length: 5 }, (_, i) =>
      fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(jobRole)}%20${encodeURIComponent(location)}&page=${i + 1}&num_pages=1&date_posted=${dateFilter}&employment_types=FULLTIME%2CPARTTIME%2CCONTRACTOR`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
          next: { revalidate: 0 },
        }
      )
        .then(async r => {
          const json = await r.json();
          if (r.status === 429 || /exceeded|quota/i.test(JSON.stringify(json))) {
            console.log("[JSearch] Quota exceeded, skipping");
            return { data: [] };
          }
          if (!r.ok) console.error(`[JSearch] page ${i+1} HTTP ${r.status}:`, JSON.stringify(json).slice(0, 200));
          return json;
        })
        .catch(err => { console.error(`[JSearch] page ${i+1} fetch error:`, err); return { data: [] }; })
    );
    const pages = await Promise.all(pageRequests);
    const jobs: NormalisedJob[] = [];
    for (const page of pages) {
      if (page?.data && Array.isArray(page.data)) jobs.push(...page.data);
    }
    console.log("[JSearch] jobs fetched:", jobs.length);
    return jobs;
  } catch (err) {
    console.error("[JSearch] top-level error:", err);
    return [];
  }
}

// ── SOURCE B: Remotive ───────────────────────────────────────────────────────
async function fetchRemotive(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(jobRole)}&limit=100`,
      {
        next: { revalidate: 0 },
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
        },
      }
    );
    console.log("[Remotive] HTTP status:", res.status);
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: any[] = data?.jobs ?? [];
    console.log("[Remotive] jobs fetched:", jobs.length);
    return jobs.map(job => ({
      job_id: String(job.id),
      job_title: job.title,
      employer_name: job.company_name,
      employer_logo: job.company_logo ?? null,
      job_city: "Remote",
      job_country: "Worldwide",
      job_posted_at_timestamp: Math.floor(new Date(job.publication_date).getTime() / 1000),
      job_posted_at_datetime_utc: job.publication_date ?? null,
      job_apply_link: job.url,
      job_description: job.description ?? "",
      job_employment_type: job.job_type ?? "",
      job_is_remote: true,
      source: "remotive",
    }));
  } catch {
    return [];
  }
}

// ── SOURCE C: Greenhouse (5 companies) ──────────────────────────────────────
const GREENHOUSE_COMPANIES = ["stripe", "figma", "notion", "linear", "vercel"];

async function fetchGreenhouse(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const companyRequests = GREENHOUSE_COMPANIES.map(company =>
      fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
        { next: { revalidate: 3600 } } // greenhouse boards update infrequently
      )
        .then(r => r.json())
        .then(data => ({ company, jobs: data?.jobs ?? [] }))
        .catch(() => ({ company, jobs: [] }))
    );
    const results = await Promise.all(companyRequests);
    for (const { company, jobs } of results) {
      console.log(`[Greenhouse] ${company}: ${(jobs as any[]).length} jobs`);
    }
    const words = jobRole.toLowerCase().split(" ");
    const normalised: NormalisedJob[] = [];
    for (const { company, jobs } of results as { company: string; jobs: any[] }[]) {
      for (const job of jobs) {
        if (!words.some(word => word.length > 2 && job.title?.toLowerCase().includes(word))) continue;
        normalised.push({
          job_id: `${company}-${job.id}`,
          job_title: job.title,
          employer_name: company.charAt(0).toUpperCase() + company.slice(1),
          employer_logo: null,
          job_city: job.location?.name ?? "",
          job_country: "",
          job_posted_at_timestamp: job.updated_at
            ? Math.floor(new Date(job.updated_at).getTime() / 1000)
            : 0,
          job_posted_at_datetime_utc: job.updated_at ?? null,
          job_apply_link: job.absolute_url ?? "",
          job_description: job.content ?? "",
          job_employment_type: "",
          source: "greenhouse",
        });
      }
    }
    console.log("[Greenhouse] matching jobs fetched:", normalised.length);
    return normalised;
  } catch {
    return [];
  }
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobRole, location, earlyBird = false } = body;

    if (!jobRole || !location) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // Fetch all 3 sources in parallel; each has its own error boundary
    const [jsearchJobs, remotiveJobs, greenhouseJobs] = await Promise.all([
      fetchJSearch(jobRole, location, earlyBird),
      fetchRemotive(jobRole),
      fetchGreenhouse(jobRole),
    ]);

    console.log('JSearch jobs:', jsearchJobs.length);
    console.log('Remotive jobs:', remotiveJobs.length);
    console.log('Greenhouse jobs:', greenhouseJobs.length);

    // Combine
    const allJobs: NormalisedJob[] = [...jsearchJobs, ...remotiveJobs, ...greenhouseJobs];
    console.log('Total combined:', allJobs.length);

    // Deduplicate by job_id
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      const id = String(j.job_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Sort newest first
    uniqueJobs.sort((a, b) => {
      const ta = a.job_posted_at_datetime_utc
        ? new Date(a.job_posted_at_datetime_utc).getTime()
        : (a.job_posted_at_timestamp ?? 0) * 1000;
      const tb = b.job_posted_at_datetime_utc
        ? new Date(b.job_posted_at_datetime_utc).getTime()
        : (b.job_posted_at_timestamp ?? 0) * 1000;
      return tb - ta;
    });

    // Cap at 500
    const finalJobs = uniqueJobs.slice(0, 500);

    console.log('[Jobs] Total returned to client:', finalJobs.length);
    return NextResponse.json({ data: finalJobs, total: finalJobs.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
