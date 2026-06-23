import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

// JS 불필요 네이티브 폼 — WebView 하이드레이션과 무관하게 항상 동작.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4 pt-8">
      <h1 className="text-xl font-bold">로그인</h1>
      <form action="/api/auth/login" method="POST" className="space-y-3">
        <input
          name="email"
          type="email"
          defaultValue="student@wa.test"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="이메일"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          defaultValue="password123"
          placeholder="비밀번호"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          로그인
        </button>
      </form>
      {error && (
        <Card className="text-sm text-red-600">{decodeURIComponent(error)}</Card>
      )}
      <Card className="text-xs text-muted">
        데모 계정: teacher@ / parent@ / student@wa.test · 비번 password123
      </Card>
    </div>
  );
}
