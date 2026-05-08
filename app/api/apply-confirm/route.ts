import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashToken } from "@/lib/apply/apply-token";
import { detectApplyMethod, ApplyMethodResult } from "@/lib/apply/detect-apply-method";
import { analyzeGreenhouseReadiness, GreenhouseReadiness } from "@/lib/apply/greenhouse-readiness";

export const maxDuration = 30;

export interface ConfirmPayload {
  job_title:            string | null;
  employer_name:        string | null;
  match_score:          number | null;
  cover_letter_text:    string | null;
  tailored_resume_text: string | null;
  status:               string;
  apply_clicked_at:     string | null;
  apply_method:         ApplyMethodResult;
  greenhouse_readiness?: GreenhouseReadiness;
}

export async function GET(req: Request): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const supabase  = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: rawData, error } = await supabase
    .from("daily_queue")
    .select(
      "job_title, employer_name, match_score, cover_letter_text, " +
      "tailored_resume_text, status, apply_clicked_at, job_apply_link, user_id",
    )
    .eq("apply_token", tokenHash)
    .gt("apply_token_expires_at", new Date().toISOString())
    .single();

  if (error || !rawData) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const data = rawData as unknown as {
    user_id:              string;
    job_title:            string | null;
    employer_name:        string | null;
    match_score:          number | null;
    cover_letter_text:    string | null;
    tailored_resume_text: string | null;
    status:               string;
    apply_clicked_at:     string | null;
    job_apply_link:       string | null;
  };

  const applyMethod = detectApplyMethod({
    job_apply_link: data.job_apply_link,
    employer_name:  data.employer_name,
  });

  const greenhouseReadiness: GreenhouseReadiness | undefined =
    applyMethod.method === "greenhouse"
      ? await analyzeGreenhouseReadiness({
          job_apply_link: data.job_apply_link,
          employer_name:  data.employer_name,
          job_title:      data.job_title,
        }).catch(() => undefined)
      : undefined;

  // Phase 4C: profile completeness check against Greenhouse required fields
  let finalReadiness = greenhouseReadiness;
  if (finalReadiness != null && finalReadiness.canAnalyze && data.user_id) {
    try {
      const hasStr = (v: string | null | undefined): boolean =>
        typeof v === "string" && v.trim().length > 0;

      const [apResult, prResult, reResult] = await Promise.all([
        supabase
          .from("application_profiles")
          .select("first_name, last_name, phone, linkedin_url, portfolio_url, github_url, work_authorization, authorized_to_work, requires_sponsorship")
          .eq("user_id", data.user_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("location, resume_text")
          .eq("id", data.user_id)
          .maybeSingle(),
        supabase
          .from("resumes")
          .select("file_url")
          .eq("user_id", data.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ap  = apResult.data  as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pr  = prResult.data  as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const re  = reResult.data  as any;

      let emailAvailable = true;
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(data.user_id);
        emailAvailable = hasStr(authData?.user?.email);
      } catch { /* registered users always have email */ }

      const fieldMap: Record<string, boolean> = {
        "First Name":          hasStr(ap?.first_name),
        "Last Name":           hasStr(ap?.last_name),
        "Email":               emailAvailable,
        "Phone":               hasStr(ap?.phone),
        "Resume":              hasStr(re?.file_url) || hasStr(pr?.resume_text),
        "Cover Letter":        hasStr(data.cover_letter_text),
        "LinkedIn Profile":    hasStr(ap?.linkedin_url),
        "Website / Portfolio": hasStr(ap?.portfolio_url) || hasStr(ap?.github_url),
        "Location":            hasStr(pr?.location),
        "Work Authorization":  hasStr(ap?.work_authorization) || (ap?.authorized_to_work != null),
        "Sponsorship":         ap?.requires_sponsorship != null,
      };

      const missing = finalReadiness.requiredFields.filter(f => fieldMap[f] === false);
      finalReadiness = { ...finalReadiness, missingUserProfileFields: missing };
    } catch {
      // Profile check failed — leave missingUserProfileFields as [] (safe fallback)
    }
  }

  const payload: ConfirmPayload = {
    job_title:             data.job_title            ?? null,
    employer_name:         data.employer_name        ?? null,
    match_score:           data.match_score          ?? null,
    cover_letter_text:     data.cover_letter_text    ?? null,
    tailored_resume_text:  data.tailored_resume_text ?? null,
    status:                data.status,
    apply_clicked_at:      data.apply_clicked_at     ?? null,
    apply_method:          applyMethod,
    greenhouse_readiness:  finalReadiness,
    // job_apply_link intentionally excluded — raw link not exposed to client
  };

  return NextResponse.json(payload);
}
