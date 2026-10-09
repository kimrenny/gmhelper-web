import { LineLength } from '../drawing-tools/types/line-length.type';
import { Coords2d } from '../drawing-tools/types/coords.type';

export interface LinesServiceInterface {
  createLine(point1: string, point2: string): void;

  setLineLength(point1: string, point2: string, length: LineLength): void;

  deleteLineLength(point1: string, point2: string): void;

  setPolygonLinesLength(point: any, length: LineLength): void;

  getAllLines(): Record<string, LineLength>;

  getLinesByFigureName(
    figureName: string
  ): { name: string; a: Coords2d; b: Coords2d }[];

  getLineLength(a: string, b: string): LineLength;

  findLineByPoint(pos: { x: number; y: number }): {
    point1: { x: number; y: number };
    point2: { x: number; y: number };
    attachedToFigure: string;
  } | null;

  moveToRedo(labels: string[]): void;

  restoreFromRedo(labels: string[]): void;

  resetRedo(): void;

  deleteLine(label: string): void;

  setLine(label: string, value: LineLength): void;

  hasLine(label: string): boolean;

  clearAllLines(): void;
}
