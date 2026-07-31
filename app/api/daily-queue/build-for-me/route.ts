import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 120;

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuildForMeResult {
  ok:        boolean;
  queued:    number;
  generated: number;
  failed:    number;
}

// ── Session auth — user_id is NEVER taken from the request ───────────────────

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

// ── Base URL resolution ────────────────────────────────────────────────────────

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

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse<BuildForMeResult | { error: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const base    = resolveBaseUrl(req);
  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${secret}`,
  };
  const body = JSON.stringify({ user_id: userId });

  // Phase 1: Build — fetch eligible jobs and insert pending daily_queue rows
  let queued = 0;
  try {
    const res  = await fetch(`${base}/api/daily-queue/build`, {
      method: "POST", headers, body,
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error((data.error as string | undefined) ?? `HTTP ${res.status}`);
    queued = (data.total_queued as number | undefined) ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[build-for-me] build failed:", msg);
    return NextResponse.json({ error: `Build failed: ${msg}` }, { status: 500 });
  }

  // Phase 2: Process — AI content generation (single batch, no apply)
  let generated = 0;
  let failed    = 0;
  try {
    const res  = await fetch(`${base}/api/daily-queue/process`, {
      method: "POST", headers, body,
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) throw new Error((data.error as string | undefined) ?? `HTTP ${res.status}`);
    generated = (data.generated as number | undefined) ?? 0;
    failed    = (data.failed    as number | undefined) ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[build-for-me] process failed:", msg);
    // Build succeeded — return partial result rather than 500
    return NextResponse.json({ ok: true, queued, generated: 0, failed: 0 });
  }

  return NextResponse.json({ ok: true, queued, generated, failed });
}
