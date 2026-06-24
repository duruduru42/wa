// $...$ 없이 평문에 섞여 나온 LaTeX 명령(\alpha 등)을 유니코드 기호로 치환.
// 앱 뷰(Tex.tsx)·PDF(TexServer.tsx) 공용.
const LATEX_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ",
  tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  times: "×", div: "÷", cdot: "·", pm: "±", mp: "∓",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", approx: "≈",
  equiv: "≡", infty: "∞", propto: "∝", angle: "∠", perp: "⊥", parallel: "∥",
  cap: "∩", cup: "∪", in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆",
  forall: "∀", exists: "∃", sum: "∑", prod: "∏", int: "∫", partial: "∂",
  nabla: "∇", sqrt: "√", circ: "∘", degree: "°", ldots: "…", cdots: "⋯",
  dots: "…", to: "→", rightarrow: "→", Rightarrow: "⇒", leftarrow: "←",
  Leftarrow: "⇐", leftrightarrow: "↔", neg: "¬", land: "∧", lor: "∨",
};
const LATEX_RE = new RegExp(
  "\\\\(" +
    Object.keys(LATEX_SYMBOLS)
      .sort((a, b) => b.length - a.length)
      .join("|") +
    ")(?![A-Za-z])",
  "g",
);

export function latexSymbols(text: string): string {
  return text
    .replace(/\\(left|right|displaystyle|;|,|!|quad|qquad)\s?/g, " ")
    .replace(LATEX_RE, (_, name) => LATEX_SYMBOLS[name]);
}
