import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createRLSClient } from "@/lib/supabase/server";

// write 라우트 인증/인가 게이트 (스펙 §7-6). service-role write는 RLS를 우회하므로
// 라우트 진입 시 세션·역할을 코드로 검증해 익명/타테넌트 호출을 차단한다.
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** 로그인 세션 필수. 없으면 401. */
export async function requireUser(): Promise<User> {
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) throw new AuthError(401, "로그인이 필요합니다");
  return user;
}

/** 해당 테넌트의 교사/관리자 멤버십 필수. 없으면 403. */
export async function requireTenantStaff(
  admin: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  const { data, error } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .in("role", ["teacher", "admin"])
    .maybeSingle();
  if (error) throw new AuthError(500, error.message);
  if (!data) throw new AuthError(403, "권한 없음 (해당 학원의 교사/관리자가 아님)");
}

/** 라우트 catch에서 AuthError → 적절한 상태코드로 변환. */
export function authErrorResponse(e: unknown): { status: number; error: string } | null {
  if (e instanceof AuthError) return { status: e.status, error: e.message };
  return null;
}
