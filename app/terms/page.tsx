import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service – Vegaply",
  description: "Review Vegaply's terms of service governing your use of our AI job search platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service – Vegaply",
    description: "Review Vegaply's terms of service governing your use of our AI job search platform.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060608; }
        .pg-root { min-height: 100vh; background: #060608; font-family: 'DM Sans', sans-serif; color: rgba(255,255,255,0.75); }
        .pg-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(6,6,8,0.92); backdrop-filter: blur(12px); z-index: 10; }
        .pg-logo { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: #fff; text-decoration: none; }
        .pg-logo span { font-style: italic; background: linear-gradient(135deg, #818cf8, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .pg-back { font-size: 13px; color: rgba(255,255,255,0.35); text-decoration: none; transition: color .2s; }
        .pg-back:hover { color: rgba(255,255,255,0.7); }
        .pg-wrap { max-width: 760px; margin: 0 auto; padding: 64px 24px 96px; }
        .pg-eyebrow { display: inline-block; font-size: 11px; font-weight: 600; color: #818cf8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px; }
        .pg-title { font-family: 'Playfair Display', serif; font-size: clamp(36px, 5vw, 52px); font-weight: 900; color: #fff; line-height: 1.08; letter-spacing: -1px; margin-bottom: 12px; }
        .pg-meta { font-size: 13px; color: rgba(255,255,255,0.25); margin-bottom: 52px; }
        .pg-section { margin-bottom: 44px; }
        .pg-h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pg-p { font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.75; font-weight: 300; margin-bottom: 12px; }
        .pg-ul { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .pg-ul li { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.65; font-weight: 300; }
        .pg-ul li::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #6366f1; flex-shrink: 0; margin-top: 9px; }
        .pg-highlight { background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15); border-radius: 10px; padding: 16px 18px; font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.65; font-weight: 300; }
        .pg-warning { background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 16px 18px; font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.65; font-weight: 300; margin-bottom: 12px; }
        .pg-link { color: #818cf8; text-decoration: none; }
        .pg-link:hover { text-decoration: underline; }
        .pg-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 48px 0; }
        @media (max-width: 600px) { .pg-nav { padding: 16px 20px; } .pg-wrap { padding: 40px 18px 72px; } }
      `}</style>

      <div className="pg-root">
        <nav className="pg-nav">
          <Link href="/" className="pg-logo">Vega<span>ply</span></Link>
          <Link href="/" className="pg-back">← Back to home</Link>
        </nav>

        <div className="pg-wrap">
          <div className="pg-eyebrow">Legal</div>
          <h1 className="pg-title">Terms of Service</h1>
          <p className="pg-meta">Last updated: April 15, 2026 · Effective immediately</p>

          <div className="pg-highlight" style={{ marginBottom: 44 }}>
            By using Vegaply, you agree to these terms. They're written in plain English — no legalese maze. If you have questions, email us at <a href="mailto:support@vegaply.com" className="pg-link">support@vegaply.com</a>.
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">1. Acceptance of Terms</h2>
            <p className="pg-p">By accessing or using Vegaply ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
            <p className="pg-p">We may update these terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised terms. We'll notify you of material changes by email.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">2. What Vegaply Is</h2>
            <p className="pg-p">Vegaply is a job search tool that helps you find freshly posted job listings and analyze them against your resume using AI. The Service includes:</p>
            <ul className="pg-ul">
              <li>Live job search powered by third-party job listing APIs</li>
              <li>AI-powered resume match scoring, cover letter generation, interview prep, and resume tailoring</li>
              <li>Job application tracking (Kanban board)</li>
              <li>Early Bird alerts for newly posted roles</li>
            </ul>
            <div className="pg-highlight" style={{ marginTop: 12 }}>
              Vegaply is currently free to use. We reserve the right to introduce paid plans in the future — existing free features will remain accessible for a reasonable transition period with advance notice.
            </div>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">3. User Responsibilities</h2>
            <p className="pg-p">By using Vegaply, you agree to:</p>
            <ul className="pg-ul">
              <li>Provide accurate information when creating your account</li>
              <li>Keep your account credentials confidential and notify us immediately of any unauthorized access</li>
              <li>Use the Service only for lawful, personal job-search purposes</li>
              <li>Not attempt to scrape, reverse-engineer, or automate the Service in ways that abuse our infrastructure</li>
              <li>Not submit resume content or job data that you do not have the right to share</li>
              <li>Not use the Service to harass, impersonate, or harm others</li>
            </ul>
            <p className="pg-p">You are responsible for all activity that occurs under your account.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">4. AI-Generated Content</h2>
            <p className="pg-p">Vegaply uses AI (Anthropic Claude) to generate match scores, cover letters, interview questions, and resume suggestions. You acknowledge that:</p>
            <ul className="pg-ul">
              <li>AI-generated content is provided as-is and may contain inaccuracies</li>
              <li>You should review all AI output before submitting it to employers</li>
              <li>Vegaply does not guarantee that using AI features will result in interviews or job offers</li>
              <li>Job match scores are estimates, not guarantees of suitability</li>
            </ul>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">5. Intellectual Property</h2>
            <p className="pg-p">The Vegaply name, logo, design, and codebase are owned by Vegaply. You may not reproduce, distribute, or create derivative works from our intellectual property without written permission.</p>
            <p className="pg-p">Content you upload (your resume, job preferences) remains yours. By uploading it, you grant Vegaply a limited license to process it solely for the purpose of delivering the Service to you.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">6. Third-Party Job Listings</h2>
            <p className="pg-p">Job listings displayed in Vegaply are sourced from third-party APIs and are not posted by Vegaply. We make no representations about:</p>
            <ul className="pg-ul">
              <li>The accuracy or availability of any listed job</li>
              <li>Whether the employer is legitimate</li>
              <li>The terms or outcome of any application you submit</li>
            </ul>
            <p className="pg-p">Always verify job postings independently before sharing personal information with any employer.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">7. Limitation of Liability</h2>
            <div className="pg-warning">
              ⚠️ Vegaply is provided "as is" without warranties of any kind, express or implied. We do not guarantee uptime, data accuracy, or specific outcomes from using the Service.
            </div>
            <p className="pg-p">To the maximum extent permitted by applicable law, Vegaply shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of employment opportunities, loss of data, or business losses arising from your use of the Service.</p>
            <p className="pg-p">Our total liability for any claim arising from use of Vegaply shall not exceed the amount you paid us in the 12 months preceding the claim (which, while the Service is free, is $0).</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">8. Termination</h2>
            <p className="pg-p">You may stop using Vegaply and delete your account at any time. We reserve the right to suspend or terminate accounts that violate these terms, abuse our systems, or engage in fraudulent activity, with or without prior notice.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">9. Governing Law</h2>
            <p className="pg-p">These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration or small claims court, waiving the right to class action proceedings.</p>
          </div>

          <div className="pg-divider" />

          <div className="pg-section">
            <h2 className="pg-h2">10. Contact</h2>
            <p className="pg-p">Questions about these terms? Reach us at:</p>
            <p className="pg-p">
              <a href="mailto:support@vegaply.com" className="pg-link">support@vegaply.com</a>
            </p>
            <p className="pg-p" style={{ marginTop: 8 }}>
              Also see our <Link href="/privacy" className="pg-link">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
