"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthControls({ email }: { email: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!email) {
    return (
      <Link href="/login" className="hover:text-primary">
        로그인
      </Link>
    );
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="text-muted hover:text-primary"
      title={email}
    >
      {email.split("@")[0]} · 로그아웃
    </button>
  );
}
