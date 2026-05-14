import { NextResponse } from "next/server";

export const maxDuration = 300;

// ── Config ─────────────────────────────────────────────────────────────────────

const MAX_PROCESS_LOOPS = 4;
const MAX_APPLY_LOOPS   = 4;

// ── Types ──────────────────────────────────────────────────────────────────────

interface RunRequest {
  user_id?: string;
  dry_run?: boolean;
}

interface HealthResult {
  ok:           boolean;
  route:        string;
  message:      string;
  sends_emails: boolean;
}

interface DryRunResult {
  ok:                          boolean;
  dry_run:                     true;
  user_id?:                    string;
  planned_steps:               string[];
  sends_emails_if_not_dry_run: boolean;
}

interface RunResult {
  ok:           boolean;
  user_id?:     string;
  build:        Record<string, unknown>;
  process_runs: Record<string, unknown>[];
  apply_runs:   Record<string, unknown>[];
  totals: {
    queued:    number;
    generated: number;
    sent:      number;
    failed:    number;
  };
  partial:     boolean;
  duration_ms: number;
}

type AnyResult = HealthResult | DryRunResult | RunResult | { error: string };

// ── Auth ───────────────────────────────────────────────────────────────────────

function verifySecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ── Base URL resolution ────────────────────────────────────────────────────────
//
// Priority:
//   1. NEXT_PUBLIC_SITE_URL env var — explicit config, most reliable
//   2. Origin derived from req.url  — works on Vercel without env var
//   3. http://localhost:3000         — last resort, unreachable from Vercel serverless

function resolveBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

// ── Internal route caller ──────────────────────────────────────────────────────

async function callRoute(
  base:   string,
  path:   string,
  secret: string,
  body:   Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base}${path}`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${secret}`,
    },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(270_000),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data.error as string | undefined) ?? `HTTP ${res.status}`);
  }
  return data;
}

// ── Core pipeline runner ───────────────────────────────────────────────────────

async function runPipeline(
  userId:  string | undefined,
  baseUrl: string,
): Promise<NextResponse<RunResult>> {
  const start    = Date.now();
  const secret   = process.env.CRON_SECRET ?? "";
  const callBody: Record<string, unknown> = userId ? { user_id: userId } : {};

  const result: RunResult = {
    ok:           true,
    build:        {},
    process_runs: [],
    apply_runs:   [],
    totals:       { queued: 0, generated: 0, sent: 0, failed: 0 },
    partial:      false,
    duration_ms:  0,
  };
  if (userId) result.user_id = userId;

  // ── Phase 1: Build ──────────────────────────────────────────────────────────
  // Fetches eligible jobs and inserts pending daily_queue rows.
  // On failure, abort — nothing to process or send.

  try {
    const buildData = await callRoute(baseUrl, "/api/daily-queue/build", secret, callBody);
    result.build = buildData;
    result.totals.queued += (buildData.total_queued as number | undefined) ?? 0;
    if (buildData.partial) result.partial = true;
  } catch (err) {
    result.build       = { error: err instanceof Error ? err.message : String(err) };
    result.ok          = false;
    result.duration_ms = Date.now() - start;
    return NextResponse.json(result);
  }

  // ── Phase 2: Process (AI content generation) ────────────────────────────────
  // Loop exits when partial=false (no remaining rows) or on error.

  for (let i = 0; i < MAX_PROCESS_LOOPS; i++) {
    try {
      const d = await callRoute(baseUrl, "/api/daily-queue/process", secret, callBody);
      result.process_runs.push(d);
      result.totals.generated += (d.generated as number | undefined) ?? 0;
      result.totals.failed    += (d.failed    as number | undefined) ?? 0;
      if (!d.partial) break;
      result.partial = true;
    } catch (err) {
      result.process_runs.push({ error: err instanceof Error ? err.message : String(err) });
      result.ok = false;
      break;
    }
  }

  // ── Phase 3: Apply / send emails ────────────────────────────────────────────
  // Emails go to the user — no submission is made to employers.

  for (let i = 0; i < MAX_APPLY_LOOPS; i++) {
    try {
      const d = await callRoute(baseUrl, "/api/daily-queue/apply", secret, callBody);
      result.apply_runs.push(d);
      result.totals.sent   += (d.applied as number | undefined) ?? 0;
      result.totals.failed += (d.failed  as number | undefined) ?? 0;
      if (!d.partial) break;
      result.partial = true;
    } catch (err) {
      result.apply_runs.push({ error: err instanceof Error ? err.message : String(err) });
      result.ok = false;
      break;
    }
  }

  result.duration_ms = Date.now() - start;
  return NextResponse.json(result);
}

// ── HTTP handlers ──────────────────────────────────────────────────────────────

// GET — runs the full pipeline. Vercel Cron always sends GET.
export async function GET(req: Request): Promise<NextResponse<AnyResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baseUrl = resolveBaseUrl(req);
  return runPipeline(undefined, baseUrl);
}

// POST — runs build → process → apply, or returns a dry-run plan if dry_run=true.
export async function POST(
  req: Request,
): Promise<NextResponse<AnyResult>> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RunRequest = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  const { user_id: userId, dry_run: dryRun } = body;

  if (dryRun) {
    const dryResult: DryRunResult = {
      ok:                          true,
      dry_run:                     true,
      planned_steps:               ["build", "process", "apply"],
      sends_emails_if_not_dry_run: true,
    };
    if (userId) dryResult.user_id = userId;
    return NextResponse.json(dryResult);
  }

  const baseUrl = resolveBaseUrl(req);
  return runPipeline(userId, baseUrl);
}
