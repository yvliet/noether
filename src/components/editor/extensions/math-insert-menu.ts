import React from 'react';
import { ContextMenuItem } from '@/components/common/ContextMenu';
import {
  SigmaIcon,
  Divide01Icon,
  AlphabetGreekIcon,
  EqualNotIcon,
  MatrixIcon,
  FunctionOfXIcon,
  PlusMinus01Icon,
  RadicalIcon,
  NThRootIcon,
  SuperscriptIcon,
  SubscriptIcon,
  VectorSquareIcon,
  PiIcon,
  Infinity01Icon,
  ParenthesesIcon,
  BracketsIcon,
  BracesIcon,
  MultiplicationSignIcon,
  ArrowRight01Icon,
  LessThanOrEqualIcon,
  GreaterThanOrEqualIcon,
  TextFontIcon,
  ApproximatelyEqualIcon,
  AlphaIcon,
  BetaIcon,
  OmegaIcon,
} from '@/components/common/Icons';

export interface MathInsertItem {
  id: string;
  title: string;
  latex: string;
  category: 'Structures' | 'Operators' | 'Greek' | 'Relations' | 'Delimiters' | 'Functions' | 'Misc';
  cursorOffset?: number; // Offset from start of inserted latex where cursor should be placed
  keywords?: string[];
  icon?: React.ReactNode;
}

const badge = (text: string, className = '') =>
  React.createElement(
    'span',
    {
      className: `inline-flex items-center justify-center font-serif text-[12px] leading-none select-none text-[var(--noether-text-muted,#8b8e95)] group-hover:text-[var(--noether-text-primary)] ${className}`,
      style: { width: 14, height: 14 },
    },
    text
  );

const svg = (...children: React.ReactNode[]) =>
  React.createElement(
    'svg',
    {
      width: 14,
      height: 14,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '1.5',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: 'shrink-0',
    },
    ...children
  );

const path = (d: string) => React.createElement('path', { d });
const line = (x1: number, y1: number, x2: number, y2: number) => React.createElement('line', { x1, y1, x2, y2 });
const circle = (cx: number, cy: number, r: number, fill = 'none') => React.createElement('circle', { cx, cy, r, fill });
const ellipse = (cx: number, cy: number, rx: number, ry: number) => React.createElement('ellipse', { cx, cy, rx, ry });
const icon = (Comp: any) => React.createElement(Comp, { size: 14 });

