import "server-only";
import { z } from "zod";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { answersEqualSympy } from "./verifier";

export interface GradeResult {
  is_correct: boolean | null;
  method: "sympy" | "llm" | "unknown";
  note: string;
}

const LlmGradeSchema = z.object({
  is_correct: z.boolean(),
  note: z.string(),
});

/**
 * 재채점 (스펙 §9 Phase2). 우선 sympy 동등성으로 채점(키 불필요).
 * sympy가 판정 못 하면 LLM으로 폴백, 그조차 불가(키 없음 등)면 보류(null).
 */
export async function gradeAnswer(input: {
  problem_latex: string;
  expected_answer: string;
  submitted_answer: string;
}): Promise<GradeResult> {
  const sym = await answersEqualSympy({
    submitted_answer: input.submitted_answer,
    expected_answer: input.expected_answer,
  });
  if (sym.ok && sym.equal !== null) {
    return { is_correct: sym.equal, method: "sympy", note: sym.note };
  }

  try {
    const llm = await callJSON({
      model: MODELS.cheap,
      system:
        "너는 수학 채점관이다. 문제와 정답을 보고, 학생의 제출답이 정답과 수학적으로 동등한지 판정한다. 표기 차이(순서·형식)는 같은 것으로 본다.",
      user: `[문제]\n${input.problem_latex}\n[정답]\n${input.expected_answer}\n[제출답]\n${input.submitted_answer}\n\nis_correct(true/false)와 note를 반환.`,
      schema: LlmGradeSchema,
      temperature: 0,
      maxTokens: 512,
    });
    return { is_correct: llm.is_correct, method: "llm", note: llm.note };
  } catch (e) {
    return {
      is_correct: null,
      method: "unknown",
      note: `자동 채점 보류 (${sym.note}; LLM 폴백 불가: ${String(e)})`,
    };
  }
}
