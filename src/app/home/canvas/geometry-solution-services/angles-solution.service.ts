import { Injectable } from '@angular/core';
import { LineLength } from '../drawing-tools/types/line-length.type';
import { PointsSolutionService } from './points-solution.service';
import { Coords2d } from '../drawing-tools/types/coords.type';

@Injectable({
  providedIn: 'root',
})
export class AnglesSolutionService {
  private angles: Record<string, LineLength> = {};

  constructor(private pointsService: PointsSolutionService) {}

  getAllAngles(): Record<string, LineLength> {
    return this.angles;
  }

  getAngleLabelByCoords(coords: Coords2d): string | null {
    const point = this.pointsService
      .getAllPoints()
      .find((p) => p.x === coords.x && p.y === coords.y);
    if (point && this.angles[point.label]) {
      return point.label;
    }
    return null;
  }

  setAngleValue(label: string, value: LineLength): void {
    this.angles[label] = value;
  }

  getAngleValue(label: string): LineLength {
    return this.angles[label] ?? null;
  }

  findAngleByPoint(pos: { x: number; y: number }): {
    label: string;
    attachedToFigure: string;
    attachedToPoint: number;
  } | null {
    for (const point of this.pointsService.getAllPoints()) {
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 15 && point.label) {
        return {
          label: point.label,
          attachedToFigure: point.attachedToFigure,
          attachedToPoint: point.attachedToPoint,
        };
      }
    }
    return null;
  }

  deleteAngle(label: string): void {
    delete this.angles[label];
  }

  clearAllAngles(): void {
    this.angles = {};
  }
}
