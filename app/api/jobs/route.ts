// FILE: app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { CLAUDE_MODEL } from "@/lib/ai/config";

// ── Strip HTML tags from raw description text ────────────────────────────────
function stripHtml(text: string): string {
  return text
    // Remove script/style blocks entirely (including content)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    // Block-level closures → space to preserve word boundaries
    .replace(/<\/?(h[1-6]|p|div|section|article|header|footer|li|tr|td|th|br|hr)[^>]*>/gi, " ")
    // All remaining tags
    .replace(/<[^>]+>/g, "")
    // Named HTML entities — common typographic ones first
    .replace(/&rsquo;/gi, "'").replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, "”").replace(/&ldquo;/gi, "“")
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "...").replace(/&bull;/gi, "•")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    // Numeric entities
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s+/g, " ").trim();
}

// ── Escape special regex chars in a plain string ─────────────────────────────
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Detect company-intro boilerplate paragraphs ───────────────────────────────
const BLURB_STARTERS = [
  "about us", "our company", "our story", "who we are", "our mission",
  "founded in", "headquartered in", "we are a", "we're a",
  "join us in", "join our team", "join a team",
  "at our company", "be part of",
];

function isCompanyBlurb(text: string, employerName?: string): boolean {
  const lower = text.toLowerCase();
  // Employer-name intro: "Robinhood is a..." / "At Robinhood, we..."
  if (employerName && employerName.trim().length > 1) {
    const eName = escapeRegex(employerName.trim());
    if (
      new RegExp(`^${eName}\\s+(is a|is an|was founded|builds|powers|operates|enables|helps|connects)`, "i").test(text) ||
      new RegExp(`^${eName}\\s+is the\\s+(largest|leading|world|premier|fastest|most)`, "i").test(text) ||
      new RegExp(`^at\\s+${eName}[,.]`, "i").test(text)
    ) return true;
  }
  // Generic opener patterns
  if (BLURB_STARTERS.some(s => lower.startsWith(s))) return true;
  // Unknown company opener: "Acme Corp is a leading..."
  if (/^[A-Z][A-Za-z0-9&.\- ]+ (is a|is an|was founded|builds|powers|operates|enables|connects)/i.test(text)) return true;
  // High "we/our" density in first 150 chars = company voice, not role voice
  const intro = text.slice(0, 150);
  const weCount = (intro.match(/\b(we|our|us)\b/gi) || []).length;
  if (weCount >= 4) return true;
  return false;
}

// ── Build a role-specific brief — strips company boilerplate ─────────────────
async function buildJobBrief(job: {
  job_description?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_highlights?: { Responsibilities?: string[] };
}): Promise<string> {
  // Priority 1: structured responsibilities highlights
  const responsibilities = job.job_highlights?.Responsibilities;
  if (Array.isArray(responsibilities) && responsibilities.length > 0) {
    const bullets = responsibilities
      .slice(0, 2)
      .filter(Boolean)
      .map((b: string) => stripHtml(b).trim());
    if (bullets.length > 0) {
      const joined = bullets.join(" • ");
      return joined.length > 240 ? joined.slice(0, 237) + "..." : joined;
    }
  }

  // Priority 2: job description body — detect and skip company blurbs
  const desc = stripHtml(job.job_description || "").trim();
  if (desc && desc.length > 50) {
    if (!isCompanyBlurb(desc, job.employer_name)) {
      const cutAt = desc.lastIndexOf(". ", 200);
      const trimmed = cutAt > 80 ? desc.slice(0, cutAt + 1) : desc.slice(0, 200);
      return trimmed.trim();
    }

    // It's a blurb — look for the first role-specific sentence after the intro
    const afterIntro = desc.search(
      /\.\s+(We are looking|We're looking|We seek|The role|This role|As a|You will|You'll|The team|Our team|In this role)/i
    );
    if (afterIntro > 0 && afterIntro < desc.length - 50) {
      const realStart = desc.slice(afterIntro + 2);
      const cut = realStart.lastIndexOf(". ", 200);
      const trimmed = cut > 80 ? realStart.slice(0, cut + 1) : realStart.slice(0, 200);
      return trimmed.trim();
    }

    // Blurb — regex extraction failed — ask AI for a role-specific summary
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 100,
            messages: [{
              role: "user",
              content: `Extract a 1-2 sentence role-specific summary from this job description. Focus only on what the candidate will DO, not company background. If no role info exists, return "null".\n\nJob: ${job.job_title} at ${job.employer_name}\nDescription: ${desc.slice(0, 1000)}\n\nReturn ONLY the summary, no preamble.`,
            }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const brief = data.content?.[0]?.text?.trim();
          if (brief && brief !== "null" && brief.length > 20) {
            return brief.slice(0, 200);
          }
        }
      } catch {
        // AI call failed — fall through to generic fallback
      }
    }
  }

  // Priority 3: fallback — generic but informative
  const title = job.job_title || "Open role";
  const employer = job.employer_name || "the company";
  const location = job.job_city || "";
  return location ? `${title} at ${employer} — ${location}` : `${title} role at ${employer}`;
}

