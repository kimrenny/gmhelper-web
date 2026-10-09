import { LatexNode } from './math-expression.model';

export interface MathButton {
  label: string;
  icon?: string;
  latex: string;
  getTemplate?: () => LatexNode;
}

let placeholderIdCounter = 1;

function createPlaceholder(): LatexNode {
  return {
    type: 'placeholder',
    id: `ph_${placeholderIdCounter++}`,
  };
}

export const SPECIAL_BUTTONS: MathButton[] = [
  { label: '0', latex: '0' },
  { label: '1', latex: '1' },
  { label: '2', latex: '2' },
  { label: '3', latex: '3' },
  { label: '4', latex: '4' },
  { label: '5', latex: '5' },
  { label: '6', latex: '6' },
  { label: '7', latex: '7' },
  { label: '8', latex: '8' },
  { label: '9', latex: '9' },
  { label: '+', latex: '+' },
  { label: '-', latex: '-' },
  { label: '⋅', latex: '\\cdot' },
  { label: '×', latex: '\\times' },
  { label: '÷', latex: '\\div' },
  { label: '±', latex: '\\pm' },
  { label: '=', latex: '=' },
  { label: '≠', latex: '\\neq' },
  { label: '<', latex: '<' },
  { label: '>', latex: '>' },
  { label: '≤', latex: '\\leq' },
  { label: '≥', latex: '\\geq' },
  { label: '(', latex: '(' },
  { label: ')', latex: ')' },
  { label: '²', latex: '^2' },
  { label: '³', latex: '^3' },
  { label: 'x', latex: 'x' },
  { label: 'y', latex: 'y' },
  { label: 'z', latex: 'z' },
  { label: 'i', latex: 'i' },
  { label: 'j', latex: 'j' },
  { label: 'k', latex: 'k' },
  { label: 'n', latex: 'n' },
  { label: 'sin', latex: '\\sin' },
  { label: 'cos', latex: '\\cos' },
  { label: 'tan', latex: '\\tan' },
  { label: 'cot', latex: '\\cot' },
  { label: 'arcsin', latex: '\\arcsin' },
  { label: 'arccos', latex: '\\arccos' },
  { label: 'arctan', latex: '\\arctan' },
  { label: 'log', latex: '\\log' },
  { label: 'ln', latex: '\\ln' },
  { label: 'e', latex: 'e' },
  { label: 'eˣ', latex: 'e^x' },
  { label: 'π', latex: '\\pi' },
  { label: 'θ', latex: '\\theta' },
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'λ', latex: '\\lambda' },
  { label: 'μ', latex: '\\mu' },
  { label: 'σ', latex: '\\sigma' },
  { label: 'ω', latex: '\\omega' },
  { label: 'Φ', latex: '\\Phi' },
  { label: 'Δ', latex: '\\Delta' },
  { label: '∇', latex: '\\nabla' },
  { label: '⊥', latex: '\\perp' },
  { label: '∥', latex: '\\parallel' },
  { label: '∞', latex: '\\infty' },
  { label: '∈', latex: '\\in' },
  { label: '∉', latex: '\\notin' },
  { label: '∃', latex: '\\exists' },
  { label: '∀', latex: '\\forall' },
  { label: '∑', latex: '\\sum' },
  { label: '∅', latex: '\\emptyset' },
  { label: '∪', latex: '\\cup' },
  { label: '∩', latex: '\\cap' },
  { label: '⊂', latex: '\\subset' },
  { label: '⊃', latex: '\\supset' },
  { label: '⊆', latex: '\\subseteq' },
  { label: '⊇', latex: '\\supseteq' },
];

export const FUNCTIONAL_BUTTONS: MathButton[] = [
  { label: 'x²', icon: '', latex: 'x^2' },
  {
    label: 'xⁿ',
    icon: '',
    latex: 'x^n',
    getTemplate: () => ({
      type: 'power',
      base: [createPlaceholder()],
      exponent: [createPlaceholder()],
    }),
  },
  {
    label: 'sqrt',
    icon: 'assets/icons/square-root.png',
    latex: '\\sqrt{}',
    getTemplate: () => ({ type: 'sqrt', radicand: [createPlaceholder()] }),
  },
  {
    label: 'nthRoot',
    icon: 'assets/icons/nth-root.png',
    latex: '\\sqrt[n]{}',
    getTemplate: () => ({
      type: 'nthRoot',
      degree: [createPlaceholder()],
      radicand: [createPlaceholder()],
    }),
  },
  {
    label: 'fraction',
    icon: 'assets/icons/fraction.png',
    latex: '\\frac{}{}',
    getTemplate: () => ({
      type: 'fraction',
      numerator: [createPlaceholder()],
      denominator: [createPlaceholder()],
    }),
  },
  {
    label: 'systemEquations',
    icon: 'assets/icons/system-equations.png',
    latex: '\\begin{cases} \\end{cases}',
    getTemplate: () => ({
      type: 'system',
      rows: [[createPlaceholder()], [createPlaceholder()]],
    }),
  },
  {
    label: 'integral',
    icon: 'assets/icons/integral.png',
    latex: '\\int x \\, dx',
    getTemplate: () => ({
      type: 'integral',
      integrand: [createPlaceholder()],
    }),
  },
  {
    label: 'lim',
    icon: '',
    latex: '\\lim_{x \\to \\infty}',
    getTemplate: () => ({
      type: 'lim',
      variable: [createPlaceholder()],
      approach: [createPlaceholder()],
      expr: [createPlaceholder()],
    }),
  },
  {
    label: 'matrix',
    icon: 'assets/icons/matrix.png',
    latex: '\\begin{bmatrix} \\end{bmatrix}',
    getTemplate: () => ({
      type: 'matrix',
      rows: [
        [createPlaceholder(), createPlaceholder(), createPlaceholder()],
        [createPlaceholder(), createPlaceholder(), createPlaceholder()],
        [createPlaceholder(), createPlaceholder(), createPlaceholder()],
      ],
    }),
  },
];
