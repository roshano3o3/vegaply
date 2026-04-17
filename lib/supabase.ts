import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Supabase URL exists:', !!supabaseUrl);
console.log('🔍 Supabase URL length:', supabaseUrl?.length);

// Validate URL format
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is missing');
}

if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error(`NEXT_PUBLIC_SUPABASE_URL is malformed. Expected format: https://[project-ref].supabase.co, got: ${supabaseUrl}`);
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing');
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);