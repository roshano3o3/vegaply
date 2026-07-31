"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/home",        label: "Home"       },
  { href: "/auto-apply",  label: "Daily Pack"  },
  { href: "/profile",     label: "Profile"    },
];

export default function AppNav() {
  const pathname = usePathname();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("is_pro").eq("id", user.id).single()
        .then(({ data }) => { if (data) setIsPro(!!data.is_pro); });
    });
  }, []);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch { /* silent — user can retry */ }
    finally { setUpgradeLoading(false); }
  };

  return (
    <>
      <style>{`
        .app-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 200;
          height: 56px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          background: rgba(10, 10, 12, 0.82);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          border-bottom: 1px solid var(--border);
        }

        .app-nav-wordmark {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: var(--grad-text);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          flex-shrink: 0;
          margin-right: 32px;
        }

        .app-nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
        }

        .app-nav-link {
          font-family: var(--font-primary);
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-dim);
          text-decoration: none;
          padding: 5px 12px;
          border-radius: var(--radius-sm);
          transition: color 150ms ease, background 150ms ease;
          letter-spacing: 0.01em;
        }

        .app-nav-link:hover {
          color: var(--text-primary);
          background: var(--surface-hover);
        }

        .app-nav-link.active {
          color: var(--primary-light);
          background: var(--primary-subtle);
        }

        .app-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .app-nav-pill {
          font-family: var(--font-primary);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--primary);
          background: var(--primary-subtle);
          border: 1px solid var(--border-amber);
          border-radius: 100px;
          padding: 3px 10px;
          line-height: 1.5;
        }

        .app-nav-upgrade {
          font-family: var(--font-primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: #1a1a1f;
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          border: none;
          border-radius: 100px;
          padding: 5px 14px;
          line-height: 1.5;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .app-nav-upgrade:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .app-nav-upgrade:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 480px) {
          .app-nav {
            padding: 0 16px;
          }
          .app-nav-wordmark {
            margin-right: 20px;
          }
          .app-nav-link {
            padding: 5px 8px;
            font-size: 13px;
          }
          .app-nav-pill {
            display: none;
          }
        }
      `}</style>

      <nav className="app-nav">
        <Link href="/home" className="app-nav-wordmark">
          Vegaply
        </Link>

        <div className="app-nav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`app-nav-link${pathname === href || pathname.startsWith(href + "/") ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="app-nav-right">
          {isPro === false && (
            <button className="app-nav-upgrade" onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? "Redirecting…" : "Upgrade"}
            </button>
          )}
          <span className="app-nav-pill">Beta</span>
        </div>
      </nav>
    </>
  );
}
