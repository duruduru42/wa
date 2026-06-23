import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next 16: middleware → proxy. Supabase 세션 토큰을 매 요청마다 갱신해
// 서버 컴포넌트의 RLS 클라이언트가 유효한 세션을 읽도록 한다.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 클라이언트 페이지(/capture)는 서버에서 리다이렉트 못 하므로 여기서 보호
  if (!user && request.nextUrl.pathname.startsWith("/capture")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 정적 자산·API·이미지 제외
  matcher: ["/((?!api|_next/static|_next/image|favicon|.*\\.(?:png|ico|svg)$).*)"],
};
