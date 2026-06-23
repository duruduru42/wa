import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { createRLSClient } from "@/lib/supabase/server";
import { AuthControls } from "@/components/AuthControls";

export const metadata: Metadata = {
  title: "AI 오답노트",
  description: "사진 한 장으로 오답을 분석·검산·유사문제까지",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-primary">
              AI 오답노트
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/capture" className="hover:text-primary">
                새 오답 등록
              </Link>
              <Link href="/notebook" className="hover:text-primary">
                오답노트
              </Link>
              <Link href="/stats" className="hover:text-primary">
                통계
              </Link>
              <Link href="/academy" className="hover:text-primary">
                학원
              </Link>
              <AuthControls email={user?.email ?? null} />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
