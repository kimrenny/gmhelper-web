import { Observable } from 'rxjs';

export interface ConditionsServiceInterface {
  problem$: Observable<string>;
  conditions$: Observable<string[]>;
  target$: Observable<string>;
  getProblem(): string;
  setProblem(problem: string): void;
  clearProblem(): void;
  getConditions(): string[];
  setConditions(conditions: string[]): void;
  addCondition(condition: string): void;
  updateCondition(index: number, newCondition: string): void;
  deleteCondition(index: number): void;
  reorderConditions(fromIndex: number, toIndex: number): void;
  clearConditions(): void;
  getTarget(): string;
  setTarget(target: string): void;
  clearTarget(): void;
  resetAll(): void;
  clearAll(): void;
}
