import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 30;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { user_id?: string };
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ ok: false, error: "Missing user_id" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user_id)
      .single();

    if (error || !data?.email) {
      return NextResponse.json({ ok: false, error: "No email for this user" }, { status: 400 });
    }

    const to = data.email as string;

    const result = await resend.emails.send({
      from: "ApplySmart <noreply@applysmart.ai>",
      to,
      subject: "ApplySmart test email",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;padding:32px">
          <h2 style="margin:0 0 12px">Test email from ApplySmart</h2>
          <p style="margin:0 0 8px">If you see this, your notification address is set up correctly.</p>
          <p style="margin:0;color:#6b7280;font-size:13px">User ID: <code>${user_id}</code></p>
        </body>
        </html>
      `,
    });

    return NextResponse.json({ ok: true, to, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
