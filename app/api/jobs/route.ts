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
async function fetchRemotive(): Promise<NormalisedJob[]> {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?limit=100&category=software-dev`,
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

async function fetchGreenhouse(): Promise<NormalisedJob[]> {
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
    const normalised: NormalisedJob[] = [];
    for (const { company, jobs } of results as { company: string; jobs: any[] }[]) {
      for (const job of jobs) {
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

// ── SOURCE D: Adzuna ─────────────────────────────────────────────────────────
async function fetchAdzuna(jobRole: string, location: string): Promise<NormalisedJob[]> {
  try {
    const appId = process.env.ADZUNA_APP_ID ?? "";
    const appKey = process.env.ADZUNA_APP_KEY ?? "";
    if (!appId || !appKey) { console.log("[Adzuna] No credentials, skipping"); return []; }
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(jobRole)}&where=${encodeURIComponent(location)}&content-type=application/json`,
      { next: { revalidate: 0 } }
    );
    console.log("[Adzuna] HTTP status:", res.status);
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: any[] = data?.results ?? [];
    console.log("[Adzuna] jobs fetched:", jobs.length);
    return jobs.map(job => ({
      job_id: `adzuna-${job.id}`,
      job_title: job.title,
      employer_name: job.company?.display_name || "",
      employer_logo: null,
      job_city: job.location?.display_name || "",
      job_country: "US",
      job_posted_at_timestamp: Math.floor(new Date(job.created).getTime() / 1000),
      job_posted_at_datetime_utc: job.created,
      job_apply_link: job.redirect_url,
      job_description: job.description,
      job_employment_type: job.contract_time || "",
      source: "adzuna",
    }));
  } catch (err) {
    console.error("[Adzuna] error:", err);
    return [];
  }
}

// ── SOURCE E: The Muse ────────────────────────────────────────────────────────
async function fetchTheMuse(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const res = await fetch(
      `https://www.themuse.com/api/public/jobs?page=1&descending=true`,
      { next: { revalidate: 0 } }
    );
    console.log("[TheMuse] HTTP status:", res.status);
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: any[] = data?.results ?? [];
    const roleLower = jobRole.toLowerCase();
    const filtered = jobs.filter(job => job.name?.toLowerCase().includes(roleLower));
    console.log("[TheMuse] jobs fetched:", jobs.length, "| matching:", filtered.length);
    return filtered.map(job => ({
      job_id: `themuse-${job.id}`,
      job_title: job.name,
      employer_name: job.company?.name || "",
      employer_logo: null,
      job_city: job.locations?.[0]?.name || "",
      job_country: "",
      job_posted_at_timestamp: job.publication_date
        ? Math.floor(new Date(job.publication_date).getTime() / 1000)
        : 0,
      job_posted_at_datetime_utc: job.publication_date ?? null,
      job_apply_link: job.refs?.landing_page || "",
      job_description: job.contents ?? "",
      job_employment_type: job.type ?? "",
      source: "themuse",
    }));
  } catch (err) {
    console.error("[TheMuse] error:", err);
    return [];
  }
}

// ── SOURCE F: Arbeitnow ───────────────────────────────────────────────────────
async function fetchArbeitnow(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const res = await fetch(
      `https://www.arbeitnow.com/api/job-board-api`,
      { next: { revalidate: 0 } }
    );
    console.log("[Arbeitnow] HTTP status:", res.status);
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: any[] = data?.data ?? [];
    const roleLower = jobRole.toLowerCase();
    const filtered = jobs.filter(job => job.title?.toLowerCase().includes(roleLower));
    console.log("[Arbeitnow] jobs fetched:", jobs.length, "| matching:", filtered.length);
    return filtered.map(job => ({
      job_id: `arbeitnow-${job.slug}`,
      job_title: job.title,
      employer_name: job.company_name || "",
      employer_logo: null,
      job_city: job.location || "",
      job_country: "",
      job_posted_at_timestamp: job.created_at ?? 0,
      job_posted_at_datetime_utc: job.created_at
        ? new Date(job.created_at * 1000).toISOString()
        : null,
      job_apply_link: job.url || "",
      job_description: job.description ?? "",
      job_employment_type: job.job_types?.[0] ?? "",
      job_is_remote: job.remote ?? false,
      source: "arbeitnow",
    }));
  } catch (err) {
    console.error("[Arbeitnow] error:", err);
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

    // Fetch all 6 sources in parallel; each has its own error boundary
    const [jsearchJobs, remotiveJobs, greenhouseJobs, adzunaJobs, themuseJobs, arbeitnowJobs] = await Promise.all([
      fetchJSearch(jobRole, location, earlyBird),
      fetchRemotive(),
      fetchGreenhouse(),
      fetchAdzuna(jobRole, location),
      fetchTheMuse(jobRole),
      fetchArbeitnow(jobRole),
    ]);

    console.log('JSearch jobs:', jsearchJobs.length);
    console.log('Remotive jobs:', remotiveJobs.length);
    console.log('Greenhouse jobs:', greenhouseJobs.length);
    console.log('Adzuna jobs:', adzunaJobs.length);
    console.log('TheMuse jobs:', themuseJobs.length);
    console.log('Arbeitnow jobs:', arbeitnowJobs.length);

    // Combine
    const allJobs: NormalisedJob[] = [...jsearchJobs, ...remotiveJobs, ...greenhouseJobs, ...adzunaJobs, ...themuseJobs, ...arbeitnowJobs];
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

    console.log('[Jobs] Remotive count:', remotiveJobs.length);
    console.log('[Jobs] Greenhouse count:', greenhouseJobs.length);
    console.log('[Jobs] Final total:', finalJobs.length);
    return NextResponse.json({ data: finalJobs, total: finalJobs.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
