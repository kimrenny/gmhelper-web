import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DrawingTool } from '../interfaces/drawing-tool.interface';
import { Polygon } from '../drawing-tools/polygon.tool';
import { ToastrService } from 'ngx-toastr';
import { COLORS } from '../utils/colors';
import { getMousePos } from '../utils/mouse.utils';
import { ToolSelector } from '../tools/tool-selector';
import { ToolContext } from '../interfaces/tool-context.interface';
import { getDefaultTools } from '../utils/tool-config';
import { CanvasService } from '../services/geometry-canvas/canvas.service';
import { CounterService } from '../services/geometry-canvas/counter.service';
import { LineLength } from '../drawing-tools/types/line-length.type';
import { Coords2d } from '../drawing-tools/types/coords.type';
import { AngleToolAction, angleToolMap } from '../tools/angle-tools';
import { AngleInputComponent } from '../drawing-tools/angle-input/angle-input.component';
import { PointsService } from '../services/geometry-canvas/points.service';
import { AnglesService } from '../services/geometry-canvas/angles.service';
import { LinesService } from '../services/geometry-canvas/lines.service';
import { StackService } from '../services/geometry-canvas/stack.service';
import { FigureElementsService } from '../services/geometry-canvas/figure-elements.service';
import { FiguresService } from '../services/geometry-canvas/figures.service';
import { SelectionService } from '../services/geometry-canvas/selection.service';
import { SubjectService } from '../services/subject.service';
import { Subscription } from 'rxjs';
import { rawFigureToolMap } from '../tools/figure-tool-map';
import { LineLengthInputComponent } from '../drawing-tools/line-length-input/line-length-input.component';
import { HeaderService } from 'src/app/services/header.service';
import { ConditionsService } from '../services/geometry-canvas/conditions.service';

