import { Injectable } from '@angular/core';
import { LineLength } from '../drawing-tools/types/line-length.type';
import { Coords2d } from '../drawing-tools/types/coords.type';
import { PointsSolutionService } from './points-solution.service';
import { Point } from '../drawing-tools/types/point';

@Injectable({
  providedIn: 'root',
})
export class LinesSolutionService {
  private lines: Record<string, LineLength> = {};
  private linesRedo: Record<string, LineLength>[] = [];

  constructor(private pointsService: PointsSolutionService) {}

  createLine(point1: string, point2: string): void {
    const lineName = point1 + point2;
    if (!(lineName in this.lines)) {
      this.lines[lineName] = null;
    }
  }

  setLineLength(point1: string, point2: string, length: LineLength): void {
    const p1 = this.pointsService.getPointByLabel(point1);
    const p2 = this.pointsService.getPointByLabel(point2);

    if (!p1 || !p2) return;

    const isPolygon =
      p1.attachedToFigure &&
      p1.attachedToFigure === p2.attachedToFigure &&
      p1.attachedToFigure.toLowerCase().includes('polygon');

    if (isPolygon) {
      this.setPolygonLinesLength(p1, length);
    } else {
      const lineName = point1 + point2;
      if (lineName in this.lines) {
        this.lines[lineName] = length;
      } else {
        this.lines[lineName] = length;
      }
    }
  }

  deleteLineLength(point1: string, point2: string): void {
    const lineName1 = point1 + point2;
    const lineName2 = point2 + point1;
    delete this.lines[lineName1];
    delete this.lines[lineName2];
  }

  setPolygonLinesLength(point: Point, length: LineLength): void {
    const polygonPoints = this.pointsService.getPointsByFigure(
      point.attachedToFigure
    );

    for (let i = 0; i < polygonPoints.length; i++) {
      for (let j = i + 1; j < polygonPoints.length; j++) {
        const labelA = polygonPoints[i].label;
        const labelB = polygonPoints[j].label;
        const lineName1 = labelA + labelB;
        const lineName2 = labelB + labelA;

        if (this.lines[lineName1] !== undefined) {
          this.lines[lineName1] = length;
        } else if (this.lines[lineName2] !== undefined) {
          this.lines[lineName2] = length;
        }
      }
    }
  }

  getAllLines(): Record<string, LineLength> {
    return this.lines;
  }

  getLinesByFigureName(
    figureName: string
  ): { name: string; a: Coords2d; b: Coords2d }[] {
    const figurePoints = this.pointsService
      .getAllPoints()
      .filter((p) => p.attachedToFigure === figureName);

    const nameToCoord = new Map<string, Coords2d>();
    for (const p of figurePoints) {
      if (p.label) {
        nameToCoord.set(p.label, { x: p.x, y: p.y });
      }
    }

    const labels = Array.from(nameToCoord.keys());

    const result: { name: string; a: Coords2d; b: Coords2d }[] = [];

    for (const lineName in this.lines) {
      const [l1, l2] = lineName.split('');

      if (labels.includes(l1) && labels.includes(l2)) {
        const a = nameToCoord.get(l1);
        const b = nameToCoord.get(l2);

        if (a && b) {
          result.push({ name: lineName, a, b });
        }
      }
    }

    return result;
  }

  getLineLength(a: string, b: string): LineLength {
    return this.lines[`${a}${b}`] ?? this.lines[`${b}${a}`] ?? null;
  }

  findLineByPoint(pos: { x: number; y: number }): {
    point1: { x: number; y: number };
    point2: { x: number; y: number };
    attachedToFigure: string;
  } | null {
    const clickTolerance = 5;

    for (const lineName of Object.keys(this.lines)) {
      const label1 = lineName[0];
      const label2 = lineName[1];

      const point1 = this.pointsService.getPointByLabel(label1);
      const point2 = this.pointsService.getPointByLabel(label2);

      if (!point1 || !point2) {
        continue;
      }

      const near = this.isPointNearLine(
        pos,
        { x: point1.x, y: point1.y },
        { x: point2.x, y: point2.y },
        clickTolerance
      );

      if (near) {
        return {
          point1: { x: point1.x, y: point1.y },
          point2: { x: point2.x, y: point2.y },
          attachedToFigure:
            point1.attachedToFigure || point2.attachedToFigure || '',
        };
      }
    }

    return null;
  }

  moveToRedo(labels: string[]): void {
    const linesToRedo: Record<string, LineLength> = {};

    for (const label of labels) {
      if (this.hasLine(label)) {
        const original = this.getLineLength(label[0], label[1]);
        if (original !== undefined) {
          linesToRedo[label] = original;
        }
        this.deleteLine(label);
      }
    }

    if (Object.keys(linesToRedo).length > 0) {
      this.linesRedo.push(linesToRedo);
    }
  }

  restoreFromRedo(labels: string[]): void {
    const index = this.linesRedo.findIndex((obj) =>
      Object.keys(obj).some((label) => labels.includes(label))
    );

    if (index !== -1) {
      Object.entries(this.linesRedo[index]).forEach(([label, value]) => {
        this.setLine(label, value);
      });
      this.linesRedo.splice(index, 1);
    }
  }

  resetRedo(): void {
    this.linesRedo = [];
  }

  private isPointNearLine(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
    tolerance: number
  ): boolean {
    const A = p.x - a.x;
    const B = p.y - a.y;
    const C = b.x - a.x;
    const D = b.y - a.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = a.x;
      yy = a.y;
    } else if (param > 1) {
      xx = b.x;
      yy = b.y;
    } else {
      xx = a.x + param * C;
      yy = a.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;

    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  deleteLine(label: string): void {
    delete this.lines[label];
  }

  setLine(label: string, value: LineLength): void {
    this.lines[label] = value;
  }

  hasLine(label: string): boolean {
    return this.lines[label] !== undefined;
  }

  clearAllLines(): void {
    this.lines = {};
  }
}
