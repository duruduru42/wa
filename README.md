# AI 오답노트 — Phase 1 (MVP)

사진 한 장으로 틀린 문제를 넣으면 AI가 **유형·오답 원인을 분석 → 풀이를 검산 → 유사문제를 생성 → 오답노트로 정리**해주는 학습 서비스.

이 저장소는 빌드 스펙의 **Phase 1 (MVP)** 구현입니다. 단일 사용자, 캡처→추출→정답·풀이→틀린이유→유사문제(모드 A)→오답노트 목록/뷰. 검산은 sympy 기본형.

## 구성

```
wa/
├─ web/        Next.js 16 (App Router) PWA + Route Handlers   ← Windows에서 실행
├─ verifier/   sympy 검산 마이크로서비스 (stdlib http.server) ← Windows에서 실행
└─ supabase/   로컬 Postgres + Storage (WSL2 Ubuntu)          ← WSL2에서 실행
```

파이프라인(스펙 §3): **Stage 1 추출(Vision)** → **2 정답·풀이** → **3 검산(sympy 우선, 불가 시 2차 LLM)** → **4 오답원인·태깅** → **5 유사문제**. 각 스테이지는 독립 재실행 가능.

## 사전 준비

1. **Anthropic API 키**: `web/.env.local` 의 `ANTHROPIC_API_KEY` 를 실제 키로 교체.
2. 로컬 환경: Windows에 Node 20+, WSL2 Ubuntu에 Docker + supabase CLI (이미 셋업됨).

## 실행 (터미널 3개)

### ① Supabase (WSL2)
```bash
wsl -d Ubuntu -u root
service docker start
cd /mnt/c/Users/esfg5/Desktop/wa
supabase start          # 최초 실행 시 마이그레이션 + seed 자동 적용
# 출력된 API URL / anon key / service_role key 가 web/.env.local 과 일치하는지 확인
# VM 유휴 종료 방지: (별도 셸) wsl -d Ubuntu -u root -e sleep infinity
```

### ② 검산 서비스 (Windows)
```bash
cd verifier
./.venv/Scripts/python.exe verifier.py    # http://127.0.0.1:8000
```

### ③ 웹 (Windows)
```bash
cd web
npm run dev               # http://localhost:3000
```

## 사용 흐름

1. `/capture` 에서 문제 사진 업로드 → Stage 1 추출.
2. 추출된 LaTeX/답을 확인·교정 (신뢰도 낮으면 경고).
3. **분석하기** → 정답·풀이·검산·오답원인 생성.
4. 상세 화면에서 **유사문제 생성(모드 A)** — 각 변형은 코드 검산을 통과한 것만 ✅ 표시.
5. `/notebook` 에서 원인 태그로 필터링.

## 주의 / 알려진 한계 (Phase 1)

- **RLS·멀티테넌시 미적용**: 단일 사용자 기준. 서버 라우트는 service-role 키 사용. (Phase 3에서 강화)
- **검산 범위**: sympy는 단일변수 방정식 등 수치/대수형에 강함. 서술·증명형은 `unverifiable` 또는 2차 LLM 일관성 점검으로 폴백. `mismatch` 는 사용자에게 솔직히 노출.
- **PDF 내보내기**: Phase 2 (Playwright 경로). 데이터는 PDF화 가능 구조로 저장됨.
- Supabase 데모 키는 로컬 전용 공개 키입니다.

## 다음 단계 (스펙 §9)

- **Phase 2**: PDF 내보내기, 원인 태깅 통계, 유사문제 재채점 루프(attempts), 모드 B.
- **Phase 3 (B2B)**: 멀티테넌시·RLS, 학원 대시보드, 과제 출제, 학부모 리포트(Solapi).
