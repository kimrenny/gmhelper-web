import { TestBed } from '@angular/core/testing';
import { CanvasService } from './canvas.service';
import { ConditionsService } from './conditions.service';
import { LinesService } from './lines.service';
import { AnglesService } from './angles.service';
import { PointsService } from './points.service';
import { FiguresService } from './figures.service';
import { StackService } from './stack.service';
import { CounterService } from './counter.service';
import { FigureElementsService } from './figure-elements.service';
import { SelectionService } from './selection.service';
import { GeoCanvasSolutionService } from '../../geometry-solution-services/canvas-solution.service';
import { PointsSolutionService } from '../../geometry-solution-services/points-solution.service';
import { LinesSolutionService } from '../../geometry-solution-services/lines-solution.service';
import { AnglesSolutionService } from '../../geometry-solution-services/angles-solution.service';
import { FiguresSolutionService } from '../../geometry-solution-services/figures-solution.service';
import { StackSolutionService } from '../../geometry-solution-services/stack-solution.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { LanguageService } from 'src/app/services/language.service';
import { TranslateModule } from '@ngx-translate/core';

describe('Geometry Conditions & Persistence Integration', () => {
  let canvasService: CanvasService;
  let languageService: LanguageService;
  let conditionsService: ConditionsService;
  let linesService: LinesService;
  let anglesService: AnglesService;
  let pointsService: PointsService;
  let figuresService: FiguresService;
  let figureElementsService: FigureElementsService;
  let stackService: StackService;
  let counterService: CounterService;
  let solutionService: GeoCanvasSolutionService;
  let pointsSolutionService: PointsSolutionService;
  let linesSolutionService: LinesSolutionService;
  let anglesSolutionService: AnglesSolutionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        provideMockStore({}),
        LanguageService,
        CanvasService,
        ConditionsService,
        LinesService,
        AnglesService,
        PointsService,
        FiguresService,
        FigureElementsService,
        StackService,
        CounterService,
        SelectionService,
        GeoCanvasSolutionService,
        PointsSolutionService,
        LinesSolutionService,
        AnglesSolutionService,
        FiguresSolutionService,
        StackSolutionService,
      ],
    });

    canvasService = TestBed.inject(CanvasService);
    languageService = TestBed.inject(LanguageService);
    conditionsService = TestBed.inject(ConditionsService);
    linesService = TestBed.inject(LinesService);
    anglesService = TestBed.inject(AnglesService);
    pointsService = TestBed.inject(PointsService);
    figuresService = TestBed.inject(FiguresService);
    figureElementsService = TestBed.inject(FigureElementsService);
    stackService = TestBed.inject(StackService);
    counterService = TestBed.inject(CounterService);
    solutionService = TestBed.inject(GeoCanvasSolutionService);
    pointsSolutionService = TestBed.inject(PointsSolutionService);
    linesSolutionService = TestBed.inject(LinesSolutionService);
    anglesSolutionService = TestBed.inject(AnglesSolutionService);
  });

  describe('Line Length Conditions', () => {
    beforeEach(() => {
      // Setup a triangle figure: ABC
      pointsService.addPoint(100, 100, 'triangle_1', 0);
      pointsService.addPoint(200, 100, 'triangle_1', 1);
      pointsService.addPoint(150, 200, 'triangle_1', 2);
    });

    it('should add independent length conditions to different segments', () => {
      linesService.setLineLength('A', 'B', 5);
      linesService.setLineLength('B', 'C', 7);
      linesService.setLineLength('A', 'C', 10);

      expect(linesService.getLineLength('A', 'B')).toBe(5);
      expect(linesService.getLineLength('B', 'C')).toBe(7);
      expect(linesService.getLineLength('A', 'C')).toBe(10);
    });

    it('should update an existing length condition without affecting other segments', () => {
      linesService.setLineLength('A', 'B', 5);
      linesService.setLineLength('B', 'C', 7);

      linesService.setLineLength('A', 'B', 12.5);

      expect(linesService.getLineLength('A', 'B')).toBe(12.5);
      expect(linesService.getLineLength('B', 'C')).toBe(7);
    });

    it('should delete a specific line length condition', () => {
      linesService.setLineLength('A', 'B', 5);
      linesService.setLineLength('B', 'C', 7);

      linesService.deleteLineLength('A', 'B');

      expect(linesService.getLineLength('A', 'B')).toBeNull();
      expect(linesService.getLineLength('B', 'C')).toBe(7);
    });

    it('should support symmetric lookup of segment names (AB vs BA)', () => {
      linesService.setLineLength('A', 'B', 8);
      expect(linesService.getLineLength('B', 'A')).toBe(8);

      linesService.deleteLineLength('B', 'A');
      expect(linesService.getLineLength('A', 'B')).toBeNull();
    });
  });

  describe('Angle Measure Conditions', () => {
    beforeEach(() => {
      pointsService.addPoint(100, 100, 'triangle_1', 0);
      pointsService.addPoint(200, 100, 'triangle_1', 1);
      pointsService.addPoint(150, 200, 'triangle_1', 2);
    });

    it('should add independent angle measures to different angles', () => {
      anglesService.setAngleValue('A', 45);
      anglesService.setAngleValue('B', 60);
      anglesService.setAngleValue('C', 75);

      expect(anglesService.getAngleValue('A')).toBe(45);
      expect(anglesService.getAngleValue('B')).toBe(60);
      expect(anglesService.getAngleValue('C')).toBe(75);
    });

    it('should update an existing angle measure', () => {
      anglesService.setAngleValue('A', 45);
      anglesService.setAngleValue('A', 90);

      expect(anglesService.getAngleValue('A')).toBe(90);
    });

    it('should delete an angle measure', () => {
      anglesService.setAngleValue('A', 45);
      anglesService.setAngleValue('B', 60);

      anglesService.deleteAngle('A');

      expect(anglesService.getAngleValue('A')).toBeNull();
      expect(anglesService.getAngleValue('B')).toBe(60);
    });
  });

  describe('Full Geometry Serialization and Deserialization Roundtrip', () => {
    it('should serialize and deserialize a complete geometry task preserving all drawing and conditions data', () => {
      // 1. Create points
      pointsService.addPoint(50, 50, 'triangle_1', 0);
      pointsService.addPoint(150, 50, 'triangle_1', 1);
      pointsService.addPoint(100, 120, 'triangle_1', 2);

      // Add path to stack
      stackService.pushStack(
        {
          figureName: 'triangle_1',
          path: [
            { x: 50, y: 50, color: '#000000' },
            { x: 150, y: 50, color: '#000000' },
            { x: 100, y: 120, color: '#000000' },
          ],
          tool: { draw: () => {} },
        },
        'paths'
      );

      // 2. Set line lengths
      linesService.setLineLength('A', 'B', 8);
      linesService.setLineLength('B', 'C', 10.5);

      // 3. Set angle measure
      anglesService.setAngleValue('A', 60);

      // 4. Set additional conditions
      conditionsService.addCondition('AB is parallel to CD');
      conditionsService.addCondition('The triangle is acute');

      // 5. Set target
      conditionsService.setTarget('Find the area of triangle ABC');

      // 6. Serialize via canvasService
      const serialized = canvasService.serializeTaskJson();

      expect(serialized).toBeDefined();
      expect(serialized.additionalConditions).toEqual([
        'AB is parallel to CD',
        'The triangle is acute',
      ]);
      expect(serialized.target).toBe('Find the area of triangle ABC');
      expect(serialized.language).toBe('en');
      expect(serialized['triangle_1']).toBeDefined();
      expect(serialized['triangle_1'].lines['AB']).toBe(8);
      expect(serialized['triangle_1'].lines['BC']).toBe(10.5);
      expect(serialized['triangle_1'].angles['A']).toBe(60);
      expect(serialized['triangle_1'].points.length).toBe(3);

      // 7. Deserialize using GeoCanvasSolutionService
      solutionService.deserializeTaskJson(serialized);

      // 8. Verify restored drawing data in solution services
      const restoredA = pointsSolutionService.getPointByLabel('A');
      const restoredB = pointsSolutionService.getPointByLabel('B');
      const restoredC = pointsSolutionService.getPointByLabel('C');

      expect(restoredA?.x).toBe(50);
      expect(restoredA?.y).toBe(50);
      expect(restoredB?.x).toBe(150);
      expect(restoredB?.y).toBe(50);
      expect(restoredC?.x).toBe(100);
      expect(restoredC?.y).toBe(120);

      // 9. Verify restored line lengths
      expect(linesSolutionService.getLineLength('A', 'B')).toBe(8);
      expect(linesSolutionService.getLineLength('B', 'C')).toBe(10.5);

      // 10. Verify restored angle measures
      expect(anglesSolutionService.getAngleValue('A')).toBe(60);

      // 11. Verify restored additional conditions and target
      expect(conditionsService.getConditions()).toEqual([
        'AB is parallel to CD',
        'The triangle is acute',
      ]);
      expect(conditionsService.getTarget()).toBe('Find the area of triangle ABC');
    });

    it('should include active application locale in geometry serialization (e.g. Ukrainian ua, Russian ru)', () => {
      stackService.pushStack(
        {
          figureName: 'triangle_1',
          path: [
            { x: 10, y: 20, color: '#000000' },
            { x: 30, y: 40, color: '#000000' },
            { x: 20, y: 60, color: '#000000' },
          ],
          tool: { draw: () => {} },
        },
        'paths'
      );
      pointsService.addPoint(10, 20, 'triangle_1', 0);
      pointsService.addPoint(30, 40, 'triangle_1', 1);
      pointsService.addPoint(20, 60, 'triangle_1', 2);
      conditionsService.setTarget('Find BH');
      conditionsService.setConditions(['BH is perpendicular to AC']);

      languageService.updateLanguageFromUser('ua');
      const serializedUa = canvasService.serializeTaskJson();
      expect(serializedUa.language).toBe('ua');
      expect(serializedUa.target).toBe('Find BH');
      expect(serializedUa.additionalConditions).toEqual(['BH is perpendicular to AC']);
      expect(serializedUa.triangle_1).toBeDefined();

      languageService.updateLanguageFromUser('ru');
      const serializedRu = canvasService.serializeTaskJson();
      expect(serializedRu.language).toBe('ru');

      languageService.updateLanguageFromUser('fr');
      const serializedFr = canvasService.serializeTaskJson();
      expect(serializedFr.language).toBe('fr');
    });

    it('should serialize text-only geometry task without any drawing figures', () => {
      const problemStatement =
        'In triangle ABC, AB = 5, BC = 5, AC = 6. The angle ABC is 60 degrees. Find the altitude BH to AC.';
      conditionsService.setProblem(problemStatement);
      conditionsService.setTarget('Find BH');
      conditionsService.setConditions(['BH is perpendicular to AC']);
      languageService.updateLanguageFromUser('en');

      const serialized = canvasService.serializeTaskJson();
      expect(serialized.problem).toBe(problemStatement);
      expect(serialized.target).toBe('Find BH');
      expect(serialized.additionalConditions).toEqual(['BH is perpendicular to AC']);
      expect(serialized.language).toBe('en');

      // Drawing figures should not be present in text-only task
      const keys = Object.keys(serialized);
      expect(keys.includes('problem')).toBeTrue();
      expect(keys.includes('target')).toBeTrue();
      expect(keys.includes('additionalConditions')).toBeTrue();
      expect(keys.includes('language')).toBeTrue();
      expect(keys.some((k) => k.startsWith('triangle_'))).toBeFalse();
    });

    it('should serialize geometry task with both drawing figure and text problem statement', () => {
      stackService.pushStack(
        {
          figureName: 'triangle_1',
          path: [
            { x: 10, y: 20, color: '#000000' },
            { x: 30, y: 40, color: '#000000' },
            { x: 20, y: 60, color: '#000000' },
          ],
          tool: { draw: () => {} },
        },
        'paths'
      );
      pointsService.addPoint(10, 20, 'triangle_1', 0);
      pointsService.addPoint(30, 40, 'triangle_1', 1);
      pointsService.addPoint(20, 60, 'triangle_1', 2);

      const problemStatement = 'Given triangle ABC, find altitude BH';
      conditionsService.setProblem(problemStatement);
      conditionsService.setTarget('Find BH');
      conditionsService.setConditions(['BH perpendicular to AC']);
      languageService.updateLanguageFromUser('de');

      const serialized = canvasService.serializeTaskJson();
      expect(serialized.problem).toBe(problemStatement);
      expect(serialized.target).toBe('Find BH');
      expect(serialized.additionalConditions).toEqual(['BH perpendicular to AC']);
      expect(serialized.language).toBe('de');
      expect(serialized.triangle_1).toBeDefined();
    });

    it('should handle backward compatibility with legacy payloads missing conditions and target', () => {
      const legacyPayload: any = {
        triangle_1: {
          tool: 'triangle',
          path: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
            { x: 20, y: 60 },
          ],
          points: [
            { x: 10, y: 20, label: 'A', attachedToFigure: 'triangle_1', attachedToPoint: 0 },
            { x: 30, y: 40, label: 'B', attachedToFigure: 'triangle_1', attachedToPoint: 1 },
            { x: 20, y: 60, label: 'C', attachedToFigure: 'triangle_1', attachedToPoint: 2 },
          ],
          lines: { AB: 5 },
          angles: {},
          elements: [],
        },
      };

      solutionService.deserializeTaskJson(legacyPayload);

      const restoredA = pointsSolutionService.getPointByLabel('A');
      expect(restoredA?.x).toBe(10);
      expect(restoredA?.y).toBe(20);
      expect(linesSolutionService.getLineLength('A', 'B')).toBe(5);
      expect(conditionsService.getConditions()).toEqual([]);
      expect(conditionsService.getTarget()).toBe('');
      expect(conditionsService.getProblem()).toBe('');
    });
  });
});
