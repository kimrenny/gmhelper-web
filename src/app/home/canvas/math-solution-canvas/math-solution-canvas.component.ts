import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription, take } from 'rxjs';
import { TokenService } from 'src/app/services/token.service';
import {
  MathCanvasSolutionService,
  MathSolutionStep,
  MathSolutionData,
} from '../math-solution-services/canvas-solution.service';
import { CanvasService } from '../services/math-canvas/canvas.service';
import { LatexRendererService } from '../services/math-canvas/latex-renderer.service';
import { Store } from '@ngrx/store';
import * as AuthState from '../../../store/auth/auth.state';
import * as AuthSelectors from '../../../store/auth/auth.selectors';

export function splitMathSolutionSteps(latex: string): string[] {
  if (!latex || !latex.trim()) return [];
  const trimmed = latex.trim();
  if (/(?:\\implies|\\Rightarrow|\\\\|\\newline)/.test(trimmed)) {
    return trimmed
      .split(/(?:\\implies|\\Rightarrow|\\\\|\\newline)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [trimmed];
}

@Component({
  selector: 'app-math-solution-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './math-solution-canvas.component.html',
  styleUrls: ['./math-solution-canvas.component.scss'],
})
export class MathSolutionCanvasComponent implements OnInit, OnDestroy {
  taskSub!: Subscription;
  taskProcessing: boolean = true;
  isAuthorized = false;
  private sub?: Subscription;

  isRated = false;
  rated: boolean | null = null;

  displaySteps: MathSolutionStep[] = [];
  fallbackLines: string[] = [];
  problemLatex: string = '';
  problemText: string = '';
  finalAnswerLatex: string = '';
  finalAnswerText: string = '';

  @ViewChild('mathSolutionDiv', { static: true })
  mathDivRef!: ElementRef<HTMLDivElement>;

  constructor(
    private canvasService: CanvasService,
    private tokenService: TokenService,
    private mathCanvasSolutionService: MathCanvasSolutionService,
    private latexRenderer: LatexRendererService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private store: Store<AuthState.AuthState>
  ) {}

  ngOnInit(): void {
    this.taskSub = this.mathCanvasSolutionService.taskId$.subscribe(
      (taskId) => {
        if (taskId) {
          this.taskProcessing = true;
          this.mathCanvasSolutionService
            .getTaskFromApi(taskId)
            .subscribe((success) => {
              if (success) {
                this.taskProcessing = false;
                const solutionData = this.mathCanvasSolutionService.getSolutionData();
                const latex = this.mathCanvasSolutionService.getLatexSolution();

                this.displaySteps = [];
                this.fallbackLines = [];
                this.problemLatex = solutionData?.latexProblem || '';
                this.problemText = solutionData?.problem || '';
                this.finalAnswerLatex = solutionData?.latexAnswer || '';
                this.finalAnswerText = solutionData?.finalAnswer || '';

                if (solutionData?.steps && solutionData.steps.length > 0) {
                  this.displaySteps = solutionData.steps;
                } else if (latex) {
                  this.fallbackLines = splitMathSolutionSteps(latex);
                }

                setTimeout(() => {
                  this.renderAllKaTeX();
                }, 0);
              }
            });
        }
      }
    );

    this.sub = this.store
      .select(AuthSelectors.selectUserRole)
      .pipe(take(1))
      .subscribe((role: string | null) => {
        this.isAuthorized = role === 'Admin' || role === 'Owner';
      });
  }

  renderAllKaTeX(): void {
    if (!this.mathDivRef || !this.mathDivRef.nativeElement) return;
    const root = this.mathDivRef.nativeElement;

    if (this.problemLatex) {
      const problemEl = root.querySelector('.problem-katex') as HTMLElement;
      if (problemEl) {
        this.latexRenderer.renderLatex(problemEl, this.problemLatex, {
          trust: false,
          throwError: false,
        });
      }
    }

    const stepElements = root.querySelectorAll('.step-formula-katex');
    stepElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const formula = el.getAttribute('data-latex') || '';
        if (formula) {
          this.latexRenderer.renderLatex(el, formula, {
            trust: false,
            throwError: false,
          });
        }
      }
    });

    if (this.finalAnswerLatex) {
      const finalAnswerEl = root.querySelector('.final-answer-katex') as HTMLElement;
      if (finalAnswerEl) {
        this.latexRenderer.renderLatex(finalAnswerEl, this.finalAnswerLatex, {
          trust: false,
          throwError: false,
        });
      }
    }
  }

  onRateSolution(isCorrect: boolean): void {
    if (this.isRated) {
      this.toastr.warning(
        this.translate.instant('CANVAS.ERRORS.WARNING.RATED'),
        this.translate.instant('CANVAS.ERRORS.WARNING.TITLE')
      );
      return;
    }
    this.mathCanvasSolutionService.rateSolution(isCorrect).subscribe({
      next: () => {
        this.isRated = true;
        this.rated = isCorrect;
      },
      error: (error) => {
        if (error.message === 'USER_NOT_AUTHORIZED_CLIENT') {
          this.toastr.error(
            this.translate.instant('CANVAS.ERRORS.ERROR.NOT_AUTHORIZED'),
            this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
          );
          return;
        }

        if (error.status === 401) {
          const message = error?.error?.message || '';

          if (message === 'Only the task creator can rate this task.') {
            this.toastr.error(
              this.translate.instant('CANVAS.ERRORS.ERROR.NOT_TASK_CREATOR'),
              this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
            );
            return;
          }

          this.toastr.error(
            this.translate.instant('CANVAS.ERRORS.ERROR.UNAUTHORIZED'),
            this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
          );
          return;
        }

        this.toastr.error(
          this.translate.instant('CANVAS.ERRORS.ERROR.UNKNOWN'),
          this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
        );
        console.error('Error during proccessing the request:', error);
      },
    });
  }

  onClose(): void {
    this.canvasService.updateTaskId(null);
    this.clearCanvas();
    this.isRated = false;
  }

  private clearCanvas() {
    this.mathCanvasSolutionService.clear();
  }

  ngOnDestroy(): void {
    this.taskSub?.unsubscribe();
  }
}
