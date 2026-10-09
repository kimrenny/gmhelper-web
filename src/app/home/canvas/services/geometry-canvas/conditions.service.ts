import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConditionsServiceInterface } from '../../interfaces/conditions-service.interface';

@Injectable({
  providedIn: 'root',
})
export class ConditionsService implements ConditionsServiceInterface {
  private problemSubject = new BehaviorSubject<string>('');
  problem$: Observable<string> = this.problemSubject.asObservable();

  private conditionsSubject = new BehaviorSubject<string[]>([]);
  conditions$: Observable<string[]> = this.conditionsSubject.asObservable();

  private targetSubject = new BehaviorSubject<string>('');
  target$: Observable<string> = this.targetSubject.asObservable();

  getProblem(): string {
    return this.problemSubject.value;
  }

  setProblem(problem: string): void {
    this.problemSubject.next((problem || '').trim());
  }

  clearProblem(): void {
    this.problemSubject.next('');
  }

  getConditions(): string[] {
    return [...this.conditionsSubject.value];
  }

  setConditions(conditions: string[]): void {
    const cleaned = (conditions || [])
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter((c) => c.length > 0);
    this.conditionsSubject.next(cleaned);
  }

  addCondition(condition: string): void {
    const trimmed = (condition || '').trim();
    if (!trimmed) return;
    const current = this.getConditions();
    current.push(trimmed);
    this.conditionsSubject.next(current);
  }

  updateCondition(index: number, newCondition: string): void {
    const trimmed = (newCondition || '').trim();
    const current = this.getConditions();
    if (index >= 0 && index < current.length) {
      if (trimmed) {
        current[index] = trimmed;
      } else {
        current.splice(index, 1);
      }
      this.conditionsSubject.next(current);
    }
  }

  deleteCondition(index: number): void {
    const current = this.getConditions();
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      this.conditionsSubject.next(current);
    }
  }

  reorderConditions(fromIndex: number, toIndex: number): void {
    const current = this.getConditions();
    if (
      fromIndex >= 0 &&
      fromIndex < current.length &&
      toIndex >= 0 &&
      toIndex < current.length
    ) {
      const [item] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, item);
      this.conditionsSubject.next(current);
    }
  }

  clearConditions(): void {
    this.conditionsSubject.next([]);
  }

  getTarget(): string {
    return this.targetSubject.value;
  }

  setTarget(target: string): void {
    this.targetSubject.next((target || '').trim());
  }

  clearTarget(): void {
    this.targetSubject.next('');
  }

  resetAll(): void {
    this.clearProblem();
    this.clearConditions();
    this.clearTarget();
  }

  clearAll(): void {
    this.resetAll();
  }
}
