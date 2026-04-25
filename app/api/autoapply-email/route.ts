import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { email, jobTitle, company, location, appliedDate, score, userName } = await req.json();

    if (!email || !jobTitle || !company) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const firstName = userName ? userName.split(" ")[0] : "there";
    const appliedTime = new Date(appliedDate).toLocaleString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
    .details { background: white; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; }
    .detail-row { display: flex; margin-bottom: 8px; }
    .detail-label { font-weight: 600; width: 120px; color: #666; }
    .detail-value { flex: 1; color: #333; }
    .score { font-size: 24px; font-weight: 700; margin: 8px 0; }
    .score.high { color: #10b981; }
    .score.medium { color: #f59e0b; }
    .score.low { color: #ef4444; }
    .footer { color: #666; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #ddd; }
    .cta { background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Application Submitted</h1>
      <p>You're one step closer to your next opportunity!</p>
    </div>
    
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>You just applied to <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Role:</span>
          <span class="detail-value">${jobTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company:</span>
          <span class="detail-value">${company}</span>
        </div>
        ${location ? `<div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${location}</span>
        </div>` : ""}
        <div class="detail-row">
          <span class="detail-label">Applied:</span>
          <span class="detail-value">${appliedTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ATS Match:</span>
          <span class="detail-value"><span class="score ${score >= 70 ? "high" : score >= 50 ? "medium" : "low"}">${score}%</span></span>
        </div>
      </div>
      
      <p>Your tailored resume has been submitted with this application. Next steps:</p>
      <ol>
        <li>Monitor your email for responses from ${company}</li>
        <li>Track this application in your Vegaply Tracker</li>
        <li>Prepare for interviews with our Interview Prep tool</li>
      </ol>
      
      <a href="https://vegaply.com/home" class="cta">📋 View in Tracker</a>
    </div>
    
    <div class="footer">
      <p>Good luck! 🚀</p>
      <p>— Vegaply Team<br>vegaply.com</p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@vegaply.com",
      to: email,
      subject: `✅ Applied to ${jobTitle} at ${company} — Vegaply`,
      html: htmlBody,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Email send failed:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}