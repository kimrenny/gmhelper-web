import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SubjectService } from '../services/subject.service';
import { Subscription } from 'rxjs';
import {
  FUNCTIONAL_BUTTONS,
  MathButton,
  SPECIAL_BUTTONS,
} from '../tools/math-buttons';
import { LatexNode } from '../tools/math-expression.model';
import {
  isLatexValid,
  isLatexValidWithoutPlaceholders,
  unwrapAligned,
  wrapAligned,
} from '../utils/latex-validation.utils';
import { replacePlaceholder } from '../utils/latex-tree.utils';
import { hasPlaceholders } from '../utils/latex-placeholders.utils';
import { ToastrService } from 'ngx-toastr';
import {
  parseLatexToNodes,
} from '../utils/latex-parser.utils';
import { PlaceholderIdService } from '../services/math-canvas/placeholderId.service';
import { LatexRendererService } from '../services/math-canvas/latex-renderer.service';
import { CanvasService } from '../services/math-canvas/canvas.service';
import { HeaderService } from 'src/app/services/header.service';

@Component({
  selector: 'app-math-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './math-canvas.component.html',
  styleUrls: ['./math-canvas.component.scss'],
})
export class MathCanvasComponent implements OnInit, OnDestroy, AfterViewInit {
  selectedSubject: boolean = false;
  private subjectSub!: Subscription;

  latexTree: LatexNode[] = [];
  selectedPlaceholderId: string | null = null;
  latexInput: string = '';

  isSpecialWindowVisible = false;
  isFunctionalWindowVisible = false;
  isInputWindowVisible = false;

  specialWindowButtons: MathButton[] = [];
  functionalWindowButtons: MathButton[] = [];

  specialWindowRows: MathButton[][] = [];
  functionalWindowRows: MathButton[][] = [];

  private lastValidLatexInput: string = '';

  private invalidLatexTimeout: any = null;
  private lastInvalidInput = '';

  activePlaceholderEditMode: boolean = false;

  hasPlaceholders = hasPlaceholders;

  @ViewChild('mathDiv', { static: true })
  mathDivRef!: ElementRef<HTMLDivElement>;

  constructor(
    public subjectService: SubjectService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private latexRenderer: LatexRendererService,
    private canvasService: CanvasService,
    private headerService: HeaderService
  ) {}

  ngOnInit(): void {
    this.subjectSub = this.subjectService.getSubject().subscribe((subject) => {
      this.selectedSubject = subject == 'Math';

      if (this.selectedSubject) {
        this.specialWindowButtons = SPECIAL_BUTTONS;
        this.functionalWindowButtons = FUNCTIONAL_BUTTONS;
        this.specialWindowRows = this.getButtonRows(SPECIAL_BUTTONS);
        this.functionalWindowRows = this.getButtonRows(FUNCTIONAL_BUTTONS);
      }
    });
  }

