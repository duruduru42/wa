import "server-only";
import { z } from "zod";
import { VerifierResultSchema, type VerifierResult } from "./schemas";

const EqualSchema = z.object({
  ok: z.boolean(),
  equal: z.boolean().nullable(),
  note: z.string(),
});

/** 두 답안의 수학적 동등성(재채점용). 서비스 불가/해석불가 시 ok=false. */
export async function answersEqualSympy(input: {
  submitted_answer: string;
  expected_answer: string;
}): Promise<z.infer<typeof EqualSchema>> {
  const base = process.env.VERIFIER_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${base}/equal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, equal: null, note: `verifier ${res.status}` };
    return EqualSchema.parse(await res.json());
  } catch (e) {
    return { ok: false, equal: null, note: `verifier 호출 실패: ${String(e)}` };
  }
}

/**
 * sympy 마이크로서비스(verifier/) 호출.
 * 수치/대수형 문제의 모범답안을 코드 실행으로 독립 재검증 (스펙 §3 Stage 3).
 * 서비스가 꺼져 있거나 해석 불가하면 ok=false 로 graceful degrade.
 */
export async function verifyWithSympy(input: {
  problem_latex: string;
  problem_plaintext?: string | null;
  candidate_answer: string;
}): Promise<VerifierResult> {
  const base = process.env.VERIFIER_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${base}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      // 검산은 짧게: 무한루프성 식 방지를 위해 서비스측에서도 타임아웃
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return {
        ok: false,
        match: null,
        computed: null,
        note: `verifier ${res.status}`,
      };
    }
    return VerifierResultSchema.parse(await res.json());
  } catch (e) {
    return {
      ok: false,
      match: null,
      computed: null,
      note: `verifier 호출 실패: ${String(e)}`,
    };
  }
}
