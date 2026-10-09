import { LatexNode } from '../tools/math-expression.model';

export function generateLatex(nodes: LatexNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'fraction':
          return `\\frac{${generateLatex(
            node.numerator ?? []
          )}}{${generateLatex(node.denominator ?? [])}}`;
        case 'power':
          return `{${generateLatex(node.base ?? [])}}^{${generateLatex(
            node.exponent ?? []
          )}}`;
        case 'sqrt':
          return `\\sqrt{${generateLatex(node.radicand ?? [])}}`;
        case 'nthRoot':
          return `\\sqrt[${generateLatex(node.degree ?? [])}]{${generateLatex(
            node.radicand ?? []
          )}}`;
        case 'integral':
          return `\\int ${generateLatex(node.integrand ?? [])} \\, dx`;
        case 'lim': {
          const v = generateLatex(
            node.variable && node.variable.length
              ? node.variable
              : [{ type: 'text', value: 'x' }]
          );
          const a = generateLatex(
            node.approach && node.approach.length
              ? node.approach
              : [{ type: 'text', value: '\\infty' }]
          );
          const expr = generateLatex(node.expr ?? []);
          return `\\lim_{${v} \\to ${a}} ${expr}`;
        }
        case 'matrix': {
          const rowsLatex = (node.rows ?? [])
            .map((row) => row.map((cell) => generateLatex([cell])).join(' & '))
            .join(' \\\\ ');
          return `\\begin{bmatrix} ${rowsLatex} \\end{bmatrix}`;
        }
        case 'system': {
          const rowsLatex = (node.rows ?? [])
            .map((row) => generateLatex(row))
            .join(' \\\\ ');
          return `\\begin{cases} ${rowsLatex} \\end{cases}`;
        }
        case 'placeholder':
          return `\\htmlClass{placeholder}{\\htmlStyle{border:2px solid black; padding:2px; display:inline-block;}{?}}`;
        default:
          return '';
      }
    })
    .join('');
}

export function latexNodesToLatex(
  nodes: LatexNode[],
  selectedId?: string | null
): string {
  if (!nodes) return '';

  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;

        case 'fraction': {
          const numerator =
            node.numerator && node.numerator.length
              ? latexNodesToLatex(node.numerator, selectedId)
              : '';
          const denominator =
            node.denominator && node.denominator.length
              ? latexNodesToLatex(node.denominator, selectedId)
              : '';
          return `\\frac{${numerator}}{${denominator}}`;
        }

        case 'power': {
          const base =
            node.base && node.base.length
              ? latexNodesToLatex(node.base, selectedId)
              : '';
          const exponent =
            node.exponent && node.exponent.length
              ? latexNodesToLatex(node.exponent, selectedId)
              : '';
          return `{${base}}^{${exponent}}`;
        }

        case 'sqrt': {
          const radicand =
            node.radicand && node.radicand.length
              ? latexNodesToLatex(node.radicand, selectedId)
              : '';
          return `\\sqrt{${radicand}}`;
        }

        case 'nthRoot': {
          const degree =
            node.degree && node.degree.length
              ? latexNodesToLatex(node.degree, selectedId)
              : '';
          const nthRadicand =
            node.radicand && node.radicand.length
              ? latexNodesToLatex(node.radicand, selectedId)
              : '';
          return `\\sqrt[${degree}]{${nthRadicand}}`;
        }

        case 'integral': {
          const integrand =
            node.integrand && node.integrand.length
              ? latexNodesToLatex(node.integrand, selectedId)
              : '';
          return `\\int ${integrand} \\, dx`;
        }

        case 'lim': {
          const v =
            node.variable && node.variable.length
              ? latexNodesToLatex(node.variable, selectedId)
              : 'x';
          const a =
            node.approach && node.approach.length
              ? latexNodesToLatex(node.approach, selectedId)
              : '\\infty';
          const expr =
            node.expr && node.expr.length
              ? latexNodesToLatex(node.expr, selectedId)
              : '';
          return `\\lim_{{${v}} \\to {${a}}} ${expr}`;
        }

        case 'matrix': {
          if (!node.rows || !node.rows.length) return '';
          const rowsLatex = node.rows
            .map((row) =>
              row
                .map((cell) => latexNodesToLatex([cell], selectedId))
                .join(' & ')
            )
            .join(' \\\\ ');
          return `\\begin{bmatrix} ${rowsLatex} \\end{bmatrix}`;
        }

        case 'system': {
          if (!node.rows || !node.rows.length) return '';
          const rowsLatex = node.rows
            .map((row) => latexNodesToLatex(row, selectedId))
            .join(' \\\\ ');
          return `\\begin{cases} ${rowsLatex} \\end{cases}`;
        }

        case 'placeholder': {
          const classes = ['placeholder'];
          if (node.id === selectedId) {
            classes.push('selected-placeholder');
          }
          const style =
            node.id === selectedId
              ? 'border:2px solid gray; padding:2px; display:inline-block;'
              : 'border:2px solid black; padding:2px; display:inline-block;';
          return `\\htmlClass{${classes.join(' ')}}{\\htmlStyle{${style}}{?}}`;
        }

        default:
          return '';
      }
    })
    .join('');
}

