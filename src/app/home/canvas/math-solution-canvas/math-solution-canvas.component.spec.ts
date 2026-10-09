import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MathSolutionCanvasComponent, splitMathSolutionSteps } from './math-solution-canvas.component';
import { MathCanvasSolutionService } from '../math-solution-services/canvas-solution.service';
import { CanvasService } from '../services/math-canvas/canvas.service';
import { LatexRendererService } from '../services/math-canvas/latex-renderer.service';
import { TokenService } from 'src/app/services/token.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('MathSolutionCanvasComponent', () => {
  let component: MathSolutionCanvasComponent;
  let fixture: ComponentFixture<MathSolutionCanvasComponent>;
  let mathCanvasSolutionServiceSpy: jasmine.SpyObj<MathCanvasSolutionService>;
  let canvasServiceSpy: jasmine.SpyObj<CanvasService>;
  let latexRendererSpy: jasmine.SpyObj<LatexRendererService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let taskIdSubject: BehaviorSubject<string | null>;

  beforeEach(async () => {
    taskIdSubject = new BehaviorSubject<string | null>(null);

    mathCanvasSolutionServiceSpy = jasmine.createSpyObj('MathCanvasSolutionService', [
      'getTaskFromApi',
      'getLatexSolution',
      'getSolutionData',
      'rateSolution',
      'clear',
    ]);
    mathCanvasSolutionServiceSpy.taskId$ = taskIdSubject.asObservable();

    canvasServiceSpy = jasmine.createSpyObj('CanvasService', ['updateTaskId']);
    latexRendererSpy = jasmine.createSpyObj('LatexRendererService', ['renderLatex']);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']);

    const tokenServiceStub = {
      getToken$: () => of('valid-token'),
      createAuthHeaders: () => ({ Authorization: 'Bearer valid-token' }),
    };

    await TestBed.configureTestingModule({
      imports: [MathSolutionCanvasComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MathCanvasSolutionService, useValue: mathCanvasSolutionServiceSpy },
        { provide: CanvasService, useValue: canvasServiceSpy },
        { provide: LatexRendererService, useValue: latexRendererSpy },
        { provide: TokenService, useValue: tokenServiceStub },
        { provide: ToastrService, useValue: toastrSpy },
        provideMockStore({
          initialState: { auth: { user: { role: 'Admin' } } },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MathSolutionCanvasComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Structured Steps Rendering', () => {
    it('should render structured steps when provided in solution response', fakeAsync(() => {
      const mockSolution = {
        problemType: 'math',
        status: 'SUCCESS',
        problem: 'Solve 2x + 4 = 10',
        latexProblem: '2x + 4 = 10',
        steps: [
          {
            stepNumber: 1,
            title: 'Subtract 4 from both sides',
            explanation: 'Isolate terms with x',
            latexFormula: '2x = 6',
          },
          {
            stepNumber: 2,
            title: 'Divide by 2',
            explanation: 'Find value of x',
            latexFormula: 'x = 3',
          },
        ],
        finalAnswer: 'x = 3',
        latexAnswer: 'x = 3',
        compositeLatex: '2x + 4 = 10 \\implies 2x = 6 \\implies x = 3',
      };

      mathCanvasSolutionServiceSpy.getTaskFromApi.and.returnValue(of(true));
      mathCanvasSolutionServiceSpy.getSolutionData.and.returnValue(mockSolution);
      mathCanvasSolutionServiceSpy.getLatexSolution.and.returnValue(mockSolution.compositeLatex);

      fixture.detectChanges();
      taskIdSubject.next('task-step-test');
      tick();
      fixture.detectChanges();

      expect(component.taskProcessing).toBeFalse();
      expect(component.displaySteps.length).toBe(2);
      expect(component.displaySteps[0].title).toBe('Subtract 4 from both sides');
      expect(component.displaySteps[1].title).toBe('Divide by 2');
      expect(component.problemLatex).toBe('2x + 4 = 10');
      expect(component.finalAnswerLatex).toBe('x = 3');

      const compiled = fixture.nativeElement as HTMLElement;
      const stepCards = compiled.querySelectorAll('.solution-step-card');
      expect(stepCards.length).toBe(2);
    }));
  });

  describe('Fallback String Splitting', () => {
    it('should split raw compositeLatex on \\implies into discrete step cards when no structured steps are present', fakeAsync(() => {
      mathCanvasSolutionServiceSpy.getTaskFromApi.and.returnValue(of(true));
      mathCanvasSolutionServiceSpy.getSolutionData.and.returnValue(null);
      mathCanvasSolutionServiceSpy.getLatexSolution.and.returnValue(
        '2x + 4 = 10 \\implies 2x = 6 \\implies x = 3'
      );

      fixture.detectChanges();
      taskIdSubject.next('task-fallback-test');
      tick();
      fixture.detectChanges();

      expect(component.taskProcessing).toBeFalse();
      expect(component.displaySteps.length).toBe(0);
      expect(component.fallbackLines.length).toBe(3);
      expect(component.fallbackLines[0]).toBe('2x + 4 = 10');
      expect(component.fallbackLines[1]).toBe('2x = 6');
      expect(component.fallbackLines[2]).toBe('x = 3');

      const compiled = fixture.nativeElement as HTMLElement;
      const stepCards = compiled.querySelectorAll('.solution-step-card');
      expect(stepCards.length).toBe(3);
    }));

    it('should keep quadratic equation as a single step block', fakeAsync(() => {
      const quadFormula = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';
      mathCanvasSolutionServiceSpy.getTaskFromApi.and.returnValue(of(true));
      mathCanvasSolutionServiceSpy.getSolutionData.and.returnValue(null);
      mathCanvasSolutionServiceSpy.getLatexSolution.and.returnValue(quadFormula);

      fixture.detectChanges();
      taskIdSubject.next('task-quad-test');
      tick();
      fixture.detectChanges();

      expect(component.fallbackLines.length).toBe(1);
      expect(component.fallbackLines[0]).toBe(quadFormula);
    }));
  });

  describe('splitMathSolutionSteps Helper Function', () => {
    it('should handle empty or whitespace string safely', () => {
      expect(splitMathSolutionSteps('')).toEqual([]);
      expect(splitMathSolutionSteps('   ')).toEqual([]);
    });

    it('should split on \\Rightarrow', () => {
      const res = splitMathSolutionSteps('a = b \\Rightarrow b = c');
      expect(res).toEqual(['a = b', 'b = c']);
    });

    it('should split on \\\\', () => {
      const res = splitMathSolutionSteps('step 1 \\\\ step 2 \\\\ step 3');
      expect(res).toEqual(['step 1', 'step 2', 'step 3']);
    });
  });

  describe('Rating functionality', () => {
    it('should submit rating and update isRated state', () => {
      mathCanvasSolutionServiceSpy.rateSolution.and.returnValue(of({ success: true }));

      component.onRateSolution(true);

      expect(mathCanvasSolutionServiceSpy.rateSolution).toHaveBeenCalledWith(true);
      expect(component.isRated).toBeTrue();
      expect(component.rated).toBeTrue();
    });

    it('should warn when already rated', () => {
      component.isRated = true;
      component.onRateSolution(false);

      expect(toastrSpy.warning).toHaveBeenCalled();
    });
  });

  describe('Closing canvas', () => {
    it('should reset state on close', () => {
      component.isRated = true;
      component.onClose();

      expect(canvasServiceSpy.updateTaskId).toHaveBeenCalledWith(null);
      expect(mathCanvasSolutionServiceSpy.clear).toHaveBeenCalled();
      expect(component.isRated).toBeFalse();
    });
  });
});
