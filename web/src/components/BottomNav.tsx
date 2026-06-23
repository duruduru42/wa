"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/capture", label: "등록", icon: "📷" },
  { href: "/notebook", label: "오답노트", icon: "📒" },
  { href: "/stats", label: "통계", icon: "📊" },
  { href: "/academy", label: "학원", icon: "🏫" },
];

export function BottomNav() {
  const path = usePathname() || "/";
  // 로그인 화면 등에선 숨김
  if (path === "/login") return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl">
        {ITEMS.map((it) => {
          const active =
            it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
