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
  [key: string]: unknown;
}

// ── SOURCE A: Adzuna (primary — 10 pages × 50 = up to 500 results) ───────────
async function fetchAdzuna(jobRole: string, location: string, earlyBird: boolean): Promise<NormalisedJob[]> {
  try {
    const appId = process.env.ADZUNA_APP_ID ?? "";
    const appKey = process.env.ADZUNA_APP_KEY ?? "";
    if (!appId || !appKey) {
      console.log("[Adzuna] No credentials, skipping");
      return [];
    }
    // max_days_old=1 restricts results to the last 24 h (Adzuna's early-bird equivalent)
    const earlyBirdParam = earlyBird ? "&max_days_old=1" : "";
    const pageRequests = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(page =>
      fetch(
        `https://api.adzuna.com/v1/api/jobs/us/search/${page}` +
        `?app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=50` +
        `&what=${encodeURIComponent(jobRole)}` +
        `&where=${encodeURIComponent(location)}` +
        `&content-type=application/json` +
        earlyBirdParam,
        { next: { revalidate: 0 } }
      )
        .then(async r => {
          if (!r.ok) {
            console.error(`[Adzuna] page ${page} HTTP ${r.status}`);
            return [];
          }
          const data = await r.json();
          return data?.results ?? [];
        })
        .catch(err => {
          console.error(`[Adzuna] page ${page} error:`, err);
          return [];
        })
    );
    const pages = await Promise.all(pageRequests);
    const jobs: any[] = pages.flat();
    console.log("[Adzuna] jobs fetched:", jobs.length);
    return jobs.map(job => ({
      job_id: `adzuna-${job.id}`,
      job_title: job.title,
      employer_name: job.company?.display_name || "",
      employer_logo: null,
      job_city: job.location?.display_name || "",
      job_country: "US",
      job_posted_at_timestamp: job.created
        ? Math.floor(new Date(job.created).getTime() / 1000)
        : 0,
      job_posted_at_datetime_utc: job.created ?? null,
      job_apply_link: job.redirect_url ?? "",
      job_description: job.description ?? "",
      job_employment_type: job.contract_time || "",
      source: "adzuna",
    }));
  } catch (err) {
    console.error("[Adzuna] error:", err);
    return [];
  }
}

// ── SOURCE B: Remotive ───────────────────────────────────────────────────────
async function fetchRemotive(jobRole: string, location: string): Promise<NormalisedJob[]> {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?limit=300&category=software-dev`,
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
    const mapped: NormalisedJob[] = jobs.map(job => ({
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
    const roleLower = (jobRole || '').toLowerCase().trim();
    const filtered = roleLower
      ? mapped.filter(j => j.job_title?.toLowerCase().includes(roleLower))
      : mapped;
    console.log("[Remotive] jobs after role filter:", filtered.length);
    const locLower = (location || '').toLowerCase().trim();
    const wantsUS = ['us', 'usa', 'united states', 'u.s.', 'u.s.a'].includes(locLower)
      || locLower === '';

    // Remotive jobs are remote by default (Worldwide), which generally works for US users
    // Keep Remotive jobs if user wants US or typed no location
    const locationFiltered = wantsUS
      ? filtered
      : filtered.filter(j => {
          const city = (j.job_city || '').toLowerCase();
          return city.includes(locLower) || city.includes('remote');
        });

    console.log("[Remotive] jobs after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch {
    return [];
  }
}

// ── SOURCE C: Greenhouse (5 companies) ──────────────────────────────────────
const GREENHOUSE_COMPANIES = ["stripe", "figma", "notion", "linear", "vercel"];

async function fetchGreenhouse(jobRole: string, location: string): Promise<NormalisedJob[]> {
  try {
    const companyRequests = GREENHOUSE_COMPANIES.map(company =>
      fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
        { next: { revalidate: 3600 } }
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
    console.log("[Greenhouse] jobs fetched:", normalised.length);
    const roleLower = (jobRole || '').toLowerCase().trim();
    const filtered = roleLower
      ? normalised.filter(j => j.job_title?.toLowerCase().includes(roleLower))
      : normalised;
    console.log("[Greenhouse] jobs after role filter:", filtered.length);
    const locLower = (location || '').toLowerCase().trim();

    // Determine if user wants US jobs specifically
    const wantsUS = ['us', 'usa', 'united states', 'u.s.', 'u.s.a'].includes(locLower)
      || locLower === '';

    // If user typed a specific city/state, filter by that
    const locationFiltered = locLower && !wantsUS
      ? filtered.filter(j => (j.job_city || '').toLowerCase().includes(locLower))
      : wantsUS
        ? filtered.filter(j => {
            const city = (j.job_city || '').toLowerCase();
            // Keep if location mentions US cities, states, "us", "remote", or empty
            const usIndicators = [
              'us', 'usa', 'united states', 'u.s.',
              'new york', 'san francisco', 'seattle', 'chicago', 'los angeles',
              'austin', 'boston', 'denver', 'atlanta', 'miami', 'dallas',
              'houston', 'phoenix', 'philadelphia', 'washington', 'portland',
              'nashville', 'charlotte', 'remote'
            ];
            if (!city) return false;
            return usIndicators.some(ind => city.includes(ind));
          })
        : filtered;

    console.log("[Greenhouse] jobs after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch {
    return [];
  }
}

// ── SOURCE D: The Muse ────────────────────────────────────────────────────────
async function fetchTheMuse(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const pageRequests = [0, 1, 2, 3, 4].map(page =>
      fetch(
        `https://www.themuse.com/api/public/jobs?page=${page}&descending=true`,
        { next: { revalidate: 0 } }
      )
        .then(async r => {
          if (!r.ok) { console.error(`[TheMuse] page ${page} HTTP ${r.status}`); return []; }
          const data = await r.json();
          return data?.results ?? [];
        })
        .catch(err => { console.error(`[TheMuse] page ${page} error:`, err); return []; })
    );
    const pages = await Promise.all(pageRequests);
    const jobs: any[] = pages.flat();
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

