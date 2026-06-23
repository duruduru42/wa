import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버 전용 service-role 클라이언트.
// Phase 1은 RLS 미적용(단일 사용자) → 모든 서버 라우트에서 이 클라이언트로 R/W.
// Phase 3에서 RLS + 사용자 세션 클라이언트로 분리.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
