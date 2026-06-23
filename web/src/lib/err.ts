// Supabase/PostgREST 에러는 객체라 String(e)='[object Object]' 가 된다.
// 메시지/코드/details 를 사람이 읽을 수 있게 직렬화.
export function errMsg(e: unknown): string {
  if (e == null) return "unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    const parts = [o.message, o.code, o.details, o.hint]
      .filter((x) => typeof x === "string" && x)
      .join(" | ");
    if (parts) return parts;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