@Component({
  selector: 'app-geometry-canvas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AngleInputComponent,
    LineLengthInputComponent,
  ],
  templateUrl: './geometry-canvas.component.html',
  styleUrls: ['./geometry-canvas.component.scss'],
})
export class GeoCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  private subjectSub!: Subscription;
  selectedSubject: boolean = false;
  hasFigures: boolean = false;

  private figuresSub!: Subscription;

  scale = 100;
  minScale = 50;
  maxScale = 200;
  currentScaleFactor = 1;
  selectedFigure: string | null = null;
  selectedAngle: string | null = null;
  selectedAngleValue: number = 60;
  colors = COLORS;

  hoveredButton: string | null = null;

  showConditionsModal = false;
  problemInputText = '';
  targetInputText = '';
  newConditionText = '';
  editingConditionIndex: number | null = null;
  editingConditionText = '';

  private polygonFactory = (sides: number): DrawingTool => {
    return new Polygon(
      sides,
      this.canvasService,
      this.pointsService,
      this.linesService,
      this.anglesService,
      this.figureElementsService,
      this.stackService,
      this.figuresService,
      this.counterService
    );
  };

  private currentTool: DrawingTool | null = null;
  private toolSelector!: ToolSelector;
  toolContext!: ToolContext;

  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas') previewCanvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private previewCtx!: CanvasRenderingContext2D;

  isColorPaletteVisible = false;
  shapeToolsVisible = false;
  showPolygonInput = false;

  isFigureColorPaletteVisible = false;

  isLineLengthChanging = false;
  lineLength: LineLength = null;

  isLineSelection: boolean = false;
  isFigureSelection: boolean = false;
  isAngleSelection: boolean = false;

  isAngleInputVisible = false;

  angleTools: AngleToolAction[] = angleToolMap;

  figureToolMap: Record<
    string,
    { name: string; icon: string; tooltip: string; action: () => void }[]
  > = {};

  constructor(
    private canvasService: CanvasService,
    private subjectService: SubjectService,
    private pointsService: PointsService,
    private linesService: LinesService,
    private stackService: StackService,
    private anglesService: AnglesService,
    private figureElementsService: FigureElementsService,
    private figuresService: FiguresService,
    private selectionService: SelectionService,
    private counterService: CounterService,
    public conditionsService: ConditionsService,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.subjectSub = this.subjectService.getSubject().subscribe((subject) => {
      this.selectedSubject = subject == 'Geo';

      if (this.selectedSubject) {
        setTimeout(() => {
          this.clearCanvas();
        });
      }
    });

    this.figuresSub = this.canvasService.hasFigures$.subscribe((value) => {
      this.hasFigures = value;
    });

    this.toolSelector = new ToolSelector(
      getDefaultTools(
        this.polygonFactory,
        this.canvasService,
        this.pointsService,
        this.linesService,
        this.anglesService,
        this.figureElementsService,
        this.stackService,
        this.figuresService,
        this.counterService
      )
    );

    this.generateFigureToolMap();
  }

  ngAfterViewInit(): void {
    this.updateCanvasSize();
    this.setupCanvasEvents();
  }

  updateCanvasSize(): void {
    const canvas = this.canvasRef.nativeElement;
    const previewCanvas = this.previewCanvasRef.nativeElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    previewCanvas.width = previewCanvas.clientWidth;
    previewCanvas.height = previewCanvas.clientHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.ctx = ctx;
    }

    const previewCtx = previewCanvas.getContext('2d');
    if (previewCtx) {
      this.previewCtx = previewCtx;
    }
  }

  setupCanvasEvents(): void {
    const canvas = this.canvasRef.nativeElement;
    const previewCanvas = this.previewCanvasRef.nativeElement;

    this.toolContext = {
      canvas,
      previewCanvas,
      scale: this.scale,
      paths: this.stackService.getPaths(),
      selectedColor: '#000000',
      redraw: this.redraw.bind(this),
      getMousePos: (event: MouseEvent) =>
        getMousePos(event, canvas, this.scale),
    };

    let docMouseMoveHandler: ((event: MouseEvent) => void) | null = null;
    let docMouseUpHandler: ((event: MouseEvent) => void) | null = null;
    let isDocTracking = false;

    const removeDocumentListeners = () => {
      if (docMouseMoveHandler)
        document.removeEventListener('mousemove', docMouseMoveHandler);
      if (docMouseUpHandler)
        document.removeEventListener('mouseup', docMouseUpHandler);
      docMouseMoveHandler = null;
      docMouseUpHandler = null;
      isDocTracking = false;
    };

    const addDocumentListeners = () => {
      removeDocumentListeners();
      isDocTracking = true;

      docMouseMoveHandler = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        if (!inside) {
          if (this.currentTool?.onMouseLeave) {
            this.currentTool.onMouseLeave(this.toolContext);
          }
          removeDocumentListeners();
          return;
        }

        const posInside = this.toolContext.getMousePos(event);
        if (posInside)
          this.currentTool?.onMouseMove?.(posInside, this.toolContext);
      };

      docMouseUpHandler = (event: MouseEvent) => {
        const pos = this.toolContext.getMousePos(event);
        if (pos && this.currentTool?.onMouseUp) {
          const newPath = this.currentTool.onMouseUp(pos, this.toolContext);
          if (newPath) {
            this.stackService.resetStack('redo');
            this.stackService.pushStack(newPath, 'paths');
          }
        } else {
          if (this.currentTool?.onMouseLeave) {
            this.currentTool.onMouseLeave(this.toolContext);
          }
        }
        removeDocumentListeners();
      };

      document.addEventListener('mousemove', docMouseMoveHandler);
      document.addEventListener('mouseup', docMouseUpHandler);
    };

    canvas.addEventListener('mousedown', (event) => {
      const pos = this.toolContext.getMousePos(event);
      if (!pos) return;

      this.selectionService.resetSelectedLine();
      this.selectionService.setSelectedFigure(null);
      this.selectedAngle = null;

      const angleData = this.anglesService.findAngleByPoint(pos);

      if (this.isAngleSelection && angleData) {
        this.selectAngle(angleData);
        return;
      }

      const lineData = this.linesService.findLineByPoint(pos);
      const figureData = this.figuresService.findFigureByPoint(pos);

      if (lineData) {
        if (this.isLineSelection) {
          this.selectLine(lineData);
          return;
        }
        if (this.isFigureSelection) {
          this.selectFigure(lineData);
          return;
        }
      }

      if (figureData) {
        if (this.isFigureSelection) {
          this.selectFigure(figureData);
        }
        return;
      }

      if (
        this.isFigureSelection ||
        this.isAngleSelection ||
        this.isLineSelection
      )
        return;

      this.currentTool?.onMouseDown?.(pos, this.toolContext);
      addDocumentListeners();
    });

    canvas.addEventListener('mousemove', (event) => {
      const pos = this.toolContext.getMousePos(event);
      if (!pos) {
        if (!isDocTracking && this.currentTool?.onMouseLeave) {
          this.currentTool.onMouseLeave(this.toolContext);
        }
        return;
      }
      if (!isDocTracking) {
        this.currentTool?.onMouseMove?.(pos, this.toolContext);
      }
    });

    canvas.addEventListener('mouseup', (event) => {
      const pos = this.toolContext.getMousePos(event);
      if (!pos) {
        removeDocumentListeners();
        return;
      }
      if (this.currentTool?.onMouseUp) {
        const newPath = this.currentTool.onMouseUp(pos, this.toolContext);
        if (newPath) {
          this.stackService.resetStack('redo');
          this.stackService.pushStack(newPath, 'paths');
        }
      }
      removeDocumentListeners();
    });

    canvas.addEventListener('mouseleave', () => {
      if (this.currentTool?.onMouseLeave) {
        this.currentTool.onMouseLeave(this.toolContext);
      }
      removeDocumentListeners();
    });
  }

  generateFigureToolMap(): void {
    for (const [figure, tools] of Object.entries(rawFigureToolMap)) {
      this.figureToolMap[figure] = tools.map((tool) => ({
        name: tool.name,
        icon: tool.icon,
        tooltip: tool.tooltip,
        action: () =>
          this.handleFigureAction(this.selectedFigure ?? figure, tool.name),
      }));
    }
  }

  private selectLine(lineData: {
    point1: { x: number; y: number };
    point2: { x: number; y: number };
    attachedToFigure: string;
  }): void {
    this.clearPreviewCanvas();
    const tool = this.toolSelector.select('line');

    if (tool && tool.onSelectLine) {
      tool?.onSelectLine(
        lineData.point1,
        lineData.point2,
        this.toolContext.previewCanvas
      );
      this.selectionService.setSelectedLine(lineData.point1, lineData.point2);
    }

    return;
  }

  private selectFigure(lineData: {
    point1: { x: number; y: number };
    point2: { x: number; y: number };
    attachedToFigure: string;
  }): void {
    this.clearPreviewCanvas();
    const figureName = lineData.attachedToFigure;

    const toolName = figureName.split('_')[0].toLowerCase();

    const tool = this.toolSelector.select(toolName);

    const points = this.pointsService
      .getPointsByFigure(figureName)
      .map((p) => ({ x: p.x, y: p.y }));

    this.selectionService.setSelectedFigure(figureName);

    this.selectedFigure = figureName;

    if (tool) {
      if (tool.onSelectFigure) {
        tool.onSelectFigure(points, this.toolContext.previewCanvas);
      }
    }
  }

  private selectAngle(angleData: {
    label: string;
    attachedToFigure: string;
    attachedToPoint: number;
  }) {
    this.clearPreviewCanvas();
    const figureName = angleData.attachedToFigure;

    const toolName = figureName.split('_')[0].toLowerCase();

    const tool = this.toolSelector.select(toolName);

    const points = this.pointsService
      .getPointsByFigure(figureName)
      .map((p) => ({ x: p.x, y: p.y }));

    if (tool) {
      if (tool.onSelectAngle) {
        tool.onSelectAngle(
          this.toolContext.previewCanvas,
          points,
          angleData.label,
          angleData.attachedToFigure,
          angleData.attachedToPoint
        );
        this.selectedAngle = angleData.label;
        const currentAngle = this.anglesService.getAngleValue(angleData.label);
        this.selectedAngleValue = typeof currentAngle === 'number' ? currentAngle : 60;
      }
    }
  }

  get canUndo(): boolean {
    return this.stackService.canUndo;
  }

  get canRedo(): boolean {
    return this.stackService.canRedo;
  }

  get isLineSelected(): boolean {
    return this.selectionService.isLineSelected;
  }

  get isFigureSelected(): boolean {
    return this.selectionService.isFigureSelected;
  }

  changeFigureColor(color: string) {
    this.isFigureColorPaletteVisible = false;
    this.figuresService.changeFigureColor(color);
    this.redraw();
    this.deselectFigure();
    this.toolSelector.select('pencil');
  }

  undo(): void {
    const lastPath = this.stackService.popStack('paths');
    if (lastPath) {
      this.stackService.pushStack(lastPath, 'redo');
      this.redraw();
    }
    if (!this.canUndo) {
      this.deselectFigure();
      this.deselectAngle();
    }
  }

  redo(): void {
    const restoredPath = this.stackService.popStack('redo');
    if (restoredPath) {
      this.stackService.pushStack(restoredPath, 'paths');
      this.redraw();
    }
  }

  setCursor(cursorStyle: string): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.style.cursor = cursorStyle;
  }

  adjustScale(delta: number): void {
    const newScale = this.scale + delta;
    if (newScale >= this.minScale && newScale <= this.maxScale) {
      this.scale = newScale;
      this.redraw();
    }
  }

  redraw(): void {
    if (!this.canvasRef || !this.previewCanvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const previewCanvas = this.previewCanvasRef.nativeElement;

    if (!canvas || !previewCanvas || !this.ctx || !this.previewCtx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    this.ctx.setTransform(this.scale / 100, 0, 0, this.scale / 100, 0, 0);
    this.previewCtx.setTransform(
      this.scale / 100,
      0,
      0,
      this.scale / 100,
      0,
      0
    );
    this.pointsService.resetPoints();
    this.counterService.resetCounter();

    this.counterService.setCounterFromFigures(
      this.figuresService.getAllFigures()
    );

    for (const p of this.stackService.getPaths()) {
      const color = p.path[0]?.color || '#000000';
      this.ctx.strokeStyle = color;

      if (p.tool.draw) {
        p.tool.draw(this.ctx, p.path, color, true);
      }
    }
  }

  updateCanvasTransform(): void {
    const scaleFactor = this.scale / 100;
    this.ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    this.previewCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
  }

  selectTool(tool: string): void {
    if (tool === 'polygon') {
      this.openPolygonInput();
    } else {
      this.currentTool = this.toolSelector.select(tool);
      this.disableSelection();
    }
    this.shapeToolsVisible = false;
  }

  toggleColorPalette(): void {
    this.isColorPaletteVisible = !this.isColorPaletteVisible;
  }

  toggleFigureColorPalette(manual?: boolean | null): void {
    if (!this.isFigureSelected && manual != null) return;
    if (manual != null) {
      this.isFigureColorPaletteVisible = manual;
    } else {
      this.isFigureColorPaletteVisible = !this.isFigureColorPaletteVisible;
    }
  }

  disableSelection() {
    this.deselectLine();
    this.deselectAngle();
    this.deselectFigure();
  }

  toggleLineSelection(
    manual: boolean = false,
    changeTo: boolean = false
  ): void {
    if (manual) {
      this.isLineSelection = changeTo;
    } else {
      this.isLineSelection = !this.isLineSelection;
    }

    if (this.isLineSelection) {
      this.deselectAngle();
      this.deselectFigure();
    } else {
      this.deselectLine();
    }
  }

  toggleFigureSelection(
    manual: boolean = false,
    changeTo: boolean = false
  ): void {
    if (manual) {
      this.isFigureSelection = changeTo;
    } else {
      this.isFigureSelection = !this.isFigureSelection;
    }

    if (this.isFigureSelection) {
      this.deselectAngle();
      this.deselectLine();
    } else {
      this.deselectFigure();
    }
  }

  toggleAngleSelection(): void {
    this.isAngleSelection = !this.isAngleSelection;

    if (this.isAngleSelection) {
      this.deselectFigure();
      this.deselectLine();
    } else {
      this.deselectAngle();
    }
  }

  onAngleConfirm(value: number | null) {
    if (!this.selectedAngle) return;
    if (value === null) {
      this.anglesService.deleteAngle(this.selectedAngle);
    } else {
      if (typeof value === 'number' && (value <= 0 || value >= 180)) {
        this.toastr.error(
          this.translate.instant('CANVAS.ERRORS.INVALID_ANGLE_VALUE') ||
            'Angle must be between 0° and 180°',
          this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
        );
        this.isAngleInputVisible = false;
        return;
      }
      this.anglesService.setAngleValue(this.selectedAngle, value);
    }
    this.redraw();
    this.isAngleInputVisible = false;
  }

  deselectLine(): void {
    this.selectionService.resetSelectedLine();
    this.isLineSelection = false;
    this.lineLength = null;
    this.isLineLengthChanging = false;
    this.clearPreviewCanvas();
  }

  deselectFigure(): void {
    this.selectionService.setSelectedFigure(null);
    this.isFigureSelection = false;
    this.selectedFigure = null;
    this.isFigureColorPaletteVisible = false;
    this.clearPreviewCanvas();
  }

  deselectAngle(): void {
    this.isAngleSelection = false;
    this.selectedAngle = null;
    this.isAngleInputVisible = false;
    this.clearPreviewCanvas();
  }

  toggleShapeTools(): void {
    this.shapeToolsVisible = !this.shapeToolsVisible;
  }

  selectColor(color: string): void {
    this.toolContext.selectedColor = color;
    this.isColorPaletteVisible = !this.isColorPaletteVisible;
  }

  onChangeLineLengthClick(): void {
    if (this.isLineLengthChanging) {
      this.isLineLengthChanging = false;
      return;
    }

    const selectedLine = this.selectionService.getSelectedLine();
    if (selectedLine) {
      const a = this.pointsService.getPointLabelByCoords(selectedLine.a);
      const b = this.pointsService.getPointLabelByCoords(selectedLine.b);
      if (!a || !b) return;

      this.lineLength = this.linesService.getLineLength(a, b);
      this.isLineLengthChanging = true;
    }
  }

  onLineLengthConfirm(value: LineLength): void {
    if (value === null) {
      const selectedLine = this.selectionService.getSelectedLine();
      if (selectedLine) {
        const a = this.pointsService.getPointLabelByCoords(selectedLine.a);
        const b = this.pointsService.getPointLabelByCoords(selectedLine.b);
        if (a && b) {
          this.linesService.deleteLineLength(a, b);
          this.deselectLine();
          this.redraw();
        }
      }
      return;
    }

    const val = value.toString().trim();
    const isNumeric = /^-?\d+(\.\d+)?$/.test(val);
    const allowedKeywords = ['x', 'y', '?'];
    const isValid = isNumeric || allowedKeywords.includes(val);

    if (!isValid || (isNumeric && parseFloat(val) <= 0)) {
      this.toastr.error(
        this.translate.instant('CANVAS.LENGTH.LENGTH.INCORRECT'),
        this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
      );
      this.isLineLengthChanging = false;
      this.lineLength = null;
      return;
    }

    const selectedLine = this.selectionService.getSelectedLine();
    if (selectedLine) {
      const a = this.pointsService.getPointLabelByCoords(selectedLine.a);
      const b = this.pointsService.getPointLabelByCoords(selectedLine.b);
      if (!a || !b) return;
      const numVal: LineLength = isNumeric ? parseFloat(val) : (val as 'x' | 'y' | '?');
      this.linesService.setLineLength(a, b, numVal);
      this.deselectLine();
      this.redraw();
    }
  }

  openPolygonInput() {
    this.showPolygonInput = true;
  }

  closePolygonInput() {
    this.showPolygonInput = false;
  }

  confirmPolygonSides(value: string) {
    const sides = parseInt(value, 10);
    if (sides >= 3) {
      if (isNaN(sides)) {
        this.toastr.error(
          this.translate.instant('CANVAS.ERRORS.INVALID_SIDES_NUMBER') ||
            'Invalid number of sides',
          this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
        );
        return;
      }

      this.currentTool = this.toolSelector.select('polygon', sides);
      this.disableSelection();
      this.closePolygonInput();
    } else {
      this.closePolygonInput();
      this.toastr.error(
        this.translate.instant('CANVAS.ERRORS.INVALID_SIDES_NUMBER') ||
          'Invalid number of sides',
        this.translate.instant('CANVAS.ERRORS.ERROR.TITLE')
      );
    }
  }

  handleFigureAction(figure: string, action: string) {
    const toolName = figure.split('_')[0].toLowerCase();
    const tool = this.toolSelector.select(toolName);

    tool?.handleAction?.(action, this.toolContext, figure);

    this.selectionService.setSelectedFigure(null);
    this.selectedFigure = null;
    this.clearPreviewCanvas();
    this.isFigureSelection = false;
    this.isFigureColorPaletteVisible = false;
    this.redraw();
  }

  handleAngleAction(actionName: string): void {
    switch (actionName) {
      case 'changeMeasurement': {
        this.isAngleInputVisible = true;
        break;
      }
    }
  }

  get conditionsCount(): number {
    let count = this.conditionsService.getConditions().length;
    if (this.conditionsService.getProblem().trim()) {
      count++;
    }
    if (this.conditionsService.getTarget().trim()) {
      count++;
    }
    return count;
  }

  get hasTextProblem(): boolean {
    return !!(
      this.conditionsService.getProblem().trim() ||
      this.conditionsService.getTarget().trim() ||
      this.conditionsService.getConditions().length > 0
    );
  }

  openConditionsModal(): void {
    this.problemInputText = this.conditionsService.getProblem();
    this.targetInputText = this.conditionsService.getTarget();
    this.newConditionText = '';
    this.editingConditionIndex = null;
    this.showConditionsModal = true;
  }

  closeConditionsModal(): void {
    this.showConditionsModal = false;
    this.editingConditionIndex = null;
  }

  saveProblem(): void {
    this.conditionsService.setProblem(this.problemInputText);
    this.toastr.success(
      this.translate.instant('CANVAS.CONDITIONS.PROBLEM_SAVED'),
      this.translate.instant('CANVAS.CONDITIONS.TITLE')
    );
  }

  clearProblem(): void {
    this.problemInputText = '';
    this.conditionsService.clearProblem();
  }

  saveTarget(): void {
    this.conditionsService.setTarget(this.targetInputText);
    this.toastr.success(
      this.translate.instant('CANVAS.CONDITIONS.TARGET_SAVED'),
      this.translate.instant('CANVAS.CONDITIONS.TITLE')
    );
  }

  clearTarget(): void {
    this.targetInputText = '';
    this.conditionsService.clearTarget();
  }

  addAdditionalCondition(): void {
    const text = this.newConditionText.trim();
    if (!text) return;
    this.conditionsService.addCondition(text);
    this.newConditionText = '';
  }

  startEditCondition(index: number, text: string): void {
    this.editingConditionIndex = index;
    this.editingConditionText = text;
  }

  saveEditCondition(index: number): void {
    const text = this.editingConditionText.trim();
    if (text) {
      this.conditionsService.updateCondition(index, text);
    }
    this.editingConditionIndex = null;
  }

  cancelEditCondition(): void {
    this.editingConditionIndex = null;
  }

  deleteAdditionalCondition(index: number): void {
    this.conditionsService.deleteCondition(index);
  }

  getFigureLinesList(): { line: string; length: number | string }[] {
    const result: { line: string; length: number | string }[] = [];
    const lines = this.linesService.getAllLines();
    for (const [lineKey, lineVal] of Object.entries(lines)) {
      if (lineVal != null) {
        result.push({ line: lineKey, length: lineVal });
      }
    }
    return result;
  }

  getFigureAnglesList(): { angle: string; value: number | string }[] {
    const result: { angle: string; value: number | string }[] = [];
    const angles = this.anglesService.getAllAngles();
    for (const [angleKey, angleVal] of Object.entries(angles)) {
      if (angleVal != null) {
        result.push({ angle: angleKey, value: angleVal });
      }
    }
    return result;
  }

  onSubmitTask(): void {
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

  clearPreviewCanvas(): void {
    const previewCanvas = this.previewCanvasRef.nativeElement;
    this.previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }

  onClearCanvas(): void {
    this.clearCanvas();
    this.shapeToolsVisible = false;
  }

  clearCanvas(): void {
    this.stackService.resetStack('paths');
    this.stackService.resetStack('redo');

    this.redraw();

    this.pointsService.resetPoints();
    this.counterService.resetCounter();
    this.figureElementsService.clearAllFigureElements();
    this.anglesService.clearAllAngles();
    this.conditionsService.clearAll();
    this.deselectAngle();
    this.deselectFigure();
  }

  ngOnDestroy(): void {
    this.subjectSub.unsubscribe();
    this.figuresSub.unsubscribe();
  }
}
