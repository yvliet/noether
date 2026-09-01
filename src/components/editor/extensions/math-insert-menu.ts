import { ContextMenuItem } from '@/components/common/ContextMenu';

export interface MathInsertItem {
  id: string;
  title: string;
  latex: string;
  category: 'Structures' | 'Operators' | 'Greek' | 'Relations' | 'Delimiters' | 'Functions' | 'Misc';
  cursorOffset?: number; // Offset from start of inserted latex where cursor should be placed
}

export const MATH_INSERT_ITEMS: MathInsertItem[] = [
  // ── Structures ──
  { id: 'frac', title: 'Fraction (a/b)', latex: '\\frac{a}{b}', category: 'Structures', cursorOffset: 6 },
  { id: 'sqrt', title: 'Square Root (√x)', latex: '\\sqrt{x}', category: 'Structures', cursorOffset: 6 },
  { id: 'nroot', title: 'nth Root (ⁿ√x)', latex: '\\sqrt[n]{x}', category: 'Structures', cursorOffset: 6 },
  { id: 'sup', title: 'Power / Superscript (xⁿ)', latex: '^{2}', category: 'Structures', cursorOffset: 2 },
  { id: 'sub', title: 'Subscript (xₙ)', latex: '_{i}', category: 'Structures', cursorOffset: 2 },
  { id: 'supsub', title: 'Power & Subscript (xᵢⁿ)', latex: '_{i}^{n}', category: 'Structures', cursorOffset: 2 },
  { id: 'binom', title: 'Binomial Coefficient', latex: '\\binom{n}{k}', category: 'Structures', cursorOffset: 7 },
  { id: 'overline', title: 'Overline (x̄)', latex: '\\overline{x}', category: 'Structures', cursorOffset: 10 },
  { id: 'vec', title: 'Vector Arrow (x⃗)', latex: '\\vec{v}', category: 'Structures', cursorOffset: 5 },
  { id: 'hat', title: 'Hat Accent (x̂)', latex: '\\hat{x}', category: 'Structures', cursorOffset: 5 },

  // ── Large Operators & Calculus ──
  { id: 'sum', title: 'Summation (∑)', latex: '\\sum_{i=1}^{n}', category: 'Operators', cursorOffset: 6 },
  { id: 'prod', title: 'Product (∏)', latex: '\\prod_{i=1}^{n}', category: 'Operators', cursorOffset: 7 },
  { id: 'int', title: 'Definite Integral (∫)', latex: '\\int_{0}^{\\infty} f(x)\\,dx', category: 'Operators', cursorOffset: 6 },
  { id: 'iint', title: 'Double Integral (∬)', latex: '\\iint_{D} f(x, y)\\,dA', category: 'Operators', cursorOffset: 7 },
  { id: 'oint', title: 'Contour Integral (∮)', latex: '\\oint_{C} F\\cdot dr', category: 'Operators', cursorOffset: 7 },
  { id: 'lim', title: 'Limit (lim)', latex: '\\lim_{x \\to 0}', category: 'Operators', cursorOffset: 6 },
  { id: 'partial', title: 'Partial Derivative (∂/∂x)', latex: '\\frac{\\partial f}{\\partial x}', category: 'Operators', cursorOffset: 15 },
  { id: 'infty', title: 'Infinity (∞)', latex: '\\infty', category: 'Operators' },

  // ── Greek Letters ──
  { id: 'alpha', title: 'α (alpha)', latex: '\\alpha', category: 'Greek' },
  { id: 'beta', title: 'β (beta)', latex: '\\beta', category: 'Greek' },
  { id: 'gamma', title: 'γ (gamma)', latex: '\\gamma', category: 'Greek' },
  { id: 'delta', title: 'δ (delta)', latex: '\\delta', category: 'Greek' },
  { id: 'epsilon', title: 'ε (epsilon)', latex: '\\epsilon', category: 'Greek' },
  { id: 'theta', title: 'θ (theta)', latex: '\\theta', category: 'Greek' },
  { id: 'lambda', title: 'λ (lambda)', latex: '\\lambda', category: 'Greek' },
  { id: 'mu', title: 'μ (mu)', latex: '\\mu', category: 'Greek' },
  { id: 'pi', title: 'π (pi)', latex: '\\pi', category: 'Greek' },
  { id: 'sigma', title: 'σ (sigma)', latex: '\\sigma', category: 'Greek' },
  { id: 'phi', title: 'φ (phi)', latex: '\\phi', category: 'Greek' },
  { id: 'omega', title: 'ω (omega)', latex: '\\omega', category: 'Greek' },
  { id: 'Delta', title: 'Δ (Delta)', latex: '\\Delta', category: 'Greek' },
  { id: 'Gamma', title: 'Γ (Gamma)', latex: '\\Gamma', category: 'Greek' },
  { id: 'Sigma', title: 'Σ (Sigma)', latex: '\\Sigma', category: 'Greek' },
  { id: 'Omega', title: 'Ω (Omega)', latex: '\\Omega', category: 'Greek' },

  // ── Relations & Logic ──
  { id: 'neq', title: '≠ Not Equal', latex: '\\neq', category: 'Relations' },
  { id: 'leq', title: '≤ Less or Equal', latex: '\\leq', category: 'Relations' },
  { id: 'geq', title: '≥ Greater or Equal', latex: '\\geq', category: 'Relations' },
  { id: 'approx', title: '≈ Approximately', latex: '\\approx', category: 'Relations' },
  { id: 'equiv', title: '≡ Equivalent', latex: '\\equiv', category: 'Relations' },
  { id: 'in', title: '∈ Element Of', latex: '\\in', category: 'Relations' },
  { id: 'subset', title: '⊂ Subset', latex: '\\subset', category: 'Relations' },
  { id: 'cup', title: '∪ Union', latex: '\\cup', category: 'Relations' },
  { id: 'cap', title: '∩ Intersection', latex: '\\cap', category: 'Relations' },
  { id: 'forall', title: '∀ For All', latex: '\\forall', category: 'Relations' },
  { id: 'exists', title: '∃ Exists', latex: '\\exists', category: 'Relations' },
  { id: 'rightarrow', title: '→ Right Arrow', latex: '\\rightarrow', category: 'Relations' },
  { id: 'implies', title: '⟹ Implies', latex: '\\implies', category: 'Relations' },
  { id: 'iff', title: '⟺ If and Only If', latex: '\\iff', category: 'Relations' },

  // ── Delimiters & Matrices ──
  { id: 'paren', title: 'Parentheses ( ... )', latex: '\\left( x \\right)', category: 'Delimiters', cursorOffset: 7 },
  { id: 'bracket', title: 'Brackets [ ... ]', latex: '\\left[ x \\right]', category: 'Delimiters', cursorOffset: 7 },
  { id: 'brace', title: 'Braces { ... }', latex: '\\left\\{ x \\right\\}', category: 'Delimiters', cursorOffset: 8 },
  { id: 'abs', title: 'Absolute Value | ... |', latex: '\\left| x \\right|', category: 'Delimiters', cursorOffset: 7 },
  { id: 'norm', title: 'Norm ‖ ... ‖', latex: '\\| x \\|', category: 'Delimiters', cursorOffset: 3 },
  { id: 'pmatrix', title: 'Parenthesis Matrix 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'Delimiters', cursorOffset: 16 },
  { id: 'bmatrix', title: 'Bracket Matrix 2x2', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', category: 'Delimiters', cursorOffset: 16 },
  { id: 'cases', title: 'Piecewise Cases', latex: '\\begin{cases} x & \\text{if } x \\ge 0 \\\\ -x & \\text{otherwise} \\end{cases}', category: 'Delimiters', cursorOffset: 14 },

  // ── Functions ──
  { id: 'sin', title: 'sin(x)', latex: '\\sin(x)', category: 'Functions', cursorOffset: 5 },
  { id: 'cos', title: 'cos(x)', latex: '\\cos(x)', category: 'Functions', cursorOffset: 5 },
  { id: 'tan', title: 'tan(x)', latex: '\\tan(x)', category: 'Functions', cursorOffset: 5 },
  { id: 'log', title: 'log(x)', latex: '\\log(x)', category: 'Functions', cursorOffset: 5 },
  { id: 'ln', title: 'ln(x)', latex: '\\ln(x)', category: 'Functions', cursorOffset: 4 },
  { id: 'exp', title: 'exp(x)', latex: '\\exp(x)', category: 'Functions', cursorOffset: 5 },

  // ── Miscellaneous ──
  { id: 'cdot', title: '· Centered Dot', latex: '\\cdot', category: 'Misc' },
  { id: 'times', title: '× Cross Product', latex: '\\times', category: 'Misc' },
  { id: 'div', title: '÷ Division', latex: '\\div', category: 'Misc' },
  { id: 'pm', title: '± Plus-Minus', latex: '\\pm', category: 'Misc' },
  { id: 'text', title: 'Text in Math (\\text{...})', latex: '\\text{word}', category: 'Misc', cursorOffset: 6 },
];

/**
 * Builds context menu items grouped by category for inserting math templates and symbols.
 */
export function buildMathInsertSubmenus(
  onInsert: (latex: string, cursorOffset?: number) => void
): ContextMenuItem[] {
  const categories: MathInsertItem['category'][] = [
    'Structures',
    'Operators',
    'Greek',
    'Relations',
    'Delimiters',
    'Functions',
    'Misc',
  ];

  return categories.map((cat) => {
    const items = MATH_INSERT_ITEMS.filter((item) => item.category === cat);
    return {
      id: `math-cat-${cat.toLowerCase()}`,
      title: cat,
      submenu: items.map((item) => ({
        id: `math-item-${item.id}`,
        title: item.title,
        onClick: () => onInsert(item.latex, item.cursorOffset),
      })),
    };
  });
}
