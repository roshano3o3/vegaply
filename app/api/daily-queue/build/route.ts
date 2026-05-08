import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuildRequest {
  user_id?: string;
}

interface BuildResult {
  users_processed: number;
  total_queued:    number;
  per_user:        Record<string, number>;
  skipped:         SkippedUser[];
  partial:         boolean;
  duration_ms:     number;
}

interface ErrorResult {
  error: string;
}

type SkipReason = "no_roles" | "no_location" | "no_resume" | "fetch_failed";

interface SkippedUser {
  user_id: string;
  reason:  SkipReason;
}

interface UserTarget {
  user_id:     string;
  daily_limit: number;
  resume_text: string | null;
  location:    string | null;
  roles:       string[];    // resolved from default_roles or job_role
}

interface NormalisedJob {
  job_id:                   string;
  job_title:                string;
  employer_name:            string;
  job_apply_link:           string;
  job_description:          string;
  job_posted_at_timestamp?: number;
  [key: string]: unknown;
}

interface ScoredJob {
  job_id:          string;
  job_title:       string | null;
  employer_name:   string | null;
  job_apply_link:  string | null;
  job_description: string | null; // already sliced to 3000 chars
  match_score:     number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function verifySecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Load users ────────────────────────────────────────────────────────────────

async function loadTargetUsers(
  supabase:     SupabaseClient,
  singleUserId: string | undefined,
  today:        string,
): Promise<UserTarget[]> {
  // 1. Active subscriptions (optionally scoped to one user)
  let q = supabase
    .from("subscriptions")
    .select("user_id, daily_limit")
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (singleUserId) q = q.eq("user_id", singleUserId);

  const { data: subs, error: subsErr } = await q;
  if (subsErr || !subs?.length) return [];

  const userIds = subs.map(s => s.user_id);

  // 2. Profiles for these users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, resume_text, location, job_role, default_roles")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  // 3. Find users who already have at least one queue row today (skip them in batch mode)
  const alreadyQueued = new Set<string>();
  if (!singleUserId) {
    const { data: existing } = await supabase
      .from("daily_queue")
      .select("user_id")
      .in("user_id", userIds)
      .eq("queue_date", today);
    for (const row of existing ?? []) alreadyQueued.add(row.user_id);
  }

  // 4. Build target list
  const targets: UserTarget[] = [];
  for (const s of subs) {
    if (alreadyQueued.has(s.user_id)) continue;

    const p = profileMap.get(s.user_id);
    const rawRoles: string[] = Array.isArray(p?.default_roles) && p.default_roles.length
      ? p.default_roles
      : p?.job_role
        ? [p.job_role]
        : [];

    targets.push({
      user_id:     s.user_id,
      daily_limit: Math.min(s.daily_limit ?? 15, 15),
      resume_text: p?.resume_text ?? null,
      location:    p?.location ?? null,
      roles:       rawRoles.slice(0, 3),
    });
  }

  return targets;
}

// ── Eligible user resolution (subscriptions → is_pro fallback) ───────────────

async function getEligibleUsers(
  supabase:     SupabaseClient,
  singleUserId: string | undefined,
  today:        string,
): Promise<UserTarget[]> {
  // Primary: subscriptions table (active + not expired)
  const fromSubs = await loadTargetUsers(supabase, singleUserId, today);
  // If a specific user was requested and not found in subscriptions, don't fall through.
  if (fromSubs.length || singleUserId) return fromSubs;

  // Fallback: profiles.is_pro = true (subscriptions table not yet fully populated)
  // TODO: remove once all pro users have a corresponding subscriptions row
  const { data: proProfiles } = await supabase
    .from("profiles")
    .select("id, resume_text, location, job_role, default_roles")
    .eq("is_pro", true);

  if (!proProfiles?.length) return [];

  const profIds = proProfiles.map(p => p.id as string);

  // Skip users who already have queue rows today
  const { data: existing } = await supabase
    .from("daily_queue")
    .select("user_id")
    .in("user_id", profIds)
    .eq("queue_date", today);
  const alreadyQueued = new Set((existing ?? []).map(r => r.user_id as string));

  return proProfiles
    .filter(p => !alreadyQueued.has(p.id as string))
    .map(p => {
      const rawRoles: string[] = Array.isArray(p.default_roles) && (p.default_roles as string[]).length
        ? (p.default_roles as string[])
        : p.job_role ? [p.job_role as string] : [];
      return {
        user_id:     p.id     as string,
        daily_limit: 15, // default — subscriptions.daily_limit not available in fallback path
        resume_text: (p.resume_text as string | null) ?? null,
        location:    (p.location   as string | null) ?? null,
        roles:       rawRoles.slice(0, 3),
      };
    });
}

// ── Job fetch — ONE call per user, capped at 100 results ──────────────────────

const JOB_CANDIDATE_CAP = 100;

async function fetchJobsForUser(
  roles:    string[],
  location: string,
): Promise<NormalisedJob[]> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${siteUrl}/api/jobs`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ jobRoles: roles, location, earlyBird: false }),
      signal:  AbortSignal.timeout(30_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Hard cap: take only the first 100 candidates regardless of how many /api/jobs returns
    return (data?.data ?? []).slice(0, JOB_CANDIDATE_CAP) as NormalisedJob[];
  } catch {
    return [];
  }
}

// ── Per-user job candidates — fetch, filter, score ───────────────────────────

async function getJobsForUser(
  supabase: SupabaseClient,
  user:     UserTarget,
  today:    string,
): Promise<ScoredJob[]> {
  // Single external API call, hard-capped at JOB_CANDIDATE_CAP
  const raw = await fetchJobsForUser(user.roles, user.location ?? "");

  // Drop jobs without an apply link — can't auto-apply without one
  const linkable = raw.filter(j => !!j.job_apply_link);

  // Jobs this user already submitted via the browser extension — skip them
  const { data: tracked } = await supabase
    .from("apply_tracking")
    .select("job_id")
    .eq("user_id", user.user_id)
    .not("job_id", "is", null);
  const appliedIds = new Set((tracked ?? []).map(r => r.job_id as string));

  // Jobs already in today's queue — belt-and-suspenders before the upsert
  const { data: todayQueue } = await supabase
    .from("daily_queue")
    .select("job_id")
    .eq("user_id", user.user_id)
    .eq("queue_date", today);
  const queuedIds = new Set((todayQueue ?? []).map(r => r.job_id as string));

  const eligible = linkable.filter(j =>
    !appliedIds.has(String(j.job_id)) &&
    !queuedIds.has(String(j.job_id))
  );

  return selectTopJobs(eligible, user.resume_text, user.daily_limit);
}

// ── Keyword scorer — fast, zero AI calls ─────────────────────────────────────

function scoreJobKeyword(resumeText: string | null, job: NormalisedJob): number {
  if (!resumeText) return 0;

  // Resume keyword bag: lowercase words ≥4 chars, deduped
  const resumeWords = [...new Set(
    resumeText.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 4)
  )].slice(0, 40); // cap at 40 keywords for speed

  // Scoring surface: title gets 3× weight by repeating it
  const surface = new Set(
    `${job.job_title} ${job.job_title} ${job.job_title} ${job.job_description ?? ""}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4)
  );

  let matches = 0;
  for (const word of resumeWords) {
    if (surface.has(word)) matches++;
  }

  return Math.round((matches / Math.max(resumeWords.length, 1)) * 100);
}

