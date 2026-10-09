import { PlaceholderIdService } from '../services/math-canvas/placeholderId.service';
import { LatexNode } from '../tools/math-expression.model';

export function addPlaceholderAttributes(
  container: HTMLElement,
  latexTree: LatexNode[],
  selectedId: string | null
) {
  let elements = Array.from(container.querySelectorAll('.placeholder')) as HTMLElement[];
  if (elements.length === 0) {
    elements = (Array.from(container.querySelectorAll('mo, mi, mtext, span')) as HTMLElement[]).filter(
      (el) => el.textContent?.trim() === '?'
    );
  }

  let placeholderIndex = 0;

  const markPlaceholders = (nodes: LatexNode[]) => {
    for (const node of nodes) {
      if (node.type === 'placeholder') {
        if (placeholderIndex >= elements.length) break;

        const el = elements[placeholderIndex] as HTMLElement;

        el.classList.add('placeholder');
        el.style.cursor = 'pointer';
        el.dataset['placeholderId'] = node.id || '';

        if (node.id === selectedId) {
          el.classList.add('selected-placeholder');
        } else {
          el.classList.remove('selected-placeholder');
        }

        placeholderIndex++;
      } else {
        switch (node.type) {
          case 'fraction':
            if (node.numerator) markPlaceholders(node.numerator);
            if (node.denominator) markPlaceholders(node.denominator);
            break;
          case 'power':
            if (node.base) markPlaceholders(node.base);
            if (node.exponent) markPlaceholders(node.exponent);
            break;
          case 'sqrt':
            if (node.radicand) markPlaceholders(node.radicand);
            break;
          case 'nthRoot':
            if (node.degree) markPlaceholders(node.degree);
            if (node.radicand) markPlaceholders(node.radicand);
            break;
          case 'integral':
            if (node.integrand) markPlaceholders(node.integrand);
            break;
          case 'lim':
            if (node.variable) markPlaceholders(node.variable);
            if (node.approach) markPlaceholders(node.approach);
            if (node.expr) markPlaceholders(node.expr);
            break;
          case 'matrix':
          case 'system':
            if (node.rows) {
              for (const row of node.rows) {
                markPlaceholders(row);
              }
            }
            break;
        }
      }
    }
  };

  markPlaceholders(latexTree);
}

export function assignNewPlaceholderIds(
  nodes: LatexNode[],
  idService: PlaceholderIdService
) {
  for (const node of nodes) {
    if (node.type === 'placeholder') {
      node.id = `ph_${idService.getNextId()}`;
    } else {
      switch (node.type) {
        case 'fraction':
          if (node.numerator)
            assignNewPlaceholderIds(node.numerator, idService);
          if (node.denominator)
            assignNewPlaceholderIds(node.denominator, idService);
          break;
        case 'power':
          if (node.base) assignNewPlaceholderIds(node.base, idService);
          if (node.exponent) assignNewPlaceholderIds(node.exponent, idService);
          break;
        case 'sqrt':
          if (node.radicand) assignNewPlaceholderIds(node.radicand, idService);
          break;
        case 'nthRoot':
          if (node.degree) assignNewPlaceholderIds(node.degree, idService);
          if (node.radicand) assignNewPlaceholderIds(node.radicand, idService);
          break;
        case 'integral':
          if (node.integrand)
            assignNewPlaceholderIds(node.integrand, idService);
          break;
        case 'lim':
          if (node.variable) assignNewPlaceholderIds(node.variable, idService);
          if (node.approach) assignNewPlaceholderIds(node.approach, idService);
          if (node.expr) assignNewPlaceholderIds(node.expr, idService);
          break;
        case 'matrix':
        case 'system':
          if (node.rows) {
            for (const row of node.rows) {
              assignNewPlaceholderIds(row, idService);
            }
          }
          break;
      }
    }
  }
}

export function hasPlaceholders(nodes: LatexNode[]): boolean {
  return nodes.some((node) => {
    if (node.type === 'placeholder') return true;

    switch (node.type) {
      case 'fraction':
        return (
          hasPlaceholders(node.numerator ?? []) ||
          hasPlaceholders(node.denominator ?? [])
        );
      case 'power':
        return (
          hasPlaceholders(node.base ?? []) ||
          hasPlaceholders(node.exponent ?? [])
        );
      case 'sqrt':
        return hasPlaceholders(node.radicand ?? []);
      case 'nthRoot':
        return (
          hasPlaceholders(node.degree ?? []) ||
          hasPlaceholders(node.radicand ?? [])
        );
      case 'integral':
        return hasPlaceholders(node.integrand ?? []);
      case 'lim':
        return (
          hasPlaceholders(node.variable ?? []) ||
          hasPlaceholders(node.approach ?? []) ||
          hasPlaceholders(node.expr ?? [])
        );
      case 'system':
      case 'matrix':
        return node.rows.some((row) => hasPlaceholders(row));
      default:
        return false;
    }
  });
}
