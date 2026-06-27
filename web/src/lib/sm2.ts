// SM-2 간격반복 알고리즘 (SuperMemo-2)
export interface SrsState {
  interval: number; // 일
  ease: number; // 용이도(>=1.3)
  reps: number; // 연속 성공 횟수
}

// quality: 0~5 (3 미만이면 실패 → 리셋). 앱은 2(또틀림)/3(애매)/5(완벽) 사용.
export function sm2(state: SrsState, quality: number): SrsState {
  let { interval, ease, reps } = state;
  if (quality < 3) {
    reps = 0;
    interval = 1; // 내일 다시
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps += 1;
  }
  ease = Math.max(
    1.3,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  return { interval, ease, reps };
}

export function dueAfterDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}
