import { inject, Injectable } from '@angular/core';
import { Coords2d } from '../drawing-tools/types/coords.type';
import { PointsSolutionService } from './points-solution.service';
import { StackSolutionService } from './stack-solution.service';
import { AnglesSolutionService } from './angles-solution.service';
import { FigureElementsSolutionService } from './figure-elements-solution.service';
import { LinesSolutionService } from './lines-solution.service';
import {
  BehaviorSubject,
  catchError,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from 'src/app/models/api-response.model';
import { LineLength } from '../drawing-tools/types/line-length.type';
import { CanvasService } from '../services/geometry-canvas/canvas.service';
import { Ellipse } from '../drawing-tools/ellipse.tool';
import { FiguresService } from '../services/geometry-canvas/figures.service';
import { CounterSolutionService } from './counter-solution.service';
import { CanvasServiceInterface } from '../interfaces/canvas-service.interface';
import { Polygon } from '../drawing-tools/polygon.tool';
import { Rectangle } from '../drawing-tools/rectangle.tool';
import { Parallelogram } from '../drawing-tools/parallelogram.tool';
import { Trapezoid } from '../drawing-tools/trapezoid.tool';
import { Triangle } from '../drawing-tools/triangle.tool';
import { Rhombus } from '../drawing-tools/rhombus.tool';
import { Line } from '../drawing-tools/line.tool';
import { environment } from 'src/environments/environment';
import { TokenService } from 'src/app/services/token.service';
import { GivenSolutionService } from './given-solution.service';
import { Pencil } from '../drawing-tools/pencil.tool';
import { ConditionsService } from '../services/geometry-canvas/conditions.service';
import * as AuthSelectors from '../../../store/auth/auth.selectors';

@Injectable({
  providedIn: 'root',
})
export class GeoCanvasSolutionService implements CanvasServiceInterface {
  private api = `${environment.apiUrl}`;
  private http = inject(HttpClient);

  taskId$ = this.canvasService.taskId$;

  constructor(
    private canvasService: CanvasService,
    private tokenService: TokenService,
    private pointsService: PointsSolutionService,
    private stackService: StackSolutionService,
    private anglesService: AnglesSolutionService,
    private figureElementsService: FigureElementsSolutionService,
    private figuresService: FiguresService,
    private linesService: LinesSolutionService,
    private counterService: CounterSolutionService,
    private givenService: GivenSolutionService,
    private conditionsService: ConditionsService
  ) {}

  public getTaskFromApi(id: string): Observable<boolean> {
    return this.http.get<ApiResponse<any>>(`${this.api}/tasks/geo/${id}`).pipe(
      tap((res) => {
        if (res.success) {
          this.deserializeTaskJson(res.data.task);
          this.givenService.setGiven(res.data.given);
        } else {
          console.warn('Server rejected request:', res.message);
        }
      }),
      map((res) => res.success),
      catchError((err) => {
        console.error('HTTP error while sending task:', err);
        return of(false);
      })
    );
  }

  deserializeTaskJson(data: any) {
    if (!data) return;
    this.pointsService.resetPoints();
    this.stackService.clear();
    this.linesService.clearAllLines();
    this.anglesService.clearAllAngles();
    this.figureElementsService.clearAllFigureElements();
    this.conditionsService.resetAll();

    for (const [figureName, figureData] of Object.entries<any>(data)) {
      if (figureName === 'additionalConditions' || figureName === 'conditions') {
        if (Array.isArray(figureData)) {
          this.conditionsService.setConditions(figureData);
        }
        continue;
      }

      if (figureName === 'target' || figureName === 'find') {
        if (typeof figureData === 'string') {
          this.conditionsService.setTarget(figureData);
        }
        continue;
      }

      if (figureName === 'language' || figureName === 'lang' || figureName === 'locale') {
        continue;
      }

      const tool = this.getToolByFigureName(figureName, figureData);
      if (!tool) {
        continue;
      }

      this.stackService.pushStack(
        {
          figureName: figureName,
          path: figureData.path,
          tool: tool,
        },
        'paths'
      );

      const restoredPoints = (figureData.points || []).map((p: any) => ({
        ...p,
        attachedToFigure: figureName,
      }));
      this.pointsService.addPoints(restoredPoints);

      if (figureData.lines) {
        for (const [key, value] of Object.entries(figureData.lines)) {
          this.linesService.setLine(key, value as LineLength);
        }
      }

      if (figureData.angles) {
        for (const [key, value] of Object.entries(figureData.angles)) {
          this.anglesService.setAngleValue(key, value as LineLength);
        }
      }

      if (figureData.elements && Array.isArray(figureData.elements)) {
        const elementsSet = new Set<{ type: string; label?: string }>(
          figureData.elements
        );
        this.figureElementsService.setElements(figureName, elementsSet);

        for (const el of figureData.elements) {
          if (el.label && el.length !== undefined) {
            const point1 = el.label.charAt(0);
            const point2 = el.label.charAt(1);
            const currentLength = this.linesService.getLineLength(
              point1,
              point2
            );
            if (currentLength === undefined) {
              this.linesService.setLine(el.label, el.length);
            }
          }
        }
      }
    }
  }

  rateSolution(isCorrect: boolean): Observable<any> {
    return this.tokenService.getToken$().pipe(
      take(1),
      switchMap((token) => {
        if (!token) {
          return throwError(() => new Error('USER_NOT_AUTHORIZED_CLIENT'));
        }
        return from(firstValueFrom(this.taskId$)).pipe(
          switchMap((taskId) => {
            if (!taskId) {
              return throwError(() => new Error('taskId is empty'));
            }
            const url = `${this.api}/tasks/geo/${taskId}/rating`;
            const body = { isCorrect };
            const headers = this.tokenService.createAuthHeaders(token);
            return this.http.post(url, body, { headers });
          })
        );
      })
    );
  }

  getToolByFigureName(figureName: string, figureData: any): any {
    const toolName = figureName.split('_')[0].toLowerCase();

    switch (toolName) {
      case 'pencil': {
        return new Pencil(this.counterService);
      }
      case 'polygon': {
        const sides = figureData.path?.length ?? 3;
        return new Polygon(
          sides,
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.stackService,
          this.figuresService,
          this.counterService
        );
      }

      case 'ellipse':
        return new Ellipse(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.stackService,
          this.figuresService,
          this.counterService
        );

      case 'rectangle':
        return new Rectangle(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.stackService,
          this.figuresService,
          this.counterService
        );

      case 'parallelogram':
        return new Parallelogram(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.stackService,
          this.figuresService,
          this.counterService
        );

      case 'trapezoid':
        return new Trapezoid(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.figuresService,
          this.counterService
        );

      case 'triangle':
        return new Triangle(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.figuresService,
          this.counterService
        );

      case 'rhombus':
        return new Rhombus(
          this,
          this.pointsService,
          this.linesService,
          this.anglesService,
          this.figureElementsService,
          this.stackService,
          this.figuresService,
          this.counterService
        );

      case 'line':
        return new Line(
          this,
          this.pointsService,
          this.linesService,
          this.counterService
        );

      default:
        console.warn(`Unknown tool type: ${toolName}`);
        return null;
    }
  }
}
