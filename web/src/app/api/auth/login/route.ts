import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { errMsg } from "@/lib/err";
import { createRLSClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 네이티브 폼 POST(JS 불필요) + JSON 둘 다 지원.
// 폼이면 서버에서 세션쿠키 설정 후 303 리다이렉트 → WebView 하이드레이션과 무관하게 동작.
export async function POST(req: Request) {
  const ctype = req.headers.get("content-type") || "";
  const isForm =
    ctype.includes("application/x-www-form-urlencoded") ||
    ctype.includes("multipart/form-data");

  if (isForm) {
    const form = await req.formData();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const cookieStore = await cookies();

    // 상대경로 Location 사용 — 터널이 Host를 localhost로 바꿔도 폰에서 올바르게 해석됨.
    // 쿠키를 응답에 직접 싣기 위해 응답 객체에 바인딩.
    const resp = new NextResponse(null, {
      status: 303,
      headers: { Location: "/" },
    });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) =>
              resp.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return new NextResponse(null, {
        status: 303,
        headers: { Location: `/login?error=${encodeURIComponent(error.message)}` },
      });
    }
    return resp;
  }

  // JSON 경로(프로그램용, 호환 유지)
  try {
    const { email, password } = (await req.json()) as {
      email: string;
      password: string;
    };
    const supabase = await createRLSClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
