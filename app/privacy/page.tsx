import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy – Vegaply",
  description: "Read Vegaply's privacy policy to learn how we collect, use, and protect your personal information.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy – Vegaply",
    description: "Read Vegaply's privacy policy to learn how we collect, use, and protect your personal information.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
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
          <h1 className="pg-title">Privacy Policy</h1>
          <p className="pg-meta">Last updated: April 15, 2026 · Effective immediately</p>

          <div className="pg-highlight" style={{ marginBottom: 44 }}>
            The short version: We collect only what we need to power your job search. We never sell your data. You can delete your account and all associated data at any time.
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">1. Data We Collect</h2>
            <p className="pg-p">When you create an account and use Vegaply, we collect the following information:</p>
            <ul className="pg-ul">
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Email address</strong> — used to create your account, send job alerts, and communicate with you.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Resume content</strong> — the text extracted from any PDF or document you upload. This is used exclusively to power AI matching and tailoring features.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Job search preferences</strong> — your job role, location, employment type filters, and saved/tracked jobs.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Usage data</strong> — basic interaction data (features used, session timestamps) to improve the product. No keystroke tracking.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Authentication data</strong> — if you sign in with Google, we receive your name and email from Google via OAuth. We do not receive your Google password.</li>
            </ul>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">2. How We Use Your Data</h2>
            <p className="pg-p">Your data is used solely to provide and improve the Vegaply service. Specifically:</p>
            <ul className="pg-ul">
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>AI matching</strong> — your resume text is sent to our AI provider (Anthropic) to generate match scores, tailored bullet points, cover letters, and interview prep. Anthropic does not retain your data for training.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Job alerts</strong> — your email and preferences are used to send you early-bird job notifications you explicitly opt into.</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Product improvement</strong> — aggregated, anonymized usage data helps us understand which features are valuable and where to invest.</li>
            </ul>
            <div className="pg-highlight">
              We do <strong style={{ color: "#fff" }}>not</strong> sell, rent, or share your personal data with advertisers, data brokers, recruiters, or any third party for commercial purposes. Ever.
            </div>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">3. Data Security</h2>
            <p className="pg-p">We take security seriously and use industry-standard practices to protect your data:</p>
            <ul className="pg-ul">
              <li>All data is stored in <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Supabase</strong>, which encrypts data at rest (AES-256) and in transit (TLS 1.3).</li>
              <li>Passwords are hashed using bcrypt and never stored in plaintext.</li>
              <li>Resume text and preferences are stored in your user-scoped database row — other users cannot access your data.</li>
              <li>API keys and secrets are stored in environment variables, never in client-side code.</li>
            </ul>
            <p className="pg-p">While we implement strong security measures, no system is 100% impenetrable. In the event of a breach affecting your data, we will notify you by email within 72 hours.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">4. Data Retention & Deletion</h2>
            <p className="pg-p">Your data is retained for as long as your account is active. You can delete your account at any time from account settings, which permanently removes your email, resume, saved jobs, and all preferences from our systems within 30 days.</p>
            <p className="pg-p">Anonymized, aggregated usage statistics (no personal identifiers) may be retained indefinitely for product analytics.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">5. Cookies & Local Storage</h2>
            <p className="pg-p">Vegaply uses browser local storage (not third-party cookies) to remember your search preferences, dark mode setting, and session state. We use essential cookies and similar storage needed to operate the service. We may also use analytics tools and session replay tools to understand product usage and improve the experience. We do not use advertising pixels to build third-party ad profiles.</p>
          </div>

          <div className="pg-section">
            <h2 className="pg-h2">6. Third-Party Services</h2>
            <p className="pg-p">We use the following third-party services to operate Vegaply. Each has their own privacy policy:</p>
            <ul className="pg-ul">
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Supabase</strong> — authentication and database hosting</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Anthropic (Claude)</strong> — AI analysis of resumes and job descriptions</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>JSearch (RapidAPI)</strong> — live job listing data</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Google OAuth</strong> — optional sign-in (governed by Google's privacy policy)</li>
              <li><strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Stripe</strong> — payment processing for Pro subscriptions. Stripe handles all payment card data directly; Vegaply never stores or has access to your full card number, CVV, or full billing details. We do store a Stripe customer identifier and your subscription status in our own database so we can manage your plan and access level.</li>
            </ul>
          </div>

          <div className="pg-divider" />

          <div className="pg-section">
            <h2 className="pg-h2">7. Contact</h2>
            <p className="pg-p">For privacy questions, data deletion requests, or concerns, contact us at:</p>
            <p className="pg-p">
              <a href="mailto:support@vegaply.com" className="pg-link">support@vegaply.com</a>
            </p>
            <p className="pg-p" style={{ marginTop: 8 }}>We aim to respond within 2 business days.</p>
          </div>
        </div>
      </div>
    </>
  );
}
