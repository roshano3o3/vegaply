import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendApplicationEmail } from "@/lib/email/send-application-email";
import { generateApplyToken } from "@/lib/apply/apply-token";

export const maxDuration = 300;

// ── Config ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApplyRequest {
  user_id?:  string;
  queue_id?: string;
}

type RowOutcome = "applied" | "failed" | "skipped";

interface RowDetail {
  id:            string;
  user_id:       string;
  job_id:        string;
  job_title:     string | null;
  employer_name: string | null;
  outcome:       RowOutcome;
  error?:        string;
  duration_ms:   number;
}

interface ApplyResult {
  processed:   number;
  applied:     number;
  failed:      number;
  skipped:     number;
  partial:     boolean;
  duration_ms: number;
  details:     RowDetail[];
}

interface ErrorResult {
  error: string;
}

interface ContentReadyRow {
  id:                   string;
  user_id:              string;
  job_id:               string;
  job_title:            string | null;
  employer_name:        string | null;
  job_apply_link:       string | null;
  job_description:      string | null;
  match_score:          number | null;
  tailored_resume_text: string;
  cover_letter_text:    string | null;
}

interface UserInfo {
  email:     string;
  firstName: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function verifySecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Row selection ─────────────────────────────────────────────────────────────
//
// Content-ready = status 'pending' AND tailored_resume_text IS NOT NULL.
// Rows already applied/failed are excluded by the status='pending' filter.

async function selectContentReadyRows(
  supabase: SupabaseClient,
  today:    string,
  userId?:  string,
  queueId?: string,
): Promise<ContentReadyRow[]> {
  let q = supabase
    .from("daily_queue")
    .select(
      "id, user_id, job_id, job_title, employer_name, job_apply_link, " +
      "job_description, match_score, tailored_resume_text, cover_letter_text",
    )
    .eq("status", "pending")
    .not("tailored_resume_text", "is", null)
    .eq("queue_date", today)
    .order("match_score", { ascending: false })
    .limit(BATCH_SIZE);

  if (queueId) {
    q = q.eq("id", queueId);
  } else if (userId) {
    q = q.eq("user_id", userId);
  }

  const { data, error } = await q;
  if (error) throw new Error(`Queue query failed: ${error.message}`);
  return (data ?? []) as unknown as ContentReadyRow[];
}

// ── User info loader (cached per user_id within one run) ──────────────────────

async function loadUserInfo(
  supabase: SupabaseClient,
  userId:   string,
): Promise<UserInfo | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;

  const meta      = data.user.user_metadata ?? {};
  const fullName  = (meta.full_name ?? meta.name ?? "") as string;
  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  return { email: data.user.email, firstName };
}

// ── Row processor ─────────────────────────────────────────────────────────────

async function applyOneRow(
  supabase: SupabaseClient,
  row:      ContentReadyRow,
  user:     UserInfo,
): Promise<RowOutcome> {
  try {
    if (!row.cover_letter_text) {
      throw new Error("cover_letter_text is empty");
    }
    if (!row.job_apply_link) {
      throw new Error("job_apply_link is missing");
    }

    // Generate a secure per-row apply token and persist the hash
    const { rawToken, tokenHash, expiresAt } = generateApplyToken();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    let secureApplyLink: string | undefined;
    const { error: tokenErr } = await supabase
      .from("daily_queue")
      .update({ apply_token: tokenHash, apply_token_expires_at: expiresAt.toISOString() })
      .eq("id", row.id);
    if (!tokenErr && siteUrl) {
      secureApplyLink = `${siteUrl}/apply/confirm?token=${rawToken}`;
    }

    await sendApplicationEmail({
      to:                 user.email,
      firstName:          user.firstName,
      jobTitle:           row.job_title      ?? "Unknown Role",
      employerName:       row.employer_name  ?? "Unknown Company",
      applyLink:          row.job_apply_link,
      secureApplyLink,
      matchScore:         row.match_score,
      tailoredResumeText: row.tailored_resume_text,
      coverLetterText:    row.cover_letter_text,
    });

    // Mark applied in daily_queue
    const { error: qErr } = await supabase
      .from("daily_queue")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", row.id);
    if (qErr) throw new Error(`Queue update failed: ${qErr.message}`);

    // Record in apply_tracking so the build step deduplicates correctly
    await supabase.from("apply_tracking").insert({
      user_id:      row.user_id,
      job_id:       row.job_id,
      company_name: row.employer_name ?? null,
      job_title:    row.job_title     ?? null,
      ats_type:     "vegaply_autoapply",
      apply_url:    row.job_apply_link,
    });
    // apply_tracking insert errors are non-fatal — tracking is best-effort

    return "applied";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("daily_queue")
      .update({ status: "failed", error_message: msg.slice(0, 500) })
      .eq("id", row.id);
    return "failed";
  }
}

// ── Core runner (shared by GET and POST) ─────────────────────────────────────

async function runApply(
  userId?:  string,
  queueId?: string,
): Promise<NextResponse<ApplyResult | ErrorResult>> {
  const start    = Date.now();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().slice(0, 10);

  let rows: ContentReadyRow[];
  try {
    rows = await selectContentReadyRows(supabase, today, userId, queueId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[daily-queue/apply] select failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let applied   = 0;
  let failed    = 0;
  let skipped   = 0;
  let processed = 0;
  let partial   = false;
  const details: RowDetail[] = [];

  // User info cached per user — one auth.admin lookup per user, not per row
  const userCache = new Map<string, UserInfo | null>();

  for (const row of rows) {
    if (Date.now() - start > 270_000) {
      partial = true;
      break;
    }

    const rowStart = Date.now();
    processed++;

    // Load and cache user info
    if (!userCache.has(row.user_id)) {
      const info = await loadUserInfo(supabase, row.user_id);
      userCache.set(row.user_id, info);
    }
    const userInfo = userCache.get(row.user_id) ?? null;

    if (!userInfo) {
      skipped++;
      details.push({
        id:            row.id,
        user_id:       row.user_id,
        job_id:        row.job_id,
        job_title:     row.job_title,
        employer_name: row.employer_name,
        outcome:       "skipped",
        error:         "no_user_email",
        duration_ms:   Date.now() - rowStart,
      });
      continue;
    }

    const outcome = await applyOneRow(supabase, row, userInfo);
    if (outcome === "applied") applied++;
    else failed++;

    const detail: RowDetail = {
      id:            row.id,
      user_id:       row.user_id,
      job_id:        row.job_id,
      job_title:     row.job_title,
      employer_name: row.employer_name,
      outcome,
      duration_ms:   Date.now() - rowStart,
    };
    details.push(detail);

    console.log(
      `[daily-queue/apply] row=${row.id} job="${row.job_title}" outcome=${outcome} ms=${Date.now() - rowStart}`,
    );
  }

  if (!partial && rows.length === BATCH_SIZE) partial = true;

  return NextResponse.json({
    processed,
    applied,
    failed,
    skipped,
    partial,
    duration_ms: Date.now() - start,
    details,
  });
}

// ── HTTP handlers ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
): Promise<NextResponse<ApplyResult | ErrorResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params  = new URL(req.url).searchParams;
  const userId  = params.get("user_id")  ?? undefined;
  const queueId = params.get("queue_id") ?? undefined;
  return runApply(userId, queueId);
}

export async function POST(
  req: Request,
): Promise<NextResponse<ApplyResult | ErrorResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: ApplyRequest = {};
  try { body = await req.json(); } catch { /* no body is fine */ }
  return runApply(body.user_id, body.queue_id);
}
