import katex from 'katex';
import { hasPlaceholders } from './latex-placeholders.utils';
import { LatexNode } from '../tools/math-expression.model';

export function isLatexValid(latex: string): boolean {
  if (!isLatexStructurallyValid(latex)) return false;
  try {
    katex.renderToString(latex, { throwOnError: true, strict: false });
    return true;
  } catch {
    return false;
  }
}

export function isLatexValidWithoutPlaceholders(
  latexTree: LatexNode[],
  latex: string
): boolean {
  if (!latex || !latex.trim()) {
    return false;
  }

  if (hasPlaceholders(latexTree)) {
    return false;
  }

  if (!isLatexValid(latex)) {
    return false;
  }

  return true;
}

function hasBalancedBraces(s: string): boolean {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function readGroup(str: string, start: number) {
  let i = start;
  while (i < str.length && /\s/.test(str[i])) i++;
  if (str[i] !== '{') return null;
  i++;
  let depth = 1;
  let content = '';
  while (i < str.length && depth > 0) {
    const ch = str[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth > 0) content += ch;
    i++;
  }
  if (depth !== 0) return null;
  return { content, end: i };
}

export function isLatexStructurallyValid(latex: string): boolean {
  const s = unwrapAligned(latex);

  if (!hasBalancedBraces(s)) return false;

  let i = 0;
  while (i < s.length) {
    if (s.startsWith('\\frac', i)) {
      i += 5;
      const g1 = readGroup(s, i);
      if (g1) {
        i = g1.end;
      } else {
        if (s[i] === '\\') {
          i++;
          while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
        } else {
          i++;
        }
      }

      const g2 = readGroup(s, i);
      if (g2) {
        i = g2.end;
      } else {
        if (s[i] === '\\') {
          i++;
          while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
        } else {
          i++;
        }
      }
      continue;
    }

    if (s.startsWith('\\sqrt', i)) {
      i += 5;
      let j = i;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '[') {
        j++;
        while (j < s.length && s[j] !== ']') j++;
        if (s[j] !== ']') return false;
        j++;
      }
      i = j;

      if (s[i] === '{') {
        const g = readGroup(s, i);
        if (!g) return false;
        i = g.end;
      } else {
        if (s[i] === '\\') {
          i++;
          while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
        } else {
          i++;
        }
      }
      continue;
    }

    if (s.startsWith('\\begin{bmatrix}', i)) {
      const start = i + '\\begin{bmatrix}'.length;
      const endIdx = s.indexOf('\\end{bmatrix}', start);
      if (endIdx === -1) return false;
      i = endIdx + '\\end{bmatrix}'.length;
      continue;
    }

    if (s.startsWith('\\begin{cases}', i)) {
      const start = i + '\\begin{cases}'.length;
      const endIdx = s.indexOf('\\end{cases}', start);
      if (endIdx === -1) return false;
      i = endIdx + '\\end{cases}'.length;
      continue;
    }

    if (s.startsWith('\\left\\{\\begin{array}', i)) {
      const endSig = '\\end{array}\\right.';
      const endIdx = s.indexOf(endSig, i);
      if (endIdx === -1) return false;
      i = endIdx + endSig.length;
      continue;
    }

    if (s[i] === '^' || s[i] === '_') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] === '{') {
        const g = readGroup(s, i);
        if (!g) return false;
        i = g.end;
      } else {
        if (s[i] === '\\') {
          i++;
          while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
        } else {
          if (i >= s.length) return false;
          i++;
        }
      }
      continue;
    }

    if (s[i] === '\\') {
      i++;
      while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
      continue;
    }

    i++;
  }

  return true;
}

export function wrapAligned(latex: string): string {
  return `\\begin{aligned} ${latex} \\end{aligned}`;
}

export function unwrapAligned(latex: string): string {
  return latex.replace(/\\begin{aligned}|\\end{aligned}/g, '').trim();
}
