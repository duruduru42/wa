import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { createRLSClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthControls } from "@/components/AuthControls";
import { BottomNav } from "@/components/BottomNav";
import { BackButtonHandler } from "@/components/BackButtonHandler";

export const metadata: Metadata = {
  title: "AI 오답노트",
  description: "사진 한 장으로 오답을 분석·검산·유사문제까지",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  // 교사/관리자만 학원 탭 노출 (학생 계정엔 숨김)
  let isStaff = false;
  if (user) {
    const { data } = await createAdminClient()
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .in("role", ["teacher", "admin"])
      .limit(1)
      .maybeSingle();
    isStaff = !!data;
  }
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header
          className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-primary">
              AI 오답노트
            </Link>
            <AuthControls email={user?.email ?? null} />
          </div>
        </header>
        {/* 하단 탭바 높이만큼 pb 확보 */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5">
          {children}
        </main>
        <BottomNav isStaff={isStaff} />
        <BackButtonHandler />
      </body>
    </html>
  );
}
