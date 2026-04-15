// FILE: app/api/jobs/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobRole, location, earlyBird = false } = body;

    const dateFilter = earlyBird ? "today" : "all";
    const pagesToFetch = earlyBird ? 5 : 3; // 5 pages in earlybird = up to 50 jobs

    const pageRequests = Array.from({ length: pagesToFetch }, (_, i) =>
      fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(jobRole)}%20${encodeURIComponent(location)}&page=${i + 1}&num_pages=1&date_posted=${dateFilter}&employment_types=FULLTIME%2CPARTTIME%2CCONTRACTOR`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": "3b0e6ccc99mshc01a164089bc27cp19afc3jsn2bad51802495",
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
          next: { revalidate: 0 }, // always fresh data
        }
      ).then(r => r.json()).catch(() => ({ data: [] }))
    );

    // Fetch all pages in parallel for speed
    const pages = await Promise.all(pageRequests);
    const allJobs: any[] = [];
    for (const page of pages) {
      if (page?.data && Array.isArray(page.data)) {
        allJobs.push(...page.data);
      }
    }

    // Deduplicate by job_id
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      if (seen.has(j.job_id)) return false;
      seen.add(j.job_id);
      return true;
    });

    // Sort newest first in earlybird
    if (earlyBird) {
      uniqueJobs.sort((a, b) => {
        const ta = a.job_posted_at_datetime_utc ? new Date(a.job_posted_at_datetime_utc).getTime() : 0;
        const tb = b.job_posted_at_datetime_utc ? new Date(b.job_posted_at_datetime_utc).getTime() : 0;
        return tb - ta;
      });
    }

    return NextResponse.json({ data: uniqueJobs, total: uniqueJobs.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}