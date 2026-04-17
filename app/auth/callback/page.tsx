"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!data.session?.user) {
          console.error('No session found after auth callback');
          router.push("/");
          return;
        }

        // Check onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', data.session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error in auth callback:', profileError);
          // If profile doesn't exist, redirect to signup for onboarding
          router.push("/signup");
          return;
        }

        if (!profile || profile.onboarded !== true) {
          // User exists but not onboarded, redirect to complete onboarding
          router.push("/signup");
          return;
        }

        // User is onboarded, redirect to home
        router.push("/home");
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060608',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#818cf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div>Completing sign in...</div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060608',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '18px', marginBottom: '16px' }}>Sign in failed</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
            {error}
          </div>
          <button
            onClick={() => router.push("/")}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return null;
}