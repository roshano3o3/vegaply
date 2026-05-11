import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In – Vegaply",
  description: "Log in to your Vegaply account to access your daily job queue, AI-tailored resumes, and application tracker.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Log In – Vegaply",
    description: "Log in to your Vegaply account to access your daily job queue, AI-tailored resumes, and application tracker.",
    url: "/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
