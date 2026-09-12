import 'mathlive';

let isMathLiveConfigured = false;

/**
 * Configure MathLive global settings and custom virtual keyboard layout
 * to match Noether's dark theme and the custom keypad layout.
 */
export function setupMathLive(): void {
  if (isMathLiveConfigured || typeof window === 'undefined') return;
  isMathLiveConfigured = true;

  if (window.mathVirtualKeyboard) {
    // Customize virtual keyboard layouts
    window.mathVirtualKeyboard.layouts = [
      {
        label: '123',
        tooltip: 'Numbers & Common Math',
        rows: [
          [
            { latex: 'x^{#?}', label: '<i>x</i><sup><i>y</i></sup>', class: 'noether-math-key' },
            { latex: 'n^{#?}', label: '<i>n</i><sup><i>a</i></sup>', class: 'noether-math-key noether-math-gap-right' },
            { latex: '7', class: 'noether-math-key' },
            { latex: '8', class: 'noether-math-key' },
            { latex: '9', class: 'noether-math-key' },
            { latex: '\\div', label: '÷', class: 'noether-math-key noether-math-gap-right' },
            { latex: 'e', label: 'e<sup>ln</sup>', class: 'noether-math-key' },
            { latex: 'i', class: 'noether-math-key' },
            { latex: '\\pi', label: 'π<sup>sin</sup>', class: 'noether-math-key' },
          ],
          [
            { latex: '<', class: 'noether-math-key' },
            { latex: '>', class: 'noether-math-key noether-math-gap-right' },
            { latex: '4', class: 'noether-math-key' },
            { latex: '5', class: 'noether-math-key' },
            { latex: '6', class: 'noether-math-key' },
            { latex: '\\times', label: '×', class: 'noether-math-key noether-math-gap-right' },
            { latex: '{#?}^2', label: '■<sup>2</sup>', class: 'noether-math-key' },
            { latex: '{#?}^{#?}', label: '■<sup>□</sup>', class: 'noether-math-key' },
            { latex: '\\sqrt{#?}', label: '√□', class: 'noether-math-key' },
          ],
          [
            { latex: '(', class: 'noether-math-key' },
            { latex: ')', class: 'noether-math-key noether-math-gap-right' },
            { latex: '1', class: 'noether-math-key' },
            { latex: '2', class: 'noether-math-key' },
            { latex: '3', class: 'noether-math-key' },
            { latex: '-', class: 'noether-math-key noether-math-gap-right' },
            { latex: '\\int_{0}^{\\infty} {#?} \\, dx', label: '∫<sub>0</sub><sup>∞</sup>□dx', class: 'noether-math-key' },
            { latex: '\\forall', label: '∀', class: 'noether-math-key' },
            {
              command: ['performWithFeedback', 'deleteBackward'],
              label: '⌫',
              class: 'noether-math-key noether-action-key',
            },
          ],
          [
            {
              command: ['switchKeyboardLayer', 'shift'],
              label: '⇧',
              class: 'noether-math-key noether-shift-key',
            },
            { latex: '\\frac{#?}{#?}', label: '<sup>□</sup>/<sub>□</sub>', class: 'noether-math-key noether-math-gap-right' },
            { latex: '0', class: 'noether-math-key' },
            { latex: '.', class: 'noether-math-key' },
            { latex: '=', class: 'noether-math-key' },
            { latex: '+', class: 'noether-math-key noether-math-gap-right' },
            {
              command: ['performWithFeedback', 'moveToPreviousChar'],
              label: '‹',
              class: 'noether-math-key',
            },
            {
              command: ['performWithFeedback', 'moveToNextChar'],
              label: '›',
              class: 'noether-math-key',
            },
            {
              command: ['performWithFeedback', 'commit'],
              label: '⏎',
              class: 'noether-math-key noether-action-key',
            },
          ],
        ],
      },
      {
        label: '∞≠∈',
        tooltip: 'Symbols & Relations',
        rows: [
          [
            { latex: '\\infty', label: '∞', class: 'noether-math-key' },
            { latex: '\\neq', label: '≠', class: 'noether-math-key' },
            { latex: '\\in', label: '∈', class: 'noether-math-key' },
            { latex: '\\notin', label: '∉', class: 'noether-math-key' },
            { latex: '\\subset', label: '⊂', class: 'noether-math-key' },
            { latex: '\\subseteq', label: '⊆', class: 'noether-math-key' },
            { latex: '\\cup', label: '∪', class: 'noether-math-key' },
            { latex: '\\cap', label: '∩', class: 'noether-math-key' },
          ],
          [
            { latex: '\\leq', label: '≤', class: 'noether-math-key' },
            { latex: '\\geq', label: '≥', class: 'noether-math-key' },
            { latex: '\\approx', label: '≈', class: 'noether-math-key' },
            { latex: '\\equiv', label: '≡', class: 'noether-math-key' },
            { latex: '\\pm', label: '±', class: 'noether-math-key' },
            { latex: '\\mp', label: '∓', class: 'noether-math-key' },
            { latex: '\\cdot', label: '·', class: 'noether-math-key' },
            { latex: '\\partial', label: '∂', class: 'noether-math-key' },
          ],
          [
            { latex: '\\sum_{{#?}=1}^{#?}', label: '∑', class: 'noether-math-key' },
            { latex: '\\prod_{{#?}=1}^{#?}', label: '∏', class: 'noether-math-key' },
            { latex: '\\int_{#?}^{#?}', label: '∫', class: 'noether-math-key' },
            { latex: '\\lim_{{#?} \\to {#?}}', label: 'lim', class: 'noether-math-key' },
            { latex: '\\rightarrow', label: '→', class: 'noether-math-key' },
            { latex: '\\leftarrow', label: '←', class: 'noether-math-key' },
            { latex: '\\implies', label: '⟹', class: 'noether-math-key' },
            { latex: '\\iff', label: '⟺', class: 'noether-math-key' },
          ],
          [
            { latex: '\\left[ {#?} \\right]', label: '[ ]', class: 'noether-math-key' },
            { latex: '\\left\\{ {#?} \\right\\}', label: '{ }', class: 'noether-math-key' },
            { latex: '\\left| {#?} \\right|', label: '| |', class: 'noether-math-key' },
            { latex: '\\begin{pmatrix} {#?} & {#?} \\\\ {#?} & {#?} \\end{pmatrix}', label: '( matrix )', class: 'noether-math-key' },
            { latex: '\\begin{cases} {#?} \\\\ {#?} \\end{cases}', label: '{ cases', class: 'noether-math-key' },
            { latex: '\\text{{#?}}', label: 'text', class: 'noether-math-key' },
            {
              command: ['performWithFeedback', 'deleteBackward'],
              label: '⌫',
              class: 'noether-math-key noether-action-key',
            },
            {
              command: ['performWithFeedback', 'commit'],
              label: '⏎',
              class: 'noether-math-key noether-action-key',
            },
          ],
        ],
      },
      {
        label: 'abc',
        tooltip: 'Variables & Alphabet',
        rows: [
          [
            { latex: 'a', class: 'noether-math-key' },
            { latex: 'b', class: 'noether-math-key' },
            { latex: 'c', class: 'noether-math-key' },
            { latex: 'd', class: 'noether-math-key' },
            { latex: 'e', class: 'noether-math-key' },
            { latex: 'f', class: 'noether-math-key' },
            { latex: 'g', class: 'noether-math-key' },
            { latex: 'h', class: 'noether-math-key' },
            { latex: 'i', class: 'noether-math-key' },
            { latex: 'j', class: 'noether-math-key' },
          ],
          [
            { latex: 'k', class: 'noether-math-key' },
            { latex: 'l', class: 'noether-math-key' },
            { latex: 'm', class: 'noether-math-key' },
            { latex: 'n', class: 'noether-math-key' },
            { latex: 'o', class: 'noether-math-key' },
            { latex: 'p', class: 'noether-math-key' },
            { latex: 'q', class: 'noether-math-key' },
            { latex: 'r', class: 'noether-math-key' },
            { latex: 's', class: 'noether-math-key' },
            { latex: 't', class: 'noether-math-key' },
          ],
          [
            { latex: 'u', class: 'noether-math-key' },
            { latex: 'v', class: 'noether-math-key' },
            { latex: 'w', class: 'noether-math-key' },
            { latex: 'x', class: 'noether-math-key' },
            { latex: 'y', class: 'noether-math-key' },
            { latex: 'z', class: 'noether-math-key' },
            { latex: 'A', class: 'noether-math-key' },
            { latex: 'B', class: 'noether-math-key' },
            { latex: 'C', class: 'noether-math-key' },
            {
              command: ['performWithFeedback', 'deleteBackward'],
              label: '⌫',
              class: 'noether-math-key noether-action-key',
            },
          ],
        ],
      },
      {
        label: 'αβγ',
        tooltip: 'Greek Alphabet',
        rows: [
          [
            { latex: '\\alpha', label: 'α', class: 'noether-math-key' },
            { latex: '\\beta', label: 'β', class: 'noether-math-key' },
            { latex: '\\gamma', label: 'γ', class: 'noether-math-key' },
            { latex: '\\delta', label: 'δ', class: 'noether-math-key' },
            { latex: '\\epsilon', label: 'ε', class: 'noether-math-key' },
            { latex: '\\zeta', label: 'ζ', class: 'noether-math-key' },
            { latex: '\\eta', label: 'η', class: 'noether-math-key' },
            { latex: '\\theta', label: 'θ', class: 'noether-math-key' },
          ],
          [
            { latex: '\\iota', label: 'ι', class: 'noether-math-key' },
            { latex: '\\kappa', label: 'κ', class: 'noether-math-key' },
            { latex: '\\lambda', label: 'λ', class: 'noether-math-key' },
            { latex: '\\mu', label: 'μ', class: 'noether-math-key' },
            { latex: '\\nu', label: 'ν', class: 'noether-math-key' },
            { latex: '\\xi', label: 'ξ', class: 'noether-math-key' },
            { latex: '\\pi', label: 'π', class: 'noether-math-key' },
            { latex: '\\rho', label: 'ρ', class: 'noether-math-key' },
          ],
          [
            { latex: '\\sigma', label: 'σ', class: 'noether-math-key' },
            { latex: '\\tau', label: 'τ', class: 'noether-math-key' },
            { latex: '\\phi', label: 'φ', class: 'noether-math-key' },
            { latex: '\\chi', label: 'χ', class: 'noether-math-key' },
            { latex: '\\psi', label: 'ψ', class: 'noether-math-key' },
            { latex: '\\omega', label: 'ω', class: 'noether-math-key' },
            { latex: '\\Delta', label: 'Δ', class: 'noether-math-key' },
            { latex: '\\Gamma', label: 'Γ', class: 'noether-math-key' },
          ],
          [
            { latex: '\\Theta', label: 'Θ', class: 'noether-math-key' },
            { latex: '\\Lambda', label: 'Λ', class: 'noether-math-key' },
            { latex: '\\Sigma', label: 'Σ', class: 'noether-math-key' },
            { latex: '\\Phi', label: 'Φ', class: 'noether-math-key' },
            { latex: '\\Psi', label: 'Ψ', class: 'noether-math-key' },
            { latex: '\\Omega', label: 'Ω', class: 'noether-math-key' },
            {
              command: ['performWithFeedback', 'deleteBackward'],
              label: '⌫',
              class: 'noether-math-key noether-action-key',
            },
            {
              command: ['performWithFeedback', 'commit'],
              label: '⏎',
              class: 'noether-math-key noether-action-key',
            },
          ],
        ],
      },
    ];
  }
}