// ── Select top N scored jobs ──────────────────────────────────────────────────

function selectTopJobs(
  jobs:       NormalisedJob[],
  resumeText: string | null,
  limit:      number,
): ScoredJob[] {
  return jobs
    .map(job => ({
      job_id:          String(job.job_id),
      job_title:       job.job_title        ?? null,
      employer_name:   job.employer_name    ?? null,
      job_apply_link:  job.job_apply_link   ?? null,
      // Truncate here, in the route — not at DB schema level (approved constraint)
      job_description: (job.job_description ?? "").slice(0, 3_000) || null,
      match_score:     scoreJobKeyword(resumeText, job),
    }))
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit);
}

// ── Upsert — idempotent on UNIQUE(user_id, job_id, queue_date) ────────────────

async function upsertQueueRows(
  supabase: SupabaseClient,
  userId:   string,
  jobs:     ScoredJob[],
  today:    string,
): Promise<number> {
  if (!jobs.length) return 0;

  const rows = jobs.map(job => ({
    user_id:         userId,
    job_id:          job.job_id,
    job_title:       job.job_title,
    employer_name:   job.employer_name,
    job_apply_link:  job.job_apply_link,
    job_description: job.job_description,
    match_score:     job.match_score,
    status:          "pending" as const,
    queue_date:      today,
    // tailored_resume_text + cover_letter_text intentionally null — filled by AI writer
  }));

  const { data, error } = await supabase
    .from("daily_queue")
    .upsert(rows, {
      onConflict:       "user_id,job_id,queue_date",
      ignoreDuplicates: true, // UNIQUE violation → silently skip, never throw
    })
    .select("id");

  if (error) {
    console.error(`[daily-queue/build] upsert error user=${userId}:`, error.message);
    return 0;
  }

  return data?.length ?? 0;
}

