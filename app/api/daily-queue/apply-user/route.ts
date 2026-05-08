import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendApplicationEmail } from "@/lib/email/send-application-email";
import { generateApplyToken } from "@/lib/apply/apply-token";

export const maxDuration = 60;

const BATCH_SIZE = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

type RowOutcome = "applied" | "failed" | "skipped";

interface ContentReadyRow {
  id:                   string;
  user_id:              string;
  job_id:               string;
  job_title:            string | null;
  employer_name:        string | null;
  job_apply_link:       string | null;
  match_score:          number | null;
  tailored_resume_text: string;
  cover_letter_text:    string | null;
}

interface RowDetail {
  id:            string;
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

// ── Session auth — user_id is NEVER taken from the request body ───────────────

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

// ── User info (service role for auth.admin) ───────────────────────────────────

async function loadUserInfo(
  supabase: SupabaseClient,
  userId:   string,
): Promise<{ email: string; firstName: string } | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  const meta      = data.user.user_metadata ?? {};
  const fullName  = (meta.full_name ?? meta.name ?? "") as string;
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  return { email: data.user.email, firstName };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(): Promise<NextResponse<ApplyResult | { error: string }>> {
  // 1. Validate session — user_id is derived server-side only, never from client input
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start    = Date.now();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().slice(0, 10);

  // 2. Select up to BATCH_SIZE content-ready rows — scoped to this user only
  const { data: rawRows, error: selectErr } = await supabase
    .from("daily_queue")
    .select(
      "id, user_id, job_id, job_title, employer_name, job_apply_link, " +
      "match_score, tailored_resume_text, cover_letter_text",
    )
    .eq("user_id", userId)
    .eq("queue_date", today)
    .eq("status", "pending")
    .not("tailored_resume_text", "is", null)
    .not("cover_letter_text", "is", null)
    .order("match_score", { ascending: false })
    .limit(BATCH_SIZE);

  if (selectErr) {
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }

  const rows = (rawRows ?? []) as unknown as ContentReadyRow[];

  // 3. Load user email once — needed to send each email
  const userInfo = await loadUserInfo(supabase, userId);

  let applied = 0, failed = 0, skipped = 0;
  const details: RowDetail[] = [];

  for (const row of rows) {
    const rowStart = Date.now();

    if (!userInfo) {
      skipped++;
      details.push({
        id: row.id, job_id: row.job_id,
        job_title: row.job_title, employer_name: row.employer_name,
        outcome: "skipped", error: "no_user_email",
        duration_ms: Date.now() - rowStart,
      });
      continue;
    }

    try {
      if (!row.cover_letter_text) throw new Error("cover_letter_text is empty");
      if (!row.job_apply_link)    throw new Error("job_apply_link is missing");

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
        to:                 userInfo.email,
        firstName:          userInfo.firstName,
        jobTitle:           row.job_title    ?? "Unknown Role",
        employerName:       row.employer_name ?? "Unknown Company",
        applyLink:          row.job_apply_link,
        secureApplyLink,
        matchScore:         row.match_score,
        tailoredResumeText: row.tailored_resume_text,
        coverLetterText:    row.cover_letter_text,
      });

      const { error: qErr } = await supabase
        .from("daily_queue")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", row.id);
      if (qErr) throw new Error(`Queue update failed: ${qErr.message}`);

      // apply_tracking insert is best-effort — non-fatal if it fails
      await supabase.from("apply_tracking").insert({
        user_id:      row.user_id,
        job_id:       row.job_id,
        company_name: row.employer_name ?? null,
        job_title:    row.job_title     ?? null,
        ats_type:     "vegaply_autoapply",
        apply_url:    row.job_apply_link,
      });

      applied++;
      details.push({
        id: row.id, job_id: row.job_id,
        job_title: row.job_title, employer_name: row.employer_name,
        outcome: "applied", duration_ms: Date.now() - rowStart,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("daily_queue")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", row.id);

      failed++;
      details.push({
        id: row.id, job_id: row.job_id,
        job_title: row.job_title, employer_name: row.employer_name,
        outcome: "failed", error: msg, duration_ms: Date.now() - rowStart,
      });
    }
  }

  return NextResponse.json({
    processed:   rows.length,
    applied,
    failed,
    skipped,
    partial:     rows.length === BATCH_SIZE,
    duration_ms: Date.now() - start,
    details,
  });
}
