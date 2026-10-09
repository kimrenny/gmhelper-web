export type LatexNode =
  | { type: 'text'; value: string }
  | { type: 'fraction'; numerator?: LatexNode[]; denominator?: LatexNode[] }
  | { type: 'power'; base?: LatexNode[]; exponent?: LatexNode[] }
  | { type: 'sqrt'; radicand?: LatexNode[] }
  | { type: 'nthRoot'; degree?: LatexNode[]; radicand?: LatexNode[] }
  | { type: 'integral'; integrand?: LatexNode[] }
  | {
      type: 'lim';
      variable?: LatexNode[];
      approach?: LatexNode[];
      expr?: LatexNode[];
    }
  | { type: 'matrix'; rows: LatexNode[][] }
  | { type: 'system'; rows: LatexNode[][] }
  | { type: 'placeholder'; id: string };
