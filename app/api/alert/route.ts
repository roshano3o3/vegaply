import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, jobs, jobRole, location } = await req.json();

    if (!email || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json(
        { error: "Missing email or jobs" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const jobList = jobs
      .slice(0, 10)
      .map((j: any, i: number) => {
        const title = j.job_title || "Untitled role";
        const company = j.employer_name || "Unknown company";
        const jobLocation = [j.job_city, j.job_state, j.job_country]
          .filter(Boolean)
          .join(", ");
        const link = j.job_apply_link || "";
        return `${i + 1}. ${title} at ${company}${
          jobLocation ? ` (${jobLocation})` : ""
        }\n${link}`;
      })
      .join("\n\n");

    const subject =
      jobRole && location
        ? `Vegaply AI - ${jobRole} jobs in ${location}`
        : jobRole
        ? `Vegaply AI - ${jobRole} job alerts`
        : "Vegaply AI - Your latest job alerts";

    const contextLine =
      jobRole && location
        ? `Here are your latest ${jobRole} matches in ${location}:\n\n`
        : jobRole
        ? `Here are your latest ${jobRole} matches:\n\n`
        : "Here are your latest job matches:\n\n";

    await transporter.sendMail({
      from: `"Vegaply AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: `${contextLine}${jobList}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert route error:", error);
    return NextResponse.json(
      { error: "Failed to send email alert" },
      { status: 500 }
    );
  }
}