  ngAfterViewInit() {
    this.mathDivRef.nativeElement.addEventListener(
      'click',
      this.onMathClick.bind(this)
    );

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (
        (e.key === 'Enter' || e.key === 'Escape') &&
        this.activePlaceholderEditMode
      ) {
        this.exitPlaceholderEditMode();
        return;
      }

      this.handleKeyboardInput(e);
    });
  }

  private handleKeyboardInput(event: KeyboardEvent) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('latex-textarea')) {
      return;
    }

    if (this.isInputWindowVisible && hasPlaceholders(this.latexTree)) {
      return;
    }

    const key = event.key;

    if (key.length !== 1) return;

    event.preventDefault();

    const newNode: LatexNode = { type: 'text', value: key };

    if (this.selectedPlaceholderId && this.activePlaceholderEditMode) {
      this.appendOrReplaceInPlaceholder(newNode);
    } else {
      this.latexTree.push(newNode);
    }

    this.renderLatexOnCanvas();
  }

  latexValidation(): boolean {
    return isLatexValidWithoutPlaceholders(this.latexTree, this.latexInput);
  }

  onMathClick(event: MouseEvent) {
    let target = event.target as HTMLElement | null;
    let clickedPlaceholder = false;

    while (target && target !== this.mathDivRef.nativeElement) {
      if (target.dataset && target.dataset['placeholderId']) {
        this.selectedPlaceholderId = target.dataset['placeholderId'];
        this.activePlaceholderEditMode = true;
        clickedPlaceholder = true;
        this.renderLatexOnCanvas();

        break;
      }
      target = target.parentElement;
    }

    if (!clickedPlaceholder) {
      this.exitPlaceholderEditMode();
    }
  }

  private appendOrReplaceInPlaceholder(newNode: LatexNode) {
    const tryAppend = (nodes: LatexNode[]): boolean => {
      for (const node of nodes) {
        if (
          node.type === 'placeholder' &&
          node.id === this.selectedPlaceholderId
        ) {
          if (newNode.type === 'text') {
            this.latexTree = replacePlaceholder(
              this.latexTree,
              this.selectedPlaceholderId,
              [newNode]
            );

            this.exitPlaceholderEditMode();
          } else {
            this.latexTree = replacePlaceholder(
              this.latexTree,
              this.selectedPlaceholderId,
              [newNode]
            );
          }
          return true;
        }

        if (node.type === 'fraction') {
          if (node.numerator && tryAppend(node.numerator)) return true;
          if (node.denominator && tryAppend(node.denominator)) return true;
        } else if (node.type === 'power') {
          if (node.base && tryAppend(node.base)) return true;
          if (node.exponent && tryAppend(node.exponent)) return true;
        } else if (node.type === 'sqrt') {
          if (node.radicand && tryAppend(node.radicand)) return true;
        } else if (node.type === 'nthRoot') {
          if (node.degree && tryAppend(node.degree)) return true;
          if (node.radicand && tryAppend(node.radicand)) return true;
        } else if (node.type === 'integral') {
          if (node.integrand && tryAppend(node.integrand)) return true;
        } else if (node.type === 'lim') {
          if (node.variable && tryAppend(node.variable)) return true;
          if (node.approach && tryAppend(node.approach)) return true;
          if (node.expr && tryAppend(node.expr)) return true;
        } else if (node.type === 'matrix' || node.type === 'system') {
          for (const row of node.rows) {
            if (tryAppend(row)) return true;
          }
        }
        // else if (node.type === 'text') {
        //   if (
        //     this.selectedPlaceholderId &&
        //     this.activePlaceholderEditMode &&
        //     newNode.type === 'text'
        //   ) {
        //     node.value += newNode.value;
        //     return true;
        //   }
        // }
      }
      return false;
    };

    tryAppend(this.latexTree);
  }

  renderLatexOnCanvas(
    trustMode: boolean = true,
    throwError: boolean = false,
    skipLatexInputUpdate: boolean = false
  ): void {
    const div = this.mathDivRef.nativeElement.querySelector('.katex-wrapper');
    if (!div || !(div instanceof HTMLElement)) return;

    div.innerHTML = '';

    const { latex, success } = this.latexRenderer.render(
      div,
      this.latexTree,
      this.selectedPlaceholderId,
      { trust: trustMode, throwError }
    );

    this.canvasService.setLatex(latex);

    if (!skipLatexInputUpdate) {
      this.latexInput = latex;
    }

    if (success) {
      this.lastValidLatexInput = latex;
    } else if (this.lastValidLatexInput) {
      try {
        const success = this.latexRenderer.renderLatex(
          div,
          this.lastValidLatexInput,
          {
            trust: trustMode,
            throwError: throwError,
          }
        );
      } catch {}
    }
  }

  onPlaceholderClick(placeholderId: string) {
    this.selectedPlaceholderId = placeholderId;
    this.renderLatexOnCanvas();
  }

  onWindowButtonClick(button: MathButton) {
    const template = button.getTemplate?.();

    if (this.selectedPlaceholderId) {
      if (template) {
        this.appendOrReplaceInPlaceholder(template);
      } else {
        const newNode: LatexNode = { type: 'text', value: button.latex };

        this.appendOrReplaceInPlaceholder(newNode);
      }

      if (!this.activePlaceholderEditMode) {
        this.selectedPlaceholderId = null;
      }
    } else {
      if (template) {
        this.latexTree.push(template);
      } else {
        const newNode: LatexNode = { type: 'text', value: button.latex };

        this.latexTree.push(newNode);
      }
    }

    this.renderLatexOnCanvas();
  }

  onLatexInputChange() {
    const input = this.latexInput.trim();

    if (hasPlaceholders(this.latexTree)) {
      this.latexInput = this.lastValidLatexInput;
      return;
    }

    const wrapped = wrapAligned(input);

    try {
      if (!isLatexValid(wrapped)) {
        if (input.length > 0) return;
      }

      this.latexTree = parseLatexToNodes(unwrapAligned(wrapped));

      this.renderLatexOnCanvas(true, false, true);

      if (this.invalidLatexTimeout) {
        clearTimeout(this.invalidLatexTimeout);
        this.invalidLatexTimeout = null;
      }
    } catch (e) {
      console.warn('Invalid LaTeX input:', e);

      this.lastInvalidInput = input;

      if (this.invalidLatexTimeout) {
        clearTimeout(this.invalidLatexTimeout);
      }

      this.invalidLatexTimeout = setTimeout(() => {
        if (this.lastInvalidInput !== this.latexInput.trim()) return;

        try {
          this.latexTree = parseLatexToNodes(unwrapAligned(wrapped));

          this.renderLatexOnCanvas();
        } catch (e2) {
          console.warn('Invalid after timeout.', e2);
        }
      }, 3000);
    }
  }

  exitPlaceholderEditMode() {
    this.selectedPlaceholderId = null;
    this.activePlaceholderEditMode = false;
    this.renderLatexOnCanvas();
  }

  toggleWindow(window: 'special' | 'functional' | 'input') {
    this.isSpecialWindowVisible =
      window === 'special' ? !this.isSpecialWindowVisible : false;
    this.isFunctionalWindowVisible =
      window === 'functional' ? !this.isFunctionalWindowVisible : false;
    this.isInputWindowVisible =
      window === 'input' ? !this.isInputWindowVisible : false;

    if (this.isInputWindowVisible && hasPlaceholders(this.latexTree)) {
      const message = this.translate.instant(
        'CANVAS.ERRORS.WARNING.PLACEHOLDER.EDIT_DISABLED'
      );
      const title = this.translate.instant('CANVAS.ERRORS.WARNING.TITLE');
      this.toastr.warning(message, title);
    }
  }

  getButtonRows(buttons: MathButton[]): MathButton[][] {
    const rows: MathButton[][] = [];
    for (let i = 0; i < buttons.length; i += 14) {
      rows.push(buttons.slice(i, i + 14));
    }
    return rows;
  }

  onSubmitTask() {
    this.canvasService.exportTaskJson().subscribe({
      next: (res) => {
        this.canvasService.updateTaskId(res.data);
      },
      error: (err) => {
        this.canvasService.updateTaskId(null);

        const message = err?.error?.message || '';

        const tryAgainMatch = message.match(/Try again after (\d+) minutes/);

        if (tryAgainMatch) {
          const minutes = parseInt(tryAgainMatch[1], 10);
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;

          let formattedTime = '';
          if (hours > 0) {
            formattedTime += `${hours}h`;
          }
          formattedTime += `${mins}m`;

          this.toastr.error(
            this.translate.instant('CANVAS.TASK.ERRORS.TRY_AGAIN', {
              time: formattedTime.trim(),
            }),
            this.translate.instant('CANVAS.ERRORS.ERROR.TITLE'),
            { enableHtml: true }
          );

          this.headerService.triggerHighlight(5000);
        } else {
          this.toastr.error(
            this.translate.instant('CANVAS.TASK.ERRORS.UNEXPECTED_ERROR'),
            this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
          );
        }
      },
    });
  }

  onClearCanvas(): void {
    this.latexTree = [];
    this.exitPlaceholderEditMode();
  }

  ngOnDestroy(): void {
    this.subjectSub.unsubscribe();
  }
}
