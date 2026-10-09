import { LineLength } from '../drawing-tools/types/line-length.type';
import { Coords2d } from '../drawing-tools/types/coords.type';

export interface AnglesServiceInterface {
  getAllAngles(): Record<string, LineLength>;

  getAngleLabelByCoords(coords: Coords2d): string | null;

  setAngleValue(label: string, value: LineLength): void;

  getAngleValue(label: string): LineLength;

  findAngleByPoint(pos: { x: number; y: number }): {
    label: string;
    attachedToFigure: string;
    attachedToPoint: number;
  } | null;

  deleteAngle(label: string): void;

  clearAllAngles(): void;
}

