import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Just check if user exists - onboarding handled in home page
  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen w-full relative" style={{
      background: "radial-gradient(ellipse at top, #1a1530 0%, #0a0a0c 50%, #050507 100%)",
    }}>
      {/* Ambient glow blobs — fixed so they stay during scroll */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />

      <div className="relative z-10">{children}</div>
    </div>
  );
}