// ── Per-user orchestration ────────────────────────────────────────────────────

async function buildQueueForUser(
  supabase: SupabaseClient,
  user:     UserTarget,
  today:    string,
): Promise<{ queued: number } | { skipped: true; reason: SkipReason }> {
  if (!user.roles.length) return { skipped: true, reason: "no_roles" };
  if (!user.location)     return { skipped: true, reason: "no_location" };
  if (!user.resume_text)  return { skipped: true, reason: "no_resume" };

  const jobs = await getJobsForUser(supabase, user, today);
  if (!jobs.length) return { skipped: true, reason: "fetch_failed" };

  const queued = await upsertQueueRows(supabase, user.user_id, jobs, today);

  return { queued };
}

// Daily queue eligibility:
// - Users (primary) : subscriptions WHERE active=true AND (expires_at IS NULL OR expires_at > now())
// - Users (fallback): profiles WHERE is_pro=true  [remove once all pro users have a subscriptions row]
// - Skips (user)    : already has ≥1 daily_queue row for queue_date=today (batch mode)
// - Skips (user)    : profiles.default_roles[] empty AND profiles.job_role NULL → reason "no_roles"
// - Skips (user)    : profiles.location NULL → reason "no_location"
// - Jobs source     : POST /api/jobs { jobRoles: profiles.default_roles|job_role, location: profiles.location }
//                     → Adzuna + Greenhouse + Remotive + TheMuse + Arbeitnow, deduped, top 100
// - Skips (job)     : job_apply_link NULL or empty
// - Skips (job)     : job_id already in apply_tracking WHERE user_id=this user (extension submissions)
// - Skips (job)     : job_id already in daily_queue WHERE user_id=this user AND queue_date=today
// - Queue table     : daily_queue UNIQUE(user_id, job_id, queue_date) — upsert ignoreDuplicates

// ── Core runner (shared by GET and POST) ─────────────────────────────────────

async function runQueue(
  userId: string | undefined,
): Promise<NextResponse<BuildResult | ErrorResult>> {
  const start    = Date.now();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const users = await getEligibleUsers(supabase, userId, today);

  const perUser:  Record<string, number> = {};
  const skipped:  SkippedUser[]          = [];
  let   totalQueued = 0;
  let   partial     = false;

  for (const user of users) {
    // Stop processing if within 30 s of Vercel's maxDuration wall
    if (Date.now() - start > 270_000) {
      partial = true;
      break;
    }

    const result = await buildQueueForUser(supabase, user, today);

    if ("skipped" in result) {
      skipped.push({ user_id: user.user_id, reason: result.reason });
    } else {
      perUser[user.user_id] = result.queued;
      totalQueued += result.queued;
    }

    // 300 ms pause between users — keeps Adzuna fan-outs from stacking up
    await new Promise(r => setTimeout(r, 300));
  }

  return NextResponse.json({
    users_processed: Object.keys(perUser).length,
    total_queued:    totalQueued,
    per_user:        perUser,
    skipped,
    partial,
    duration_ms:     Date.now() - start,
  });
}

// ── HTTP handlers ─────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<NextResponse<BuildResult | ErrorResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = new URL(req.url).searchParams.get("user_id") ?? undefined;
  return runQueue(userId);
}

export async function POST(req: Request): Promise<NextResponse<BuildResult | ErrorResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: BuildRequest = {};
  try { body = await req.json(); } catch { /* no body is fine */ }
  return runQueue(body.user_id);
}
