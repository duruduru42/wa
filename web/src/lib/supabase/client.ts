import { createClient } from "@supabase/supabase-js";

// 브라우저용 anon 클라이언트 (읽기 위주). Phase 1은 RLS off라 공개 읽기 가능.
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
