import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 사용자 세션(쿠키) 기반 클라이언트 — RLS가 auth.uid()로 적용된다 (스펙 §7-6).
// service-role(admin.ts)과 달리 RLS를 우회하지 않으므로 멀티테넌시 격리가 실제로 강제됨.
export async function createRLSClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트 렌더 중에는 set 불가 → proxy가 세션을 갱신한다. 조용히 무시.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* server component render context */
          }
        },
      },
    },
  );
}
