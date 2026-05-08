import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const maxDuration = 15;

// ── Types ─────────────────────────────────────────────────────────────────────

type DiagnosisReason = "no_subscription" | "profile_incomplete" | "queue_not_built" | "ready";

export interface MeStatusResult {
  has_active_subscription: boolean;
  profile_complete:        boolean;
  missing:                 string[];
  has_queue_today:         boolean;
  queue_count:             number;
  reason:                  DiagnosisReason;
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

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<MeStatusResult | { error: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toISOString();

  const [subResult, profileResult, queueResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", userId)
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("job_role, default_roles, location, resume_text")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("daily_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("queue_date", today),
  ]);

  // Subscription check
  const hasActiveSub = subResult.data != null;

  // Profile field checks
  const p = profileResult.data;
  const hasRoles    = (Array.isArray(p?.default_roles) && (p.default_roles as string[]).length > 0) || (typeof p?.job_role === "string" && p.job_role.trim().length > 0);
  const hasLocation = typeof p?.location    === "string" && p.location.trim().length    > 0;
  const hasResume   = typeof p?.resume_text === "string" && p.resume_text.trim().length > 0;

  const missing: string[] = [];
  if (!hasRoles)    missing.push("Target roles");
  if (!hasLocation) missing.push("Location");
  if (!hasResume)   missing.push("Resume text");

  const profileComplete = missing.length === 0;
  const queueCount      = queueResult.count ?? 0;
  const hasQueueToday   = queueCount > 0;

  let reason: DiagnosisReason;
  if (!hasActiveSub)      reason = "no_subscription";
  else if (!profileComplete) reason = "profile_incomplete";
  else if (!hasQueueToday)   reason = "queue_not_built";
  else                       reason = "ready";

  return NextResponse.json({
    has_active_subscription: hasActiveSub,
    profile_complete:        profileComplete,
    missing,
    has_queue_today:         hasQueueToday,
    queue_count:             queueCount,
    reason,
  });
}
