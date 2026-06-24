import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { Stage2Schema, type Stage2 } from "./schemas";

const SYSTEM = `너는 중·고등 수학 풀이 전문가다. 주어진 문제의 정답과 단계별 모범 풀이를 작성한다.
- correct_answer: 최종 정답(간결하게).
- solution_steps: 단계별 배열. 검산/PDF에서 재사용되므로 논리적 비약이 없어야 한다.
- key_concepts: 핵심 개념/공식 목록.
- difficulty: 1(쉬움)~5(어려움).

수식 표기(가독성 필수): 모든 수식·기호는 반드시 $...$ 로 감싼다.
- 예: $x^2 - 5x + 6 = 0$, $\\alpha + \\beta = 5$, $\\frac{1}{2}$, $\\sqrt{2}$.
- 분수 $\\frac{a}{b}$, 제곱근 $\\sqrt{}$, 그리스문자 $\\alpha$ 등은 LaTeX로 쓰되 반드시 $...$ 안에 넣는다.
- $...$ 밖에 \\frac, \\alpha 같은 명령을 노출하지 마라(앱에서 깨져 보인다).`;

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
    // 어려운 문제는 풀이가 길어 JSON이 잘리지 않게 넉넉히
    maxTokens: 8192,
  });
}
