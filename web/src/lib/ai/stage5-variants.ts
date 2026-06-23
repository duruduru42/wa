import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { Stage5Schema, type Stage2, type Variant } from "./schemas";

const SYSTEM_A = `너는 수학 유사문제 출제자다. 원문제와 '구조·접근법은 동일하게 유지'하고 '수치만 변경'한
유사문제(모드 A)를 만든다. 각 문제마다 generated_answer 와 generated_solution_steps 를 반드시 함께 생성한다.
정답이 틀린 유사문제는 절대 안 된다 — 풀이를 직접 검토하고 정답을 확정하라.`;

const SYSTEM_B = `너는 수학 유사문제 출제자다. 원문제와 '동일한 개념/유형'이되 '새로운 상황·맥락'의
유사문제(모드 B)를 만든다. 각 문제마다 generated_answer 와 generated_solution_steps 를 반드시 함께 생성한다.
정답이 틀린 유사문제는 절대 안 된다 — 풀이를 직접 검토하고 정답을 확정하라.`;

export async function runStage5Variants(input: {
  problem_latex: string;
  stage2: Stage2;
  mode: "A" | "B";
  count?: number;
  difficultyDelta?: number; // 모드 B 난이도 ±1
}): Promise<Variant[]> {
  const count = input.count ?? 3;
  const steps = input.stage2.solution_steps
    .map((s, i) => `${i + 1}. ${s.detail}`)
    .join("\n");
  const user = `[원문제]\n${input.problem_latex}
[원문제 정답]\n${input.stage2.correct_answer}
[원문제 풀이]\n${steps}
[원문제 난이도]\n${input.stage2.difficulty}

유사문제 ${count}개를 생성하라.${
    input.mode === "B" && input.difficultyDelta
      ? ` 난이도는 원본 대비 ${input.difficultyDelta > 0 ? "+" : ""}${input.difficultyDelta} 수준으로.`
      : ""
  }`;
  const res = await callJSON({
    model: MODELS.variant,
    system: input.mode === "A" ? SYSTEM_A : SYSTEM_B,
    user,
    schema: Stage5Schema,
    maxTokens: 4096,
    temperature: 0.4,
  });
  return res.variants.slice(0, count);
}