// ── Shared location-filter constants ─────────────────────────────────────────
const US_ALIASES = ['', 'us', 'usa', 'unitedstates', 'america', 'any'];

const US_MARKERS = [
  'us','usa','unitedstates','america',
  'newyork','ny','manhattan','brooklyn','queens','bronx','sanfrancisco','sf','bayarea',
  'seattle','wa','chicago','il','losangeles','la','sandiego','sanjose',
  'austin','tx','dallas','houston','sanantonio','ftworth',
  'boston','ma','denver','co','atlanta','ga','miami','fl','tampa','orlando','jacksonville',
  'phoenix','az','philadelphia','pa','pittsburgh',
  'washington','dc','portland','or','nashville','tn','charlotte','nc','raleigh','durham',
  'minneapolis','mn','detroit','mi','annarbor','indianapolis','in','columbus','oh','cleveland','cincinnati',
  'kansascity','stlouis','mo','saltlakecity','ut','lasvegas','nv','reno',
  'newjersey','nj','newark','connecticut','ct','maryland','md','virginia','va',
  'remote','usremote','remoteus',
];

const NON_US_MARKERS = [
  // Western Europe
  'germany','berlin','munich','frankfurt','hamburg','cologne','dusseldorf','stuttgart',
  'uk','unitedkingdom','england','london','manchester','birmingham','leeds','glasgow','scotland','wales',
  'france','paris','lyon','marseille','toulouse','bordeaux',
  'ireland','dublin','cork',
  'spain','madrid','barcelona','seville','valencia',
  'netherlands','amsterdam','rotterdam','utrecht','thehague',
  'italy','rome','milan','naples','turin','florence',
  'portugal','lisbon','porto',
  'belgium','brussels','antwerp',
  'switzerland','zurich','geneva','bern',
  'austria','vienna','graz',
  'sweden','stockholm','gothenburg','malmo',
  'norway','oslo','bergen',
  'denmark','copenhagen','aarhus',
  'finland','helsinki','tampere',
  'poland','warsaw','krakow','wroclaw','lodz',
  // Eastern Europe
  'czechrepublic','prague','brno',
  'hungary','budapest',
  'romania','bucharest','cluj',
  'ukraine','kyiv','kharkiv','lviv',
  'russia','moscow','saintpetersburg',
  // Middle East
  'dubai','uae','unitedarabemirates','abudhabi','sharjah',
  'israel','telaviv','jerusalem','haifa',
  'turkey','istanbul','ankara','izmir',
  'saudiarabia','riyadh','jeddah',
  'qatar','doha','kuwait','bahrain',
  // South Asia — India (most critical for "us" false positives)
  'india','bharat',
  'bengaluru','bangalore',
  'hyderabad','mumbai','bombay',
  'delhi','newdelhi','ncr',
  'noida','gurgaon','gurugram','faridabad',
  'pune','chennai','madras',
  'kolkata','calcutta',
  'ahmedabad','jaipur','lucknow',
  'coimbatore','indore','nagpur','surat','vadodara','bhopal',
  'kochi','cochin','trivandrum','thiruvananthapuram',
  'visakhapatnam','vizag','patna','chandigarh',
  // Pakistan
  'pakistan','karachi','lahore','islamabad','rawalpindi',
  // Bangladesh
  'bangladesh','dhaka','chittagong',
  // Sri Lanka
  'srilanka','colombo',
  // East/SE Asia
  'japan','tokyo','osaka','kyoto','yokohama',
  'china','beijing','shanghai','shenzhen','guangzhou','chengdu','hangzhou','hongkong',
  'singapore',
  'southkorea','korea','seoul','busan',
  'taiwan','taipei',
  'vietnam','hochiminh','hanoi',
  'thailand','bangkok','chiangmai',
  'indonesia','jakarta','surabaya','bali',
  'malaysia','kualalumpur','penang',
  'philippines','manila','cebu','davao',
  // Oceania
  'australia','sydney','melbourne','brisbane','perth','adelaide','canberra',
  'newzealand','auckland','wellington','christchurch',
  // Americas (non-US)
  'canada','toronto','vancouver','montreal','ottawa','calgary','edmonton',
  'mexico','mexicocity','guadalajara','monterrey',
  'brazil','saopaulo','riodejaneiro','brasilia','salvador',
  'argentina','buenosaires','cordoba',
  'colombia','bogota','medellin',
  'chile','santiago',
  // Africa
  'southafrica','johannesburg','capetown','durban',
  'nigeria','lagos','abuja',
  'kenya','nairobi',
  'egypt','cairo',
  'ghana','accra',
];

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
  job_brief: string;
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
    return Promise.all(jobs.map(async job => {
      const normalized: NormalisedJob = {
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
        job_brief: "",
        job_employment_type: job.contract_time || "",
        source: "adzuna",
      };
      normalized.job_brief = await buildJobBrief(normalized);
      return normalized;
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
      `https://remotive.com/api/remote-jobs?limit=300`,
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
    const mapped: NormalisedJob[] = await Promise.all(jobs.map(async job => {
      const n: NormalisedJob = {
        job_id: String(job.id),
        job_title: job.title,
        employer_name: job.company_name,
        employer_logo: job.company_logo ?? null,
        job_city: "Remote",
        job_country: "Worldwide",
        job_posted_at_timestamp: Math.floor(new Date(job.publication_date).getTime() / 1000),
        job_posted_at_datetime_utc: job.publication_date ?? null,
        job_apply_link: job.apply_url || job.url,
        job_description: job.description ?? "",
        job_brief: "",
        job_employment_type: job.job_type ?? "",
        job_is_remote: true,
        source: "remotive",
      };
      n.job_brief = await buildJobBrief(n);
      return n;
    }));
    const roleLower = (jobRole || '').toLowerCase().trim();
    const filtered = roleLower
      ? mapped.filter(j => j.job_title?.toLowerCase().includes(roleLower))
      : mapped;
    console.log("[Remotive] jobs after role filter:", filtered.length);
    // --- LOCATION FILTER (uses shared module-level constants) ---
    const locRaw = (location || '').toLowerCase().trim();
    const locNorm = locRaw.replace(/[\s.,\-]/g, '');
    const isDefaultUS = US_ALIASES.includes(locNorm);
    const locationFiltered = filtered.filter(j => {
      const rawCity = (j.job_city || '').toLowerCase();
      const normCity = rawCity.replace(/[\s.,\-]/g, '');
      if (NON_US_MARKERS.some(m => normCity.includes(m))) return false;
      if (isDefaultUS) {
        // Remotive is a remote-only board — blank city is remote-compatible, not unknown origin
        if (!normCity) return true;
        return US_MARKERS.some(m => normCity.includes(m));
      }
      return normCity.includes(locNorm);
    });
    console.log("[Remotive] after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch {
    return [];
  }
}

// ── SOURCE C: Greenhouse (25 companies) ─────────────────────────────────────
const GREENHOUSE_COMPANIES = [
  "stripe", "figma", "notion", "linear", "vercel",
  "airbnb", "discord", "reddit", "asana", "gusto",
  "brex", "plaid", "rippling", "benchling", "scaleai",
  "retool", "lattice", "deel", "ramp", "anthropic",
  "openai", "databricks", "datadog", "robinhood", "snowflake"
];

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
    // Collect raw job objects, then generate briefs in parallel
    const rawPairs: Array<{ company: string; job: any }> = [];
    for (const { company, jobs } of results as { company: string; jobs: any[] }[]) {
      for (const job of jobs) {
        rawPairs.push({ company, job });
      }
    }
    const normalised: NormalisedJob[] = await Promise.all(rawPairs.map(async ({ company, job }) => {
      const gh: NormalisedJob = {
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
        job_brief: "",
        job_employment_type: "",
        source: "greenhouse",
      };
      gh.job_brief = await buildJobBrief(gh);
      return gh;
    }));
    console.log("[Greenhouse] jobs fetched:", normalised.length);
    const roleLower = (jobRole || '').toLowerCase().trim();
    const roleWords = roleLower.split(/\s+/).filter(Boolean);
    const filtered = roleWords.length
      ? normalised.filter(j => {
          const title = j.job_title?.toLowerCase() || '';
          return roleWords.every(w => title.includes(w));
        })
      : normalised;
    console.log("[Greenhouse] jobs after role filter:", filtered.length);
    // --- LOCATION FILTER (shared constants) ---
    const locRaw = (location || '').toLowerCase().trim();
    const locNorm = locRaw.replace(/[\s.,\-]/g, '');
    const isDefaultUS = US_ALIASES.includes(locNorm);
    const locationFiltered = filtered.filter(j => {
      const rawCity = (j.job_city || '').toLowerCase();
      const normCity = rawCity.replace(/[\s.,\-]/g, '');
      if (NON_US_MARKERS.some(m => normCity.includes(m))) return false;
      if (isDefaultUS) {
        // All 25 GREENHOUSE_COMPANIES are US-based, so empty city is safe to admit
        if (!normCity) return true;
        return US_MARKERS.some(m => normCity.includes(m));
      }
      return normCity.includes(locNorm);
    });
    console.log("[Greenhouse] after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch {
    return [];
  }
}

// ── SOURCE D: The Muse ────────────────────────────────────────────────────────
async function fetchTheMuse(jobRole: string, location: string): Promise<NormalisedJob[]> {
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
    const mapped: NormalisedJob[] = await Promise.all(filtered.map(async job => {
      const tm: NormalisedJob = {
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
        job_brief: "",
        job_employment_type: job.type ?? "",
        source: "themuse",
      };
      tm.job_brief = await buildJobBrief(tm);
      return tm;
    }));
    // --- LOCATION FILTER (shared constants) ---
    const locRaw = (location || '').toLowerCase().trim();
    const locNorm = locRaw.replace(/[\s.,\-]/g, '');
    const isDefaultUS = US_ALIASES.includes(locNorm);
    const locationFiltered = mapped.filter(j => {
      const rawCity = (j.job_city || '').toLowerCase();
      const normCity = rawCity.replace(/[\s.,\-]/g, '');
      if (NON_US_MARKERS.some(m => normCity.includes(m))) return false;
      if (isDefaultUS) {
        // TheMuse is a US-first platform — blank city admits the job rather than drops it
        if (!normCity) return true;
        return US_MARKERS.some(m => normCity.includes(m));
      }
      return normCity.includes(locNorm);
    });
    console.log("[TheMuse] after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch (err) {
    console.error("[TheMuse] error:", err);
    return [];
  }
}

// ── SOURCE E: Arbeitnow ───────────────────────────────────────────────────────
async function fetchArbeitnow(jobRole: string, location: string): Promise<NormalisedJob[]> {
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
    const mapped: NormalisedJob[] = await Promise.all(filtered.map(async job => {
      const an: NormalisedJob = {
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
        job_brief: "",
        job_employment_type: job.job_types?.[0] ?? "",
        job_is_remote: job.remote ?? false,
        source: "arbeitnow",
      };
      an.job_brief = await buildJobBrief(an);
      return an;
    }));
    // --- LOCATION FILTER (shared constants) ---
    const locRaw = (location || '').toLowerCase().trim();
    const locNorm = locRaw.replace(/[\s.,\-]/g, '');
    const isDefaultUS = US_ALIASES.includes(locNorm);
    // Arbeitnow is a German-origin board — most listings are EU/global.
    // Skip it entirely for US searches to avoid India/EU jobs bleeding through.
    if (isDefaultUS) {
      console.log("[Arbeitnow] skipped — US search, German-origin board");
      return [];
    }
    const locationFiltered = mapped.filter(j => {
      const rawCity = (j.job_city || '').toLowerCase();
      const normCity = rawCity.replace(/[\s.,\-]/g, '');
      if (NON_US_MARKERS.some(m => normCity.includes(m))) return false;
      // Exclude jobs with no city info — safer default than admitting unknowns
      if (!normCity) return false;
      return normCity.includes(locNorm);
    });
    console.log("[Arbeitnow] after location filter:", locationFiltered.length);
    return locationFiltered;
  } catch (err) {
    console.error("[Arbeitnow] error:", err);
    return [];
  }
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobRole, jobRoles: jobRolesInput, location, earlyBird = false } = body;

    // Support legacy jobRole (string) and new jobRoles (string[]) — cap at 3 roles
    const rawRoles: string[] = Array.isArray(jobRolesInput) && jobRolesInput.length > 0
      ? jobRolesInput
      : typeof jobRole === 'string'
        ? jobRole.split(',').map((r: string) => r.trim()).filter(Boolean)
        : [];
    const roles = rawRoles.slice(0, 3);

    if (!roles.length || !location) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // Fan out: one full pipeline per role in parallel, then merge
    const perRoleResults = await Promise.all(
      roles.map(role => Promise.all([
        fetchAdzuna(role, location, earlyBird),
        fetchRemotive(role, location),
        fetchGreenhouse(role, location),
        fetchTheMuse(role, location),
        fetchArbeitnow(role, location),
      ]))
    );

    const adzunaJobs  = perRoleResults.flatMap(r => r[0]);
    const remotiveJobs   = perRoleResults.flatMap(r => r[1]);
    const greenhouseJobs = perRoleResults.flatMap(r => r[2]);
    const themuseJobs    = perRoleResults.flatMap(r => r[3]);
    const arbeitnowJobs  = perRoleResults.flatMap(r => r[4]);

    console.log("Adzuna jobs:", adzunaJobs.length);
    console.log("Remotive jobs:", remotiveJobs.length);
    console.log("Greenhouse jobs:", greenhouseJobs.length);
    console.log("TheMuse jobs:", themuseJobs.length);
    console.log("Arbeitnow jobs:", arbeitnowJobs.length);

    // Group: direct-ATS sources vs Adzuna aggregator
    const directJobs: NormalisedJob[] = [...greenhouseJobs, ...remotiveJobs, ...themuseJobs, ...arbeitnowJobs];
    console.log("Total combined:", adzunaJobs.length + directJobs.length);

    const sortByRecency = (a: NormalisedJob, b: NormalisedJob) => {
      const ta = a.job_posted_at_datetime_utc
        ? new Date(a.job_posted_at_datetime_utc).getTime()
        : (a.job_posted_at_timestamp ?? 0) * 1000;
      const tb = b.job_posted_at_datetime_utc
        ? new Date(b.job_posted_at_datetime_utc).getTime()
        : (b.job_posted_at_timestamp ?? 0) * 1000;
      return tb - ta;
    };
    directJobs.sort(sortByRecency);
    adzunaJobs.sort(sortByRecency);

    // Interleave: 2 direct-ATS, then 3 Adzuna, repeat — guarantees ~40% direct in top results
    const allJobs: NormalisedJob[] = [];
    let ai = 0, di = 0;
    while (ai < adzunaJobs.length || di < directJobs.length) {
      for (let k = 0; k < 2 && di < directJobs.length; k++) allJobs.push(directJobs[di++]);
      for (let k = 0; k < 3 && ai < adzunaJobs.length; k++) allJobs.push(adzunaJobs[ai++]);
    }

    // Deduplicate by job_id
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter(j => {
      const id = String(j.job_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
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

    // Dev-mode brief quality check
    if (process.env.NODE_ENV !== "production") {
      const briefMap = new Map<string, number>();
      finalJobs.forEach(j => {
        const key = (j.job_brief || "").slice(0, 50);
        briefMap.set(key, (briefMap.get(key) || 0) + 1);
      });
      const dupes = [...briefMap.entries()].filter(([_, n]) => n > 1);
      if (dupes.length > 0) console.warn("[brief] duplicate briefs detected:", dupes);
    }

    return NextResponse.json({ data: finalJobs, total: finalJobs.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
