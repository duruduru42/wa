"""
검산 마이크로서비스 (스펙 §3 Stage 3).
수치/대수형 문제를 sympy 코드 실행으로 독립 재검증한다.
LLM 산술을 믿지 않고, 가능한 경우 '코드로 다시 계산'해 모범답안과 대조하는 것이 목적.

설계상 모든 실패는 예외를 던지지 않고 ok=False 로 응답한다(웹은 이때 LLM 2차검증으로 폴백).
의존성: sympy, antlr4-python3-runtime (FastAPI/pydantic 미사용 — Python 3.14 휠 리스크 회피).
"""
from __future__ import annotations
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import sympy as sp

try:
    from sympy.parsing.latex import parse_latex
    _HAS_LATEX = True
except Exception:  # antlr 런타임 미설치 등
    _HAS_LATEX = False


def _clean_latex(s: str) -> str:
    s = s.strip()
    # display 수식 래퍼/환경 제거
    s = re.sub(r"\\(left|right)", "", s)
    s = s.replace("\\,", " ").replace("\\;", " ").replace("\\!", "")
    s = s.strip("$ ")
    return s


def _to_expr(token: str):
    """LaTeX 우선, 실패 시 sympify 로 토큰 하나를 식으로."""
    token = _clean_latex(token)
    if not token:
        return None
    if _HAS_LATEX:
        try:
            return parse_latex(token)
        except Exception:
            pass
    try:
        return sp.sympify(token.replace("^", "**"))
    except Exception:
        return None


def _answer_values(ans: str):
    """모범답안 문자열에서 값 집합을 추출.
    예) 'x=2 또는 x=3', 'x = 2, 3', '{2, 3}', '-1/2' → {2,3} 등.
    """
    a = _clean_latex(ans)
    a = a.replace("{", " ").replace("}", " ")
    # '또는', 'or', ',' 를 구분자로
    a = re.sub(r"(또는|or)", ",", a)
    parts = [p for p in a.split(",") if p.strip()]
    vals = []
    for p in parts:
        # 'x = 2' → '2'
        if "=" in p:
            p = p.split("=")[-1]
        e = _to_expr(p)
        if e is not None:
            vals.append(sp.nsimplify(e) if e.free_symbols == set() else e)
    return vals


def _equal(a, b) -> bool:
    try:
        return bool(sp.simplify(a - b) == 0)
    except Exception:
        try:
            return bool(abs(complex(a) - complex(b)) < 1e-9)
        except Exception:
            return False


def _set_equal(xs, ys) -> bool:
    if len(xs) != len(ys) or not xs:
        return False
    used = [False] * len(ys)
    for x in xs:
        hit = False
        for j, y in enumerate(ys):
            if not used[j] and _equal(x, y):
                used[j] = True
                hit = True
                break
        if not hit:
            return False
    return True


def _solve_problem(problem_latex: str, plaintext: str | None):
    """문제에서 단일변수 방정식을 찾아 풀이. (해집합, 노트) 반환. 실패 시 (None, note)."""
    candidates = [problem_latex]
    if plaintext:
        candidates.append(plaintext)

    for src in candidates:
        if not src or "=" not in src:
            continue
        # 마지막 '= ... ' 형태의 방정식 하나를 시도
        for chunk in re.split(r"[\n;]", src):
            if chunk.count("=") != 1:
                continue
            lhs_s, rhs_s = chunk.split("=")
            lhs, rhs = _to_expr(lhs_s), _to_expr(rhs_s)
            if lhs is None or rhs is None:
                continue
            try:
                eq = sp.Eq(lhs, rhs)
                syms = list(eq.free_symbols)
                if len(syms) != 1:
                    continue
                sol = sp.solve(eq, syms[0])
                sol = [sp.simplify(s) for s in sol]
                if sol:
                    return sol, f"solve({sp.srepr(syms[0])[:0]}{chunk.strip()})"
            except Exception:
                continue
    return None, "풀 수 있는 단일변수 방정식을 찾지 못함"


def verify(problem_latex: str, plaintext: str | None, candidate_answer: str) -> dict:
    cand = _answer_values(candidate_answer)
    if not cand:
        return {"ok": False, "match": None, "computed": None,
                "note": "모범답안을 식으로 해석하지 못함"}

    sol, note = _solve_problem(problem_latex or "", plaintext)
    if sol is None:
        return {"ok": False, "match": None, "computed": None, "note": note}

    computed = ", ".join(str(s) for s in sol)
    match = _set_equal(sol, cand)
    return {"ok": True, "match": match, "computed": computed,
            "note": f"sympy 해집합 {{{computed}}} vs 모범답안 {len(cand)}개"}


def answers_equal(submitted: str, expected: str) -> dict:
    """두 답안의 수학적 동등성 판정 (재채점 루프용 — 스펙 §9 Phase2).
    문제를 풀 필요 없이 제출답 vs 정답만 비교하므로 LLM 불필요."""
    xs = _answer_values(submitted)
    ys = _answer_values(expected)
    if not ys:
        return {"ok": False, "equal": None, "note": "정답을 식으로 해석하지 못함"}
    if not xs:
        return {"ok": False, "equal": None, "note": "제출답을 식으로 해석하지 못함"}
    return {"ok": True, "equal": _set_equal(xs, ys),
            "note": f"제출 {len(xs)}개 vs 정답 {len(ys)}개"}


def _run_with_timeout(fn, fallback: dict, timeout: float = 8.0) -> dict:
    result: dict = {}

    def work():
        try:
            result.update(fn())
        except Exception as e:  # 최후 방어 — 절대 throw 안 함
            result.update({**fallback, "note": f"verifier 예외: {e}"})

    t = threading.Thread(target=work, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        return {**fallback, "note": f"타임아웃({timeout}s)"}
    return result or {**fallback, "note": "no result"}


def _verify_with_timeout(payload: dict) -> dict:
    return _run_with_timeout(
        lambda: verify(
            payload.get("problem_latex", ""),
            payload.get("problem_plaintext"),
            payload.get("candidate_answer", ""),
        ),
        {"ok": False, "match": None, "computed": None},
    )


def _equal_with_timeout(payload: dict) -> dict:
    return _run_with_timeout(
        lambda: answers_equal(
            payload.get("submitted_answer", ""),
            payload.get("expected_answer", ""),
        ),
        {"ok": False, "equal": None},
    )


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"status": "ok", "latex_parser": _HAS_LATEX})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in ("/verify", "/equal"):
            self._send(404, {"error": "not found"})
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            self._send(400, {"error": f"bad request: {e}"})
            return
        if self.path == "/verify":
            self._send(200, _verify_with_timeout(payload))
        else:
            self._send(200, _equal_with_timeout(payload))

    def log_message(self, *args):  # 콘솔 소음 줄이기
        pass


if __name__ == "__main__":
    addr = ("127.0.0.1", 8000)
    print(f"[verifier] sympy 검산 서비스 시작 http://{addr[0]}:{addr[1]}  (latex={_HAS_LATEX})")
    ThreadingHTTPServer(addr, Handler).serve_forever()
