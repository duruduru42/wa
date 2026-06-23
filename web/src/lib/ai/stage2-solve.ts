import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { Stage2Schema, type Stage2 } from "./schemas";

const SYSTEM = `너는 중·고등 수학 풀이 전문가다. 주어진 문제의 정답과 단계별 모범 풀이를 작성한다.
- correct_answer: 최종 정답(간결하게, 필요하면 LaTeX).
- solution_steps: 단계별 배열. 각 step의 detail은 LaTeX 수식을 포함할 수 있다. 검산/PDF에서 재사용되므로 논리적 비약이 없어야 한다.
- key_concepts: 핵심 개념/공식 목록.
- difficulty: 1(쉬움)~5(어려움).`;

export async function runStage2Solve(input: {
  problem_latex: string;
  problem_text?: string | null;
}): Promise<Stage2> {
  const user = `다음 문제를 풀어라.\n[problem_latex]\n${input.problem_latex}\n${
    input.problem_text ? `\n[평문]\n${input.problem_text}` : ""
  }`;
  return callJSON({
    model: MODELS.solve,
    system: SYSTEM,
    user,
    schema: Stage2Schema,
    maxTokens: 3072,
  });
}
