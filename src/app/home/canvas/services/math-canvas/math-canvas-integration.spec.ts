import { TestBed } from '@angular/core/testing';
import { CanvasService } from './canvas.service';
import { LatexRendererService } from './latex-renderer.service';
import { PlaceholderIdService } from './placeholderId.service';
import { TokenService } from 'src/app/services/token.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { of } from 'rxjs';
import {
  FUNCTIONAL_BUTTONS,
  SPECIAL_BUTTONS,
  MathButton,
} from '../../tools/math-buttons';
import {
  generateLatex,
  latexNodesToLatex,
  parseLatexToNodes,
} from '../../utils/latex-parser.utils';
import {
  isLatexValid,
  isLatexValidWithoutPlaceholders,
} from '../../utils/latex-validation.utils';
import { replacePlaceholder } from '../../utils/latex-tree.utils';
import { hasPlaceholders } from '../../utils/latex-placeholders.utils';
import { LatexNode } from '../../tools/math-expression.model';
import { splitMathSolutionSteps } from '../../math-solution-canvas/math-solution-canvas.component';

import { LanguageService } from 'src/app/services/language.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';

describe('Math Canvas LaTeX Generation & Integration', () => {
  let canvasService: CanvasService;
  let placeholderIdService: PlaceholderIdService;
  let languageService: LanguageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const tokenServiceStub = {
      getToken$: () => of('mock-token'),
      createAuthHeaders: () => ({ Authorization: 'Bearer mock-token' }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        provideMockStore({}),
        LanguageService,
        CanvasService,
        LatexRendererService,
        PlaceholderIdService,
        { provide: TokenService, useValue: tokenServiceStub },
      ],
    });

    canvasService = TestBed.inject(CanvasService);
    placeholderIdService = TestBed.inject(PlaceholderIdService);
    languageService = TestBed.inject(LanguageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Special Math Buttons LaTeX Generation', () => {
    it('should generate valid LaTeX for arithmetic and relation symbols', () => {
      const symbolsToTest: { label: string; expectedLatex: string }[] = [
        { label: '+', expectedLatex: '+' },
        { label: '-', expectedLatex: '-' },
        { label: '⋅', expectedLatex: '\\cdot' },
        { label: '×', expectedLatex: '\\times' },
        { label: '÷', expectedLatex: '\\div' },
        { label: '±', expectedLatex: '\\pm' },
        { label: '=', expectedLatex: '=' },
        { label: '≠', expectedLatex: '\\neq' },
        { label: '<', expectedLatex: '<' },
        { label: '>', expectedLatex: '>' },
        { label: '≤', expectedLatex: '\\leq' },
        { label: '≥', expectedLatex: '\\geq' },
        { label: '(', expectedLatex: '(' },
        { label: ')', expectedLatex: ')' },
        { label: 'sin', expectedLatex: '\\sin' },
        { label: 'cos', expectedLatex: '\\cos' },
        { label: 'tan', expectedLatex: '\\tan' },
        { label: 'cot', expectedLatex: '\\cot' },
        { label: 'arcsin', expectedLatex: '\\arcsin' },
        { label: 'arccos', expectedLatex: '\\arccos' },
        { label: 'arctan', expectedLatex: '\\arctan' },
        { label: 'π', expectedLatex: '\\pi' },
        { label: 'θ', expectedLatex: '\\theta' },
        { label: 'λ', expectedLatex: '\\lambda' },
        { label: 'μ', expectedLatex: '\\mu' },
        { label: 'σ', expectedLatex: '\\sigma' },
        { label: 'Δ', expectedLatex: '\\Delta' },
        { label: '∞', expectedLatex: '\\infty' },
        { label: '∈', expectedLatex: '\\in' },
        { label: '∉', expectedLatex: '\\notin' },
      ];

      for (const item of symbolsToTest) {
        const btn = SPECIAL_BUTTONS.find((b) => b.label === item.label);
        expect(btn).toBeDefined(`Button ${item.label} should be defined`);
        expect(btn!.latex).toBe(item.expectedLatex);
        const node: LatexNode = { type: 'text', value: btn!.latex };
        const latex = generateLatex([node]);
        expect(latex).toBe(item.expectedLatex);
      }
    });

    it('should generate valid LaTeX for numeric and variable buttons', () => {
      const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      for (const d of digits) {
        const btn = SPECIAL_BUTTONS.find((b) => b.label === d);
        expect(btn).toBeDefined();
        expect(btn!.latex).toBe(d);
      }

      const vars = ['x', 'y', 'z', 'i', 'j', 'k', 'n', 'e'];
      for (const v of vars) {
        const btn = SPECIAL_BUTTONS.find((b) => b.label === v);
        expect(btn).toBeDefined();
        expect(btn!.latex).toBe(v);
      }
    });
  });

  describe('Functional Math Buttons Templates & AST', () => {
    it('should produce fraction template with numerator and denominator placeholders', () => {
      const fracBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'fraction');
      expect(fracBtn).toBeDefined();
      expect(fracBtn!.getTemplate).toBeDefined();

      const template = fracBtn!.getTemplate!() as {
        type: 'fraction';
        numerator: LatexNode[];
        denominator: LatexNode[];
      };
      expect(template.type).toBe('fraction');
      expect(template.numerator.length).toBe(1);
      expect(template.denominator.length).toBe(1);
      expect(template.numerator[0].type).toBe('placeholder');
      expect(template.denominator[0].type).toBe('placeholder');

      let tree: LatexNode[] = [template];
      expect(hasPlaceholders(tree)).toBeTrue();
      expect(isLatexValidWithoutPlaceholders(tree, '\\frac{?}{?}')).toBeFalse();

      // Replace numerator with '3' and denominator with '4'
      const numPhId = (template.numerator[0] as { id: string }).id;
      const denPhId = (template.denominator[0] as { id: string }).id;

      tree = replacePlaceholder(tree, numPhId, [{ type: 'text', value: '3' }]);
      tree = replacePlaceholder(tree, denPhId, [{ type: 'text', value: '4' }]);

      expect(hasPlaceholders(tree)).toBeFalse();
      const renderedLatex = latexNodesToLatex(tree);
      expect(renderedLatex).toBe('\\frac{3}{4}');
      expect(isLatexValidWithoutPlaceholders(tree, renderedLatex)).toBeTrue();
    });

    it('should produce power (xⁿ) template with base and exponent placeholders', () => {
      const powerBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'xⁿ');
      expect(powerBtn).toBeDefined();
      const template = powerBtn!.getTemplate!() as {
        type: 'power';
        base: LatexNode[];
        exponent: LatexNode[];
      };
      expect(template.type).toBe('power');
      expect(template.base.length).toBe(1);
      expect(template.exponent.length).toBe(1);

      const basePhId = (template.base[0] as { id: string }).id;
      const expPhId = (template.exponent[0] as { id: string }).id;

      let tree: LatexNode[] = [template];
      tree = replacePlaceholder(tree, basePhId, [{ type: 'text', value: 'x' }]);
      tree = replacePlaceholder(tree, expPhId, [{ type: 'text', value: '2' }]);

      const rendered = latexNodesToLatex(tree);
      expect(rendered).toBe('{x}^{2}');
      expect(isLatexValidWithoutPlaceholders(tree, rendered)).toBeTrue();
    });

    it('should produce square root and nth-root templates correctly', () => {
      const sqrtBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'sqrt');
      const sqrtTemplate = sqrtBtn!.getTemplate!() as {
        type: 'sqrt';
        radicand: LatexNode[];
      };
      expect(sqrtTemplate.type).toBe('sqrt');

      let sqrtTree: LatexNode[] = [sqrtTemplate];
      sqrtTree = replacePlaceholder(
        sqrtTree,
        (sqrtTemplate.radicand[0] as { id: string }).id,
        [{ type: 'text', value: '16' }]
      );
      expect(latexNodesToLatex(sqrtTree)).toBe('\\sqrt{16}');

      const nthRootBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'nthRoot');
      const nthTemplate = nthRootBtn!.getTemplate!() as {
        type: 'nthRoot';
        degree: LatexNode[];
        radicand: LatexNode[];
      };
      expect(nthTemplate.type).toBe('nthRoot');

      let nthTree: LatexNode[] = [nthTemplate];
      nthTree = replacePlaceholder(
        nthTree,
        (nthTemplate.degree[0] as { id: string }).id,
        [{ type: 'text', value: '3' }]
      );
      nthTree = replacePlaceholder(
        nthTree,
        (nthTemplate.radicand[0] as { id: string }).id,
        [{ type: 'text', value: '27' }]
      );
      expect(latexNodesToLatex(nthTree)).toBe('\\sqrt[3]{27}');
    });

    it('should produce integral and comprehensive limit templates with editable variable, approach, and expr', () => {
      const intBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'integral');
      const intTemplate = intBtn!.getTemplate!() as {
        type: 'integral';
        integrand: LatexNode[];
      };
      let intTree: LatexNode[] = [intTemplate];
      intTree = replacePlaceholder(
        intTree,
        (intTemplate.integrand[0] as { id: string }).id,
        [{ type: 'text', value: 'x^2' }]
      );
      expect(latexNodesToLatex(intTree)).toBe('\\int x^2 \\, dx');

      // Test limit template structure with 3 placeholders
      const limBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'lim');
      expect(limBtn).toBeDefined();
      const limTemplate = limBtn!.getTemplate!() as {
        type: 'lim';
        variable: LatexNode[];
        approach: LatexNode[];
        expr: LatexNode[];
      };
      expect(limTemplate.type).toBe('lim');
      expect(limTemplate.variable.length).toBe(1);
      expect(limTemplate.approach.length).toBe(1);
      expect(limTemplate.expr.length).toBe(1);
      expect(limTemplate.variable[0].type).toBe('placeholder');
      expect(limTemplate.approach[0].type).toBe('placeholder');
      expect(limTemplate.expr[0].type).toBe('placeholder');

      const varPhId = (limTemplate.variable[0] as { id: string }).id;
      const appPhId = (limTemplate.approach[0] as { id: string }).id;
      const exprPhId = (limTemplate.expr[0] as { id: string }).id;

      // 1. Limit approaching 0: lim_{x -> 0} \frac{\sin(x)}{x}
      let limTree: LatexNode[] = [limTemplate];
      expect(hasPlaceholders(limTree)).toBeTrue();

      limTree = replacePlaceholder(limTree, varPhId, [{ type: 'text', value: 'x' }]);
      limTree = replacePlaceholder(limTree, appPhId, [{ type: 'text', value: '0' }]);
      limTree = replacePlaceholder(limTree, exprPhId, [
        {
          type: 'fraction',
          numerator: [{ type: 'text', value: '\\sin(x)' }],
          denominator: [{ type: 'text', value: 'x' }],
        },
      ]);

      expect(hasPlaceholders(limTree)).toBeFalse();
      const rendered0 = latexNodesToLatex(limTree);
      expect(rendered0).toBe('\\lim_{{x} \\to {0}} \\frac{\\sin(x)}{x}');
      expect(isLatexValidWithoutPlaceholders(limTree, rendered0)).toBeTrue();

      // 2. Limit approaching infinity: lim_{n -> \infty} (1 + 1/n)^n
      const limTemplateInf = limBtn!.getTemplate!() as {
        type: 'lim';
        variable: LatexNode[];
        approach: LatexNode[];
        expr: LatexNode[];
      };
      let limTreeInf: LatexNode[] = [limTemplateInf];
      limTreeInf = replacePlaceholder(
        limTreeInf,
        (limTemplateInf.variable[0] as { id: string }).id,
        [{ type: 'text', value: 'n' }]
      );
      limTreeInf = replacePlaceholder(
        limTreeInf,
        (limTemplateInf.approach[0] as { id: string }).id,
        [{ type: 'text', value: '\\infty' }]
      );
      limTreeInf = replacePlaceholder(
        limTreeInf,
        (limTemplateInf.expr[0] as { id: string }).id,
        [{ type: 'text', value: '(1+\\frac{1}{n})^n' }]
      );
      const renderedInf = latexNodesToLatex(limTreeInf);
      expect(renderedInf).toBe('\\lim_{{n} \\to {\\infty}} (1+\\frac{1}{n})^n');
      expect(isLatexValidWithoutPlaceholders(limTreeInf, renderedInf)).toBeTrue();

      // 3. Limit approaching a finite constant a: lim_{x -> a} f(x)
      const limTemplateA = limBtn!.getTemplate!() as any;
      let limTreeA: LatexNode[] = [limTemplateA];
      limTreeA = replacePlaceholder(limTreeA, limTemplateA.variable[0].id, [{ type: 'text', value: 'x' }]);
      limTreeA = replacePlaceholder(limTreeA, limTemplateA.approach[0].id, [{ type: 'text', value: 'a' }]);
      limTreeA = replacePlaceholder(limTreeA, limTemplateA.expr[0].id, [{ type: 'text', value: 'f(x)' }]);
      expect(latexNodesToLatex(limTreeA)).toBe('\\lim_{{x} \\to {a}} f(x)');

      // 4. One-sided limits: lim_{x -> 0^+} and lim_{x -> 0^-}
      const limTemplatePlus = limBtn!.getTemplate!() as any;
      let limTreePlus: LatexNode[] = [limTemplatePlus];
      limTreePlus = replacePlaceholder(limTreePlus, limTemplatePlus.variable[0].id, [{ type: 'text', value: 'x' }]);
      limTreePlus = replacePlaceholder(limTreePlus, limTemplatePlus.approach[0].id, [{ type: 'text', value: '0^+' }]);
      limTreePlus = replacePlaceholder(limTreePlus, limTemplatePlus.expr[0].id, [{ type: 'text', value: 'f(x)' }]);
      expect(latexNodesToLatex(limTreePlus)).toBe('\\lim_{{x} \\to {0^+}} f(x)');

      // 5. Negative infinity limit: lim_{x -> -\infty}
      const limTemplateNegInf = limBtn!.getTemplate!() as any;
      let limTreeNegInf: LatexNode[] = [limTemplateNegInf];
      limTreeNegInf = replacePlaceholder(limTreeNegInf, limTemplateNegInf.variable[0].id, [{ type: 'text', value: 'x' }]);
      limTreeNegInf = replacePlaceholder(limTreeNegInf, limTemplateNegInf.approach[0].id, [{ type: 'text', value: '-\\infty' }]);
      limTreeNegInf = replacePlaceholder(limTreeNegInf, limTemplateNegInf.expr[0].id, [{ type: 'text', value: 'e^x' }]);
      expect(latexNodesToLatex(limTreeNegInf)).toBe('\\lim_{{x} \\to {-\\infty}} e^x');
      expect(isLatexValidWithoutPlaceholders(limTreeNegInf, latexNodesToLatex(limTreeNegInf))).toBeTrue();
    });

    it('should produce 3x3 matrix template correctly', () => {
      const matrixBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'matrix');
      const matrixTemplate = matrixBtn!.getTemplate!() as {
        type: 'matrix';
        rows: LatexNode[][];
      };
      expect(matrixTemplate.type).toBe('matrix');
      expect(matrixTemplate.rows.length).toBe(3);
      expect(matrixTemplate.rows[0].length).toBe(3);
    });

    it('should produce system of equations template and serialize correctly', () => {
      const systemBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'systemEquations');
      expect(systemBtn).toBeDefined('systemEquations button must be defined in FUNCTIONAL_BUTTONS');
      const systemTemplate = systemBtn!.getTemplate!() as {
        type: 'system';
        rows: LatexNode[][];
      };
      expect(systemTemplate.type).toBe('system');
      expect(systemTemplate.rows.length).toBe(2);
      expect(systemTemplate.rows[0][0].type).toBe('placeholder');
      expect(systemTemplate.rows[1][0].type).toBe('placeholder');

      const ph1Id = (systemTemplate.rows[0][0] as { id: string }).id;
      const ph2Id = (systemTemplate.rows[1][0] as { id: string }).id;

      let tree: LatexNode[] = [systemTemplate];
      expect(hasPlaceholders(tree)).toBeTrue();

      // Replace placeholder 1 with equation "x + y = 10"
      tree = replacePlaceholder(tree, ph1Id, [
        { type: 'text', value: 'x' },
        { type: 'text', value: '+' },
        { type: 'text', value: 'y' },
        { type: 'text', value: '=' },
        { type: 'text', value: '10' },
      ]);
      expect(hasPlaceholders(tree)).toBeTrue();

      // Replace placeholder 2 with equation "2x - y = 5"
      tree = replacePlaceholder(tree, ph2Id, [
        { type: 'text', value: '2' },
        { type: 'text', value: 'x' },
        { type: 'text', value: '-' },
        { type: 'text', value: 'y' },
        { type: 'text', value: '=' },
        { type: 'text', value: '5' },
      ]);
      expect(hasPlaceholders(tree)).toBeFalse();

      const rendered = latexNodesToLatex(tree);
      expect(rendered).toBe('\\begin{cases} x+y=10 \\\\ 2x-y=5 \\end{cases}');
      expect(isLatexValid(rendered)).toBeTrue();
      expect(isLatexValidWithoutPlaceholders(tree, rendered)).toBeTrue();

      const genLatex = generateLatex(tree);
      expect(genLatex).toBe('\\begin{cases} x+y=10 \\\\ 2x-y=5 \\end{cases}');
    });

    it('should parse \\begin{cases} and \\left\\{\\begin{array} LaTeX into system AST and round-trip correctly', () => {
      const casesLatex = '\\begin{cases} x + y = 10 \\\\ 2x - y = 5 \\end{cases}';
      const parsedNodes = parseLatexToNodes(casesLatex);
      expect(parsedNodes.length).toBe(1);
      expect(parsedNodes[0].type).toBe('system');
      const sysNode = parsedNodes[0] as { type: 'system'; rows: LatexNode[][] };
      expect(sysNode.rows.length).toBe(2);

      const serialized = generateLatex(parsedNodes);
      expect(serialized).toBe('\\begin{cases} x + y = 10 \\\\ 2x - y = 5 \\end{cases}');

      // Legacy array format parsing
      const legacyLatex = '\\left\\{\\begin{array}{l} x + y = 10 \\\\ 2x - y = 5 \\end{array}\\right.';
      const parsedLegacy = parseLatexToNodes(legacyLatex);
      expect(parsedLegacy.length).toBe(1);
      expect(parsedLegacy[0].type).toBe('system');
      expect((parsedLegacy[0] as any).rows.length).toBe(2);
    });

    it('should serialize system of equations into task submission payload with language', () => {
      const systemLatex = '\\begin{cases} x + y = 10 \\\\ 2x - y = 5 \\end{cases}';
      canvasService.setLatex(systemLatex);
      languageService.updateLanguageFromUser('en');

      const payload = canvasService.serializeTaskJson();
      expect(payload).toEqual({
        data: systemLatex,
        language: 'en',
      });
    });

    it('should support nested limits: lim_{x -> 0} lim_{y -> 0} f(x, y)', () => {
      const limBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'lim');
      const outerLim = limBtn!.getTemplate!() as any;
      const innerLim = limBtn!.getTemplate!() as any;

      let innerTree: LatexNode[] = [innerLim];
      innerTree = replacePlaceholder(innerTree, innerLim.variable[0].id, [{ type: 'text', value: 'y' }]);
      innerTree = replacePlaceholder(innerTree, innerLim.approach[0].id, [{ type: 'text', value: '0' }]);
      innerTree = replacePlaceholder(innerTree, innerLim.expr[0].id, [{ type: 'text', value: 'f(x, y)' }]);

      let outerTree: LatexNode[] = [outerLim];
      outerTree = replacePlaceholder(outerTree, outerLim.variable[0].id, [{ type: 'text', value: 'x' }]);
      outerTree = replacePlaceholder(outerTree, outerLim.approach[0].id, [{ type: 'text', value: '0' }]);
      outerTree = replacePlaceholder(outerTree, outerLim.expr[0].id, innerTree);

      const rendered = latexNodesToLatex(outerTree);
      expect(rendered).toBe('\\lim_{{x} \\to {0}} \\lim_{{y} \\to {0}} f(x, y)');
      expect(isLatexValidWithoutPlaceholders(outerTree, rendered)).toBeTrue();
    });
  });

  describe('Mathematical Power Representation & Semantics', () => {
    it('should correctly represent single power x^2', () => {
      const node: LatexNode = {
        type: 'power',
        base: [{ type: 'text', value: 'x' }],
        exponent: [{ type: 'text', value: '2' }],
      };
      const latex = latexNodesToLatex([node]);
      expect(latex).toBe('{x}^{2}');
      expect(isLatexValid(latex)).toBeTrue();
    });

    it('should preserve AST structure for nested powers (x^2)^3 without invalid exponent concatenation', () => {
      const innerPower: LatexNode = {
        type: 'power',
        base: [{ type: 'text', value: 'x' }],
        exponent: [{ type: 'text', value: '2' }],
      };
      const outerPower: LatexNode = {
        type: 'power',
        base: [innerPower],
        exponent: [{ type: 'text', value: '3' }],
      };

      const latex = latexNodesToLatex([outerPower]);
      expect(latex).toBe('{{x}^{2}}^{3}');
      expect(latex).not.toContain('23');
      expect(isLatexValid(latex)).toBeTrue();
    });

    it('should represent power with power in exponent x^(2^3)', () => {
      const expPower: LatexNode = {
        type: 'power',
        base: [{ type: 'text', value: '2' }],
        exponent: [{ type: 'text', value: '3' }],
      };
      const rootPower: LatexNode = {
        type: 'power',
        base: [{ type: 'text', value: 'x' }],
        exponent: [expPower],
      };

      const latex = latexNodesToLatex([rootPower]);
      expect(latex).toBe('{x}^{{2}^{3}}');
      expect(latex).not.toContain('23');
      expect(isLatexValid(latex)).toBeTrue();
    });

    it('should represent power with compound expression in exponent a^(b+c)', () => {
      const node: LatexNode = {
        type: 'power',
        base: [{ type: 'text', value: 'a' }],
        exponent: [{ type: 'text', value: 'b+c' }],
      };
      const latex = latexNodesToLatex([node]);
      expect(latex).toBe('{a}^{b+c}');
      expect(isLatexValid(latex)).toBeTrue();
    });

    it('should parse LaTeX string back into nodes and preserve mathematical validity', () => {
      const inputLatex = '\\frac{a+b}{c} + \\sqrt{d}';
      const nodes = parseLatexToNodes(inputLatex);
      expect(nodes.length).toBeGreaterThan(0);
      expect(isLatexValid(inputLatex)).toBeTrue();
    });

    it('should parse limit LaTeX back into nodes with variable, approach, and expr intact', () => {
      const inputLatex = '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}';
      const nodes = parseLatexToNodes(inputLatex);
      expect(nodes.length).toBe(1);
      expect(nodes[0].type).toBe('lim');
      const limNode = nodes[0] as any;
      expect(limNode.variable).toBeDefined();
      expect(limNode.approach).toBeDefined();
      expect(limNode.expr).toBeDefined();
      expect(latexNodesToLatex(nodes)).toBe('\\lim_{{x} \\to {0}} \\frac{\\sin(x)}{x}');
    });

    it('should support nested expressions across multiple button types', () => {
      // 1. sin(x^2)
      const sinNodes: LatexNode[] = [
        { type: 'text', value: '\\sin(' },
        {
          type: 'power',
          base: [{ type: 'text', value: 'x' }],
          exponent: [{ type: 'text', value: '2' }],
        },
        { type: 'text', value: ')' },
      ];
      expect(latexNodesToLatex(sinNodes)).toBe('\\sin({x}^{2})');
      expect(isLatexValid(latexNodesToLatex(sinNodes))).toBeTrue();

      // 2. sqrt(1 + x^2)
      const sqrtNode: LatexNode = {
        type: 'sqrt',
        radicand: [
          { type: 'text', value: '1+' },
          {
            type: 'power',
            base: [{ type: 'text', value: 'x' }],
            exponent: [{ type: 'text', value: '2' }],
          },
        ],
      };
      expect(latexNodesToLatex([sqrtNode])).toBe('\\sqrt{1+{x}^{2}}');
      expect(isLatexValid(latexNodesToLatex([sqrtNode]))).toBeTrue();

      // 3. log_2(x + 1)
      const logNodes: LatexNode[] = [
        { type: 'text', value: '\\log_{2}(' },
        { type: 'text', value: 'x+1' },
        { type: 'text', value: ')' },
      ];
      expect(latexNodesToLatex(logNodes)).toBe('\\log_{2}(x+1)');
      expect(isLatexValid(latexNodesToLatex(logNodes))).toBeTrue();
    });
  });

  describe('Submit Validation Rules & Error Recovery', () => {
    it('should reject empty or whitespace-only latex expressions', () => {
      expect(isLatexValidWithoutPlaceholders([], '')).toBeFalse();
      expect(isLatexValidWithoutPlaceholders([], '   ')).toBeFalse();
    });

    it('should reject expressions containing unresolved placeholders', () => {
      const phNode: LatexNode = { type: 'placeholder', id: 'ph_1' };
      expect(
        isLatexValidWithoutPlaceholders([phNode], '\\htmlClass{placeholder}{?}')
      ).toBeFalse();
    });

    it('should reject syntactically invalid LaTeX', () => {
      expect(
        isLatexValidWithoutPlaceholders(
          [{ type: 'text', value: '\\frac{1}{' }],
          '\\frac{1}{'
        )
      ).toBeFalse();
    });

    it('should accept complete and syntactically valid equations', () => {
      const nodes: LatexNode[] = [{ type: 'text', value: '2x + 5 = 15' }];
      expect(
        isLatexValidWithoutPlaceholders(nodes, '2x + 5 = 15')
      ).toBeTrue();
    });

    it('should transition cleanly from incomplete limit state to valid state on placeholder edit', () => {
      const limBtn = FUNCTIONAL_BUTTONS.find((b) => b.label === 'lim')!;
      const template = limBtn.getTemplate!() as any;

      let tree: LatexNode[] = [template];

      // Incomplete: has placeholders -> cannot submit
      expect(hasPlaceholders(tree)).toBeTrue();
      expect(isLatexValidWithoutPlaceholders(tree, latexNodesToLatex(tree))).toBeFalse();

      // Fill variable
      tree = replacePlaceholder(tree, template.variable[0].id, [{ type: 'text', value: 'x' }]);
      expect(hasPlaceholders(tree)).toBeTrue();
      expect(isLatexValidWithoutPlaceholders(tree, latexNodesToLatex(tree))).toBeFalse();

      // Fill approach
      tree = replacePlaceholder(tree, template.approach[0].id, [{ type: 'text', value: '0' }]);
      expect(hasPlaceholders(tree)).toBeTrue();
      expect(isLatexValidWithoutPlaceholders(tree, latexNodesToLatex(tree))).toBeFalse();

      // Fill expr -> now fully valid and submittable!
      tree = replacePlaceholder(tree, template.expr[0].id, [{ type: 'text', value: 'x^2' }]);
      expect(hasPlaceholders(tree)).toBeFalse();
      const validLatex = latexNodesToLatex(tree);
      expect(validLatex).toBe('\\lim_{{x} \\to {0}} x^2');
      expect(isLatexValidWithoutPlaceholders(tree, validLatex)).toBeTrue();
    });
  });

  describe('Math Canvas Serialization & Task Export', () => {
    it('should serialize valid latex to { data: latex, language: locale } payload with default en', () => {
      canvasService.setLatex('2x + 5 = 15');
      const payload = canvasService.serializeTaskJson();
      expect(payload).toEqual({ data: '2x + 5 = 15', language: 'en' });
    });

    it('should include active application language in math serialization (e.g. Ukrainian ua, Russian ru)', () => {
      canvasService.setLatex('3x + 7 = 22');

      languageService.updateLanguageFromUser('ua');
      expect(canvasService.serializeTaskJson()).toEqual({ data: '3x + 7 = 22', language: 'ua' });

      languageService.updateLanguageFromUser('ru');
      expect(canvasService.serializeTaskJson()).toEqual({ data: '3x + 7 = 22', language: 'ru' });

      languageService.updateLanguageFromUser('de');
      expect(canvasService.serializeTaskJson()).toEqual({ data: '3x + 7 = 22', language: 'de' });
    });

    it('should return null when serializing invalid latex', () => {
      canvasService.setLatex('\\frac{1}{');
      const payload = canvasService.serializeTaskJson();
      expect(payload).toBeNull();
    });

    it('should send task to /api/v1/tasks/math and return task id with language', (done) => {
      languageService.updateLanguageFromUser('ua');
      canvasService.setLatex('x^2 - 4 = 0');
      canvasService.exportTaskJson().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data).toBe('task-12345');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/math`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ data: 'x^2 - 4 = 0', language: 'ua' });
      req.flush({ success: true, data: 'task-12345' });
    });
  });

  describe('Solution Step Parsing & Formatting', () => {
    it('should split multi-step calculation strings separated by \\implies or \\Rightarrow into discrete lines', () => {
      const input = '2x + 4 = 10 \\implies 2x = 6 \\implies x = 3';
      const steps = splitMathSolutionSteps(input);
      expect(steps.length).toBe(3);
      expect(steps[0]).toBe('2x + 4 = 10');
      expect(steps[1]).toBe('2x = 6');
      expect(steps[2]).toBe('x = 3');
    });

    it('should split multi-step calculation strings separated by \\\\ into discrete lines', () => {
      const input = '3x - 1 = 8 \\\\ 3x = 9 \\\\ x = 3';
      const steps = splitMathSolutionSteps(input);
      expect(steps.length).toBe(3);
      expect(steps[0]).toBe('3x - 1 = 8');
      expect(steps[1]).toBe('3x = 9');
      expect(steps[2]).toBe('x = 3');
    });

    it('should preserve single equations containing = or quadratic formulas intact without splitting', () => {
      const singleEq = 'f(x) = x^2 + 2x + 1';
      const steps1 = splitMathSolutionSteps(singleEq);
      expect(steps1.length).toBe(1);
      expect(steps1[0]).toBe('f(x) = x^2 + 2x + 1');

      const quadEq = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';
      const steps2 = splitMathSolutionSteps(quadEq);
      expect(steps2.length).toBe(1);
      expect(steps2[0]).toBe('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    });
  });
});
