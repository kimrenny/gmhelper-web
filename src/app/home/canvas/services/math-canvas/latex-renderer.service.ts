import { Injectable } from '@angular/core';
import { PlaceholderIdService } from './placeholderId.service';
import { LatexNode } from '../../tools/math-expression.model';
import { latexNodesToLatex } from '../../utils/latex-parser.utils';
import {
  isLatexValid,
  unwrapAligned,
  wrapAligned,
} from '../../utils/latex-validation.utils';
import katex from 'katex';
import {
  addPlaceholderAttributes,
  assignNewPlaceholderIds,
} from '../../utils/latex-placeholders.utils';

@Injectable({
  providedIn: 'root',
})
export class LatexRendererService {
  constructor(private placeholderIdService: PlaceholderIdService) {}

  render(
    element: HTMLElement,
    tree: LatexNode[],
    selectedPlaceholderId: string | null,
    options: { trust?: boolean; throwError?: boolean } = {}
  ): { latex: string; success: boolean } {
    if (!element) return { latex: '', success: false };

    const { trust = false, throwError = false } = options;

    element.innerHTML = '';

    const rawLatex = latexNodesToLatex(tree, selectedPlaceholderId);
    const wrapped = wrapAligned(rawLatex);

    if (!isLatexValid(wrapped)) return { latex: '', success: false };

    try {
      katex.render(wrapped, element, {
        throwOnError: throwError,
        displayMode: true,
        output: 'mathml',
        trust,
        strict: false,
      });
    } catch {
      return { latex: '', success: false };
    }

    const unwrapped = unwrapAligned(wrapped);

    this.placeholderIdService.reset();
    assignNewPlaceholderIds(tree, this.placeholderIdService);
    addPlaceholderAttributes(element, tree, selectedPlaceholderId);

    return { latex: unwrapped, success: true };
  }

  renderLatex(
    element: HTMLElement,
    latex: string,
    options: { trust?: boolean; throwError?: boolean } = {}
  ): { success: boolean } {
    if (!element) return { success: false };

    const { trust = false, throwError = false } = options;

    element.innerHTML = '';

    const wrapped = wrapAligned(latex);

    if (!isLatexValid(wrapped)) return { success: false };

    try {
      katex.render(wrapped, element, {
        throwOnError: throwError,
        displayMode: true,
        output: 'mathml',
        trust,
        strict: false,
      });
    } catch {
      return { success: false };
    }

    return { success: true };
  }
}
