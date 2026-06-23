import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { Stage3Schema, type Stage2, type Stage3 } from "./schemas";
import { verifyWithSympy } from "./verifier";

const LLM_SYSTEM = `너는 수학 풀이를 독립적으로 검증하는 검수자다. 주어진 문제와 '제출된 풀이/정답'의
논리적 일관성만 점검한다. 직접 다시 풀어보고, 제출된 정답이 타당하면 verified, 명백히 틀렸으면 mismatch,
판단 불가(정보 부족/비표준)면 unverifiable 로 분류한다. 산술은 신중히.`;

/**
 * Stage 3 검산. 핵심 원칙: LLM 산술을 단독으로 믿지 않는다 (스펙 §3, §7-2).
 * 1) 수치/대수형 → sympy 코드 실행으로 모범답안 재검증.
 * 2) sympy 해석 불가(증명/서술형) → 독립 2차 LLM 호출(temperature 낮게).
 */
export async function runStage3Verify(input: {
  problem_latex: string;
  problem_plaintext?: string | null;
  stage2: Stage2;
}): Promise<Stage3> {
  const sympy = await verifyWithSympy({
    problem_latex: input.problem_latex,
    problem_plaintext: input.problem_plaintext,
    candidate_answer: input.stage2.correct_answer,
  });

  if (sympy.ok && sympy.match === true) {
    return {
      verification_status: "verified",
      verification_note: `sympy 검산 일치 (계산값: ${sympy.computed ?? "?"})`,
    };
  }
  if (sympy.ok && sympy.match === false) {
    return {
      verification_status: "mismatch",
      verification_note: `sympy 계산값(${sympy.computed ?? "?"})이 모범답안(${input.stage2.correct_answer})과 불일치. 사람 검수 권장.`,
    };
  }

  // sympy 해석 불가 → 독립 2차 LLM 검증
  const steps = input.stage2.solution_steps
    .map((s, i) => `${i + 1}. ${s.detail}`)
    .join("\n");
  const llm = await callJSON({
    model: MODELS.verify,
    system: LLM_SYSTEM,
    user: `[문제]\n${input.problem_latex}\n\n[제출된 정답]\n${input.stage2.correct_answer}\n\n[제출된 풀이]\n${steps}`,
    schema: Stage3Schema,
    temperature: 0,
    maxTokens: 1024,
  });
  // 코드 검산을 거치지 못했음을 note에 명시
  return {
    verification_status: llm.verification_status,
    verification_note: `(sympy 미적용: ${sympy.note}) ${llm.verification_note}`,
  };
}

/** 유사문제 정답 보장용: 단일 답을 코드 검산만으로 빠르게 확인 (스펙 §7-4) */
export async function verifyAnswerOnly(input: {
  problem_latex: string;
  candidate_answer: string;
}): Promise<{ verified: boolean; note: string }> {
  const r = await verifyWithSympy({
    problem_latex: input.problem_latex,
    candidate_answer: input.candidate_answer,
  });
  if (r.ok && r.match === true)
    return { verified: true, note: `sympy 일치(${r.computed ?? "?"})` };
  if (r.ok && r.match === false)
    return { verified: false, note: `sympy 불일치(${r.computed ?? "?"})` };
  return { verified: false, note: `검산 불가: ${r.note}` };
}
