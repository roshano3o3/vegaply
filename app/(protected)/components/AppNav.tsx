"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/home",        label: "Home"       },
  { href: "/auto-apply",  label: "Auto-Apply" },
  { href: "/profile",     label: "Profile"    },
];

export default function AppNav() {
  const pathname = usePathname();

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
          <span className="app-nav-pill">Beta</span>
        </div>
      </nav>
    </>
  );
}
