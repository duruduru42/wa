import type { WrongItem } from "./types";

// 학생 오답 → 학부모 리포트 문구 (스펙 §6-7). 순수 함수 — 테스트/재사용 용이.
export function buildParentReport(input: {
  academyName: string;
  studentName: string;
  items: WrongItem[];
}): string {
  const { academyName, studentName, items } = input;
  const tagCount = new Map<string, number>();
  const unitCount = new Map<string, number>();
  let mismatch = 0;
  for (const it of items) {
    for (const t of it.error_tags ?? [])
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const u = it.unit ?? "기타";
    unitCount.set(u, (unitCount.get(u) ?? 0) + 1);
    if (it.verification_status === "mismatch") mismatch++;
  }
  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t]) => t);
  const units = [...unitCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([u, c]) => `${u} ${c}건`);

  const lines = [
    `[${academyName}] ${studentName} 학생 학습 리포트`,
    `누적 오답 ${items.length}건`,
    topTags.length ? `주요 약점: ${topTags.join(", ")}` : "",
    units.length ? `단원별: ${units.join(", ")}` : "",
    mismatch > 0 ? `※ 검산 불일치 ${mismatch}건 — 정답 확인 권장` : "",
    units[0]
      ? `가정에서 '${units[0].split(" ")[0]}' 복습을 권장드립니다.`
      : "",
  ].filter(Boolean);

  return lines.join("\n");
}