export function parseLatexToNodes(input: string): LatexNode[] {
  const nodes: LatexNode[] = [];
  let i = 0;

  function parseGroup(): LatexNode[] {
    if (input[i] !== '{') return [];
    i++;
    const groupContent: string[] = [];
    let depth = 1;
    while (i < input.length && depth > 0) {
      if (input[i] === '{') depth++;
      else if (input[i] === '}') depth--;
      if (depth > 0) groupContent.push(input[i]);
      i++;
    }
    return parseLatexToNodes(groupContent.join(''));
  }

  function parseOneTokenAsNodes(): LatexNode[] {
    if (input[i] === '\\') {
      let cmd = '\\';
      i++;
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        cmd += input[i++];
      }
      return [{ type: 'text', value: cmd }];
    } else if (i < input.length) {
      const ch = input[i++];
      return [{ type: 'text', value: ch }];
    }
    return [];
  }

  function skipSpaces() {
    while (i < input.length && /\s/.test(input[i])) i++;
  }

  while (i < input.length) {
    if (input.startsWith('\\frac', i)) {
      i += 5;
      skipSpaces();
      let numerator: LatexNode[] =
        input[i] === '{' ? parseGroup() : parseOneTokenAsNodes();

      skipSpaces();
      let denominator: LatexNode[] =
        input[i] === '{' ? parseGroup() : parseOneTokenAsNodes();

      nodes.push({ type: 'fraction', numerator, denominator });
      continue;
    }

    if (input.startsWith('\\sqrt', i)) {
      i += 5;
      skipSpaces();

      let degree: LatexNode[] | undefined;
      if (input[i] === '[') {
        i++;
        let deg = '';
        while (i < input.length && input[i] !== ']') deg += input[i++];
        if (input[i] === ']') i++;
        degree = parseLatexToNodes(deg);
        skipSpaces();
      }

      let radicand: LatexNode[];
      if (input[i] === '{') {
        radicand = parseGroup();
      } else {
        radicand = parseOneTokenAsNodes();
      }

      if (degree) {
        nodes.push({ type: 'nthRoot', degree, radicand });
      } else {
        nodes.push({ type: 'sqrt', radicand });
      }
      continue;
    }

    if (input.startsWith('\\int', i)) {
      i += 4;
      const integrand = parseLatexToNodes(input.slice(i));
      nodes.push({ type: 'integral', integrand });
      break;
    }

    if (input.startsWith('\\lim', i)) {
      i += 4;
      skipSpaces();
      let variable: LatexNode[] | undefined;
      let approach: LatexNode[] | undefined;

      if (input[i] === '_') {
        i++;
        skipSpaces();
        let subStr = '';
        if (input[i] === '{') {
          i++;
          let depth = 1;
          while (i < input.length && depth > 0) {
            if (input[i] === '{') depth++;
            else if (input[i] === '}') depth--;
            if (depth > 0) subStr += input[i];
            i++;
          }
        } else {
          while (
            i < input.length &&
            !/\s/.test(input[i]) &&
            input[i] !== '{' &&
            input[i] !== '\\' &&
            input[i] !== '^'
          ) {
            subStr += input[i++];
          }
        }

        const toMatch = subStr.match(/(.*?)(?:\\to|\\rightarrow)(.*)/);
        if (toMatch) {
          const varPart = toMatch[1].trim();
          const approachPart = toMatch[2].trim();
          variable = varPart
            ? parseLatexToNodes(varPart)
            : [{ type: 'text', value: 'x' }];
          approach = approachPart
            ? parseLatexToNodes(approachPart)
            : [{ type: 'text', value: '\\infty' }];
        } else if (subStr.trim()) {
          variable = parseLatexToNodes(subStr.trim());
        }
      }

      skipSpaces();
      const expr = parseLatexToNodes(input.slice(i));
      nodes.push({ type: 'lim', variable, approach, expr });
      break;
    }

    if (input[i] === '^') {
      i++;
      skipSpaces();
      let exponent: LatexNode[];
      if (input[i] === '{') {
        exponent = parseGroup();
      } else {
        exponent = parseOneTokenAsNodes();
      }

      const base = nodes.length > 0 ? [nodes.pop()!] : [];
      nodes.push({ type: 'power', base, exponent });
      continue;
    }

    if (input.startsWith('\\begin{bmatrix}', i)) {
      const start = i + '\\begin{bmatrix}'.length;
      const endIdx = input.indexOf('\\end{bmatrix}', start);
      const content = endIdx >= 0 ? input.slice(start, endIdx) : '';
      i = endIdx >= 0 ? endIdx + '\\end{bmatrix}'.length : input.length;
      const rowsStr = content.split('\\\\');
      const rows = rowsStr.map((r) =>
        r
          .split('&')
          .map((cell) => parseLatexToNodes(cell.trim()) as unknown as LatexNode)
          .flat()
      );
      nodes.push({ type: 'matrix', rows });
      continue;
    }

    if (input.startsWith('\\begin{cases}', i)) {
      const start = i + '\\begin{cases}'.length;
      const endIdx = input.indexOf('\\end{cases}', start);
      const content = endIdx >= 0 ? input.slice(start, endIdx) : '';
      i = endIdx >= 0 ? endIdx + '\\end{cases}'.length : input.length;
      const rowsStr = content.split('\\\\');
      const rows = rowsStr.map((r) => parseLatexToNodes(r.trim()));
      nodes.push({ type: 'system', rows });
      continue;
    }

    if (input.startsWith('\\left\\{\\begin{array}', i)) {
      const endSig = '\\end{array}\\right.';
      const endIdx = input.indexOf(endSig, i);
      const content = endIdx >= 0 ? input.slice(i, endIdx) : '';
      i = endIdx >= 0 ? endIdx + endSig.length : input.length;
      const innerStart = content.indexOf('}');
      const inner = innerStart >= 0 ? content.slice(innerStart + 1) : '';
      const rowsStr = inner.split('\\\\');
      const rows = rowsStr.map((r) => parseLatexToNodes(r.trim()));
      nodes.push({ type: 'system', rows });
      continue;
    }

    if (input[i] === '\\') {
      let cmd = '\\';
      i++;
      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        cmd += input[i++];
      }
      nodes.push({ type: 'text', value: cmd });
      continue;
    }

    if (input[i] === '{' || input[i] === '}') {
      i++;
      continue;
    }

    let text = '';
    while (
      i < input.length &&
      input[i] !== '\\' &&
      input[i] !== '{' &&
      input[i] !== '}' &&
      input[i] !== '^'
    ) {
      text += input[i++];
    }
    if (text) nodes.push({ type: 'text', value: text });
  }

  return nodes;
}
