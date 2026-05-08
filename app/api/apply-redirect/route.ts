import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hashToken } from "@/lib/apply/apply-token";

function htmlError(status: number, title: string, message: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — Vegaply</title></head>` +
    `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;` +
    `padding:64px 24px;background:#060608;color:#f5f5f7">` +
    `<p style="font-size:32px;margin:0 0 16px">🔒</p>` +
    `<h1 style="font-size:22px;font-weight:700;margin:0 0 10px">${title}</h1>` +
    `<p style="color:rgba(255,255,255,0.45);font-size:15px;margin:0 0 28px;line-height:1.6">${message}</p>` +
    `<a href="/" style="color:#f59e0b;font-size:14px;text-decoration:none">Go to Vegaply →</a>` +
    `</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return htmlError(400, "Missing apply token", "This apply link is missing a token.");
  }

  const tokenHash = hashToken(token);
  const supabase  = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("daily_queue")
    .select("id, job_apply_link, apply_token_expires_at")
    .eq("apply_token", tokenHash)
    .gt("apply_token_expires_at", new Date().toISOString())
    .single();

  if (error || !data?.job_apply_link) {
    return htmlError(404, "Apply link expired", "This apply link is invalid or expired.");
  }

  // Record click time — best-effort, non-fatal
  const { error: clickErr } = await supabase
    .from("daily_queue")
    .update({ apply_clicked_at: new Date().toISOString() })
    .eq("id", data.id);
  if (clickErr) {
    console.error("[apply-redirect] click update failed:", clickErr.message);
  }

  return NextResponse.redirect(data.job_apply_link, 302);
}