export const MATH_INSERT_ITEMS: MathInsertItem[] = [
  // ── Structures ──
  {
    id: 'frac',
    title: 'Fraction (a/b)',
    latex: '\\frac{a}{b}',
    category: 'Structures',
    cursorOffset: 6,
    keywords: ['fraction', 'div', 'frac'],
    icon: svg(line(4, 12, 20, 12), circle(12, 6.5, 2), circle(12, 17.5, 2)),
  },
  {
    id: 'sqrt',
    title: 'Square Root (√x)',
    latex: '\\sqrt{x}',
    category: 'Structures',
    cursorOffset: 6,
    keywords: ['sqrt', 'root', 'square'],
    icon: icon(RadicalIcon),
  },
  {
    id: 'nroot',
    title: 'nth Root (ⁿ√x)',
    latex: '\\sqrt[n]{x}',
    category: 'Structures',
    cursorOffset: 6,
    keywords: ['root', 'nth', 'radicand'],
    icon: icon(NThRootIcon),
  },
  {
    id: 'sup',
    title: 'Power / Superscript (xⁿ)',
    latex: '^{2}',
    category: 'Structures',
    cursorOffset: 2,
    keywords: ['power', 'superscript', 'exponent'],
    icon: icon(SuperscriptIcon),
  },
  {
    id: 'sub',
    title: 'Subscript (xₙ)',
    latex: '_{i}',
    category: 'Structures',
    cursorOffset: 2,
    keywords: ['subscript', 'index'],
    icon: icon(SubscriptIcon),
  },
  {
    id: 'supsub',
    title: 'Power & Subscript (xᵢⁿ)',
    latex: '_{i}^{n}',
    category: 'Structures',
    cursorOffset: 2,
    keywords: ['subscript', 'power', 'index'],
    icon: svg(path('M5 8L11 16M11 8L5 16M15 6H19M15 18H19')),
  },
  {
    id: 'binom',
    title: 'Binomial Coefficient',
    latex: '\\binom{n}{k}',
    category: 'Structures',
    cursorOffset: 7,
    keywords: ['binomial', 'choose', 'combination'],
    icon: svg(path('M6 4C4.5 7 4.5 17 6 20M18 4C19.5 7 19.5 17 18 20M12 7V9M12 15V17')),
  },
  {
    id: 'overline',
    title: 'Overline (x̄)',
    latex: '\\overline{x}',
    category: 'Structures',
    cursorOffset: 10,
    keywords: ['overline', 'bar', 'mean'],
    icon: svg(line(6, 5, 18, 5), path('M7 10L17 20M17 10L7 20')),
  },
  {
    id: 'vec',
    title: 'Vector Arrow (x⃗)',
    latex: '\\vec{v}',
    category: 'Structures',
    cursorOffset: 5,
    keywords: ['vector', 'arrow'],
    icon: icon(VectorSquareIcon),
  },
  {
    id: 'hat',
    title: 'Hat Accent (x̂)',
    latex: '\\hat{x}',
    category: 'Structures',
    cursorOffset: 5,
    keywords: ['hat', 'unit'],
    icon: svg(path('M8 6L12 3L16 6M7 11L17 21M17 11L7 21')),
  },

  // ── Large Operators & Calculus ──
  {
    id: 'sum',
    title: 'Summation (∑)',
    latex: '\\sum_{i=1}^{n}',
    category: 'Operators',
    cursorOffset: 6,
    keywords: ['sum', 'sigma', 'series'],
    icon: icon(SigmaIcon),
  },
  {
    id: 'prod',
    title: 'Product (∏)',
    latex: '\\prod_{i=1}^{n}',
    category: 'Operators',
    cursorOffset: 7,
    keywords: ['product', 'pi'],
    icon: icon(PiIcon),
  },
  {
    id: 'int',
    title: 'Definite Integral (∫)',
    latex: '\\int_{0}^{\\infty} f(x)\\,dx',
    category: 'Operators',
    cursorOffset: 6,
    keywords: ['integral', 'calculus', 'int'],
    icon: svg(path('M15 4C14.2 3.3 13.2 3 12 3C9.5 3 9 5 9 8V16C9 19 8.5 21 6 21C4.8 21 3.8 20.7 3 20')),
  },
  {
    id: 'iint',
    title: 'Double Integral (∬)',
    latex: '\\iint_{D} f(x, y)\\,dA',
    category: 'Operators',
    cursorOffset: 7,
    keywords: ['double', 'integral', 'area'],
    icon: svg(
      path('M11 4C10.4 3.3 9.7 3 9 3C7.2 3 7 4.5 7 7V17C7 19.5 6.8 21 5 21C4.3 21 3.6 20.7 3 20'),
      path('M19 4C18.4 3.3 17.7 3 17 3C15.2 3 15 4.5 15 7V17C15 19.5 14.8 21 13 21C12.3 21 11.6 20.7 11 20')
    ),
  },
  {
    id: 'oint',
    title: 'Contour Integral (∮)',
    latex: '\\oint_{C} F\\cdot dr',
    category: 'Operators',
    cursorOffset: 7,
    keywords: ['contour', 'closed', 'integral'],
    icon: svg(
      path('M15 4C14.2 3.3 13.2 3 12 3C9.5 3 9 5 9 8V16C9 19 8.5 21 6 21C4.8 21 3.8 20.7 3 20'),
      ellipse(10.5, 12, 3.5, 2.5)
    ),
  },
  {
    id: 'lim',
    title: 'Limit (x → 0)',
    latex: '\\lim_{x \\to 0}',
    category: 'Operators',
    cursorOffset: 6,
    keywords: ['limit', 'lim', 'calculus'],
    icon: badge('lim', 'font-mono text-[10px] font-semibold'),
  },
  {
    id: 'lim_inf',
    title: 'Limit (x → ∞)',
    latex: '\\lim_{x \\to \\infty}',
    category: 'Operators',
    cursorOffset: 6,
    keywords: ['limit', 'lim', 'infinity'],
    icon: badge('lim', 'font-mono text-[10px] font-semibold'),
  },
  {
    id: 'lim_n',
    title: 'Limit (n → ∞)',
    latex: '\\lim_{n \\to \\infty}',
    category: 'Operators',
    cursorOffset: 6,
    keywords: ['limit', 'lim', 'sequence', 'series'],
    icon: badge('lim', 'font-mono text-[10px] font-semibold'),
  },
  {
    id: 'partial',
    title: 'Partial Derivative (∂/∂x)',
    latex: '\\frac{\\partial f}{\\partial x}',
    category: 'Operators',
    cursorOffset: 15,
    keywords: ['partial', 'derivative', 'gradient'],
    icon: svg(path('M14 4C12 4 10 5.5 10 7.5C10 9 11 10.5 13 11C10.5 11.5 8 13.5 8 16.5C8 19 10 21 13 21C16 21 18 19 18 16V4H14ZM13 19C11.5 19 10 18 10 16.5C10 15 11.5 13 13.5 13C15.5 13 16 15 16 16.5C16 18 14.5 19 13 19Z')),
  },
  {
    id: 'infty',
    title: 'Infinity (∞)',
    latex: '\\infty',
    category: 'Operators',
    keywords: ['infinity', 'inf'],
    icon: icon(Infinity01Icon),
  },

  // ── Greek Letters ──
  { id: 'alpha', title: 'α (alpha)', latex: '\\alpha', category: 'Greek', icon: icon(AlphaIcon) },
  { id: 'beta', title: 'β (beta)', latex: '\\beta', category: 'Greek', icon: icon(BetaIcon) },
  { id: 'gamma', title: 'γ (gamma)', latex: '\\gamma', category: 'Greek', icon: badge('γ', 'italic') },
  { id: 'delta', title: 'δ (delta)', latex: '\\delta', category: 'Greek', icon: badge('δ', 'italic') },
  { id: 'epsilon', title: 'ε (epsilon)', latex: '\\epsilon', category: 'Greek', icon: badge('ε', 'italic') },
  { id: 'theta', title: 'θ (theta)', latex: '\\theta', category: 'Greek', icon: badge('θ', 'italic') },
  { id: 'lambda', title: 'λ (lambda)', latex: '\\lambda', category: 'Greek', icon: badge('λ', 'italic') },
  { id: 'mu', title: 'μ (mu)', latex: '\\mu', category: 'Greek', icon: badge('μ', 'italic') },
  { id: 'pi', title: 'π (pi)', latex: '\\pi', category: 'Greek', icon: icon(PiIcon) },
  { id: 'sigma', title: 'σ (sigma)', latex: '\\sigma', category: 'Greek', icon: badge('σ', 'italic') },
  { id: 'phi', title: 'φ (phi)', latex: '\\phi', category: 'Greek', icon: badge('φ', 'italic') },
  { id: 'omega', title: 'ω (omega)', latex: '\\omega', category: 'Greek', icon: badge('ω', 'italic') },
  { id: 'Delta', title: 'Δ (Delta)', latex: '\\Delta', category: 'Greek', icon: badge('Δ', 'font-sans font-semibold text-[11px]') },
  { id: 'Gamma', title: 'Γ (Gamma)', latex: '\\Gamma', category: 'Greek', icon: badge('Γ', 'font-serif font-bold text-[12px]') },
  { id: 'Sigma', title: 'Σ (Sigma)', latex: '\\Sigma', category: 'Greek', icon: icon(SigmaIcon) },
  { id: 'Omega', title: 'Ω (Omega)', latex: '\\Omega', category: 'Greek', icon: icon(OmegaIcon) },

  // ── Relations & Logic ──
  { id: 'neq', title: '≠ Not Equal', latex: '\\neq', category: 'Relations', icon: icon(EqualNotIcon) },
  { id: 'leq', title: '≤ Less or Equal', latex: '\\leq', category: 'Relations', icon: icon(LessThanOrEqualIcon) },
  { id: 'geq', title: '≥ Greater or Equal', latex: '\\geq', category: 'Relations', icon: icon(GreaterThanOrEqualIcon) },
  {
    id: 'approx',
    title: '≈ Approximately',
    latex: '\\approx',
    category: 'Relations',
    icon: icon(ApproximatelyEqualIcon),
  },
  {
    id: 'equiv',
    title: '≡ Equivalent',
    latex: '\\equiv',
    category: 'Relations',
    icon: svg(line(5, 7, 19, 7), line(5, 12, 19, 12), line(5, 17, 19, 17)),
  },
  {
    id: 'in',
    title: '∈ Element Of',
    latex: '\\in',
    category: 'Relations',
    icon: svg(path('M17 7C11 7 8 9 8 12C8 15 11 17 17 17M6 12H16')),
  },
  {
    id: 'subset',
    title: '⊂ Subset',
    latex: '\\subset',
    category: 'Relations',
    icon: svg(path('M17 7C11 7 8 9 8 12C8 15 11 17 17 17')),
  },
  {
    id: 'cup',
    title: '∪ Union',
    latex: '\\cup',
    category: 'Relations',
    icon: svg(path('M7 6V13C7 16 9.5 18.5 12 18.5C14.5 18.5 17 16 17 13V6')),
  },
  {
    id: 'cap',
    title: '∩ Intersection',
    latex: '\\cap',
    category: 'Relations',
    icon: svg(path('M7 18V11C7 8 9.5 5.5 12 5.5C14.5 5.5 17 8 17 11V18')),
  },
  {
    id: 'forall',
    title: '∀ For All',
    latex: '\\forall',
    category: 'Relations',
    icon: svg(path('M6 6L12 18L18 6M8 12H16')),
  },
  {
    id: 'exists',
    title: '∃ Exists',
    latex: '\\exists',
    category: 'Relations',
    icon: svg(path('M17 6H7V18H17M7 12H15')),
  },
  { id: 'rightarrow', title: '→ Right Arrow', latex: '\\rightarrow', category: 'Relations', icon: icon(ArrowRight01Icon) },
  {
    id: 'implies',
    title: '⟹ Implies',
    latex: '\\implies',
    category: 'Relations',
    icon: svg(line(4, 9, 16, 9), line(4, 15, 16, 15), path('M14 6L20 12L14 18')),
  },
  {
    id: 'iff',
    title: '⟺ If and Only If',
    latex: '\\iff',
    category: 'Relations',
    icon: svg(line(8, 9, 16, 9), line(8, 15, 16, 15), path('M10 6L4 12L10 18M14 6L20 12L14 18')),
  },

  // ── Delimiters & Matrices ──
  {
    id: 'paren',
    title: 'Parentheses ( ... )',
    latex: '\\left( x \\right)',
    category: 'Delimiters',
    cursorOffset: 7,
    keywords: ['parentheses', 'paren', 'round'],
    icon: icon(ParenthesesIcon),
  },
  {
    id: 'bracket',
    title: 'Brackets [ ... ]',
    latex: '\\left[ x \\right]',
    category: 'Delimiters',
    cursorOffset: 7,
    keywords: ['brackets', 'square'],
    icon: icon(BracketsIcon),
  },
  {
    id: 'brace',
    title: 'Braces { ... }',
    latex: '\\left\\{ x \\right\\}',
    category: 'Delimiters',
    cursorOffset: 8,
    keywords: ['braces', 'set', 'curly'],
    icon: icon(BracesIcon),
  },
  {
    id: 'abs',
    title: 'Absolute Value | ... |',
    latex: '\\left| x \\right|',
    category: 'Delimiters',
    cursorOffset: 7,
    keywords: ['abs', 'absolute', 'modulus'],
    icon: svg(line(7, 4, 7, 20), line(17, 4, 17, 20), circle(12, 12, 1.5, 'currentColor')),
  },
  {
    id: 'norm',
    title: 'Norm ‖ ... ‖',
    latex: '\\| x \\|',
    category: 'Delimiters',
    cursorOffset: 3,
    keywords: ['norm', 'magnitude'],
    icon: svg(line(6, 4, 6, 20), line(9, 4, 9, 20), line(15, 4, 15, 20), line(18, 4, 18, 20)),
  },
  {
    id: 'pmatrix',
    title: 'Parenthesis Matrix 2x2',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'pmatrix', '2x2'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'pmatrix3',
    title: 'Parenthesis Matrix 3x3',
    latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'pmatrix', '3x3'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'bmatrix',
    title: 'Bracket Matrix 2x2',
    latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'bmatrix', '2x2'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'bmatrix3',
    title: 'Bracket Matrix 3x3',
    latex: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'bmatrix', '3x3'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'vmatrix',
    title: 'Determinant Matrix 2x2',
    latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'determinant', 'vmatrix', '2x2'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'vmatrix3',
    title: 'Determinant Matrix 3x3',
    latex: '\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}',
    category: 'Delimiters',
    cursorOffset: 16,
    keywords: ['matrix', 'determinant', 'vmatrix', '3x3'],
    icon: icon(MatrixIcon),
  },
  {
    id: 'cases',
    title: 'Piecewise Cases',
    latex: '\\begin{cases} x & \\text{if } x \\ge 0 \\\\ -x & \\text{otherwise} \\end{cases}',
    category: 'Delimiters',
    cursorOffset: 14,
    keywords: ['cases', 'piecewise', 'condition'],
    icon: svg(path('M10 4C8.5 4 8 5.5 8 7.5V10.5C8 11.5 6.5 12 5 12C6.5 12 8 12.5 8 13.5V16.5C8 18.5 8.5 20 10 20M14 8H19M14 16H19')),
  },

  // ── Functions ──
  { id: 'sin', title: 'sin(x)', latex: '\\sin(x)', category: 'Functions', cursorOffset: 5, icon: badge('sin', 'font-mono text-[10px] font-semibold') },
  { id: 'cos', title: 'cos(x)', latex: '\\cos(x)', category: 'Functions', cursorOffset: 5, icon: badge('cos', 'font-mono text-[10px] font-semibold') },
  { id: 'tan', title: 'tan(x)', latex: '\\tan(x)', category: 'Functions', cursorOffset: 5, icon: badge('tan', 'font-mono text-[10px] font-semibold') },
  { id: 'log', title: 'log(x)', latex: '\\log(x)', category: 'Functions', cursorOffset: 5, icon: badge('log', 'font-mono text-[10px] font-semibold') },
  { id: 'ln', title: 'ln(x)', latex: '\\ln(x)', category: 'Functions', cursorOffset: 4, icon: badge('ln', 'font-mono text-[10px] font-semibold') },
  { id: 'exp', title: 'exp(x)', latex: '\\exp(x)', category: 'Functions', cursorOffset: 5, icon: badge('exp', 'font-mono text-[10px] font-semibold') },

  // ── Miscellaneous ──
  {
    id: 'cdot',
    title: '· Centered Dot',
    latex: '\\cdot',
    category: 'Misc',
    icon: svg(circle(12, 12, 2.5, 'currentColor')),
  },
  { id: 'times', title: '× Cross Product', latex: '\\times', category: 'Misc', icon: icon(MultiplicationSignIcon) },
  { id: 'div', title: '÷ Division', latex: '\\div', category: 'Misc', icon: icon(Divide01Icon) },
  { id: 'pm', title: '± Plus-Minus', latex: '\\pm', category: 'Misc', icon: icon(PlusMinus01Icon) },
  { id: 'text', title: 'Text in Math (\\text{...})', latex: '\\text{word}', category: 'Misc', cursorOffset: 6, icon: icon(TextFontIcon) },
];

const CATEGORY_CONFIG: Record<
  MathInsertItem['category'],
  { title: string; icon: React.ReactNode }
> = {
  Structures: { title: 'Structures', icon: icon(Divide01Icon) },
  Operators: { title: 'Operators', icon: icon(SigmaIcon) },
  Greek: { title: 'Greek', icon: icon(AlphabetGreekIcon) },
  Relations: { title: 'Relations', icon: icon(EqualNotIcon) },
  Delimiters: { title: 'Delimiters', icon: icon(MatrixIcon) },
  Functions: { title: 'Functions', icon: icon(FunctionOfXIcon) },
  Misc: { title: 'Misc', icon: icon(PlusMinus01Icon) },
};

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
    const config = CATEGORY_CONFIG[cat];
    return {
      id: `math-cat-${cat.toLowerCase()}`,
      title: config.title,
      icon: config.icon,
      submenu: items.map((item) => ({
        id: `math-item-${item.id}`,
        title: item.title,
        icon: item.icon,
        onClick: () => onInsert(item.latex, item.cursorOffset),
      })),
    };
  });
}