// ── SOURCE E: Arbeitnow ───────────────────────────────────────────────────────
async function fetchArbeitnow(jobRole: string): Promise<NormalisedJob[]> {
  try {
    const pageRequests = [1, 2, 3].map(page =>
      fetch(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        { next: { revalidate: 0 } }
      )
        .then(async r => {
          if (!r.ok) { console.error(`[Arbeitnow] page ${page} HTTP ${r.status}`); return []; }
          const data = await r.json();
          return data?.data ?? [];
        })
        .catch(err => { console.error(`[Arbeitnow] page ${page} error:`, err); return []; })
    );
    const pages = await Promise.all(pageRequests);
    const jobs: any[] = pages.flat();
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

    // Fetch all sources in parallel; each has its own error boundary
    const [adzunaJobs, remotiveJobs, greenhouseJobs, themuseJobs, arbeitnowJobs] = await Promise.all([
      fetchAdzuna(jobRole, location, earlyBird),
      fetchRemotive(jobRole, location),
      fetchGreenhouse(jobRole, location),
      fetchTheMuse(jobRole),
      fetchArbeitnow(jobRole),
    ]);

    console.log("Adzuna jobs:", adzunaJobs.length);
    console.log("Remotive jobs:", remotiveJobs.length);
    console.log("Greenhouse jobs:", greenhouseJobs.length);
    console.log("TheMuse jobs:", themuseJobs.length);
    console.log("Arbeitnow jobs:", arbeitnowJobs.length);

    // Combine
    const allJobs: NormalisedJob[] = [
      ...adzunaJobs,
      ...remotiveJobs,
      ...greenhouseJobs,
      ...themuseJobs,
      ...arbeitnowJobs,
    ];
    console.log("Total combined:", allJobs.length);

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

    let finalJobs: NormalisedJob[];
    if (earlyBird) {
      // Early Bird: only jobs posted in the last 24 hours
      // Adzuna already filtered server-side via max_days_old=1;
      // this client-side pass catches any non-Adzuna sources that slipped through.
      const cutoff = Math.floor(Date.now() / 1000) - 86400;
      finalJobs = uniqueJobs.filter(j => (j.job_posted_at_timestamp ?? 0) > cutoff);
      console.log("[Jobs] Early Bird — jobs within 24h:", finalJobs.length);
    } else {
      finalJobs = uniqueJobs.slice(0, 2000);
    }

    console.log("[Jobs] Final total:", finalJobs.length);
    return NextResponse.json({ data: finalJobs, total: finalJobs.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
