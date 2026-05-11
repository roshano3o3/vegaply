import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up – Vegaply",
  description: "Create your free Vegaply account and start finding early-bird jobs with AI resume matching and H1B sponsor detection.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Sign Up – Vegaply",
    description: "Create your free Vegaply account and start finding early-bird jobs with AI resume matching and H1B sponsor detection.",
    url: "/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
