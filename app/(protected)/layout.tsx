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

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error in protected layout:', authError);
      redirect("/");
    }

    if (!user) {
      redirect("/");
    }

    // Check if user is onboarded
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error in protected layout:', profileError);
      // If profile doesn't exist or error, redirect to signup for onboarding
      redirect("/signup");
    }

    if (!profile || profile.onboarded !== true) {
      // User exists but not onboarded, redirect to complete onboarding
      redirect("/signup");
    }

    // User is authenticated and onboarded, allow access
    return <>{children}</>;
  } catch (error) {
    console.error('Unexpected error in protected layout:', error);
    redirect("/");
  }
}