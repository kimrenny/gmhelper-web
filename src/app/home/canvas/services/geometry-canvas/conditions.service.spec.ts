import { TestBed } from '@angular/core/testing';
import { ConditionsService } from './conditions.service';

describe('ConditionsService', () => {
  let service: ConditionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConditionsService],
    });
    service = TestBed.inject(ConditionsService);
  });

  describe('Additional Conditions', () => {
    it('should initialize with empty conditions', () => {
      expect(service.getConditions()).toEqual([]);
    });

    it('should add additional conditions in order', () => {
      service.addCondition('AB is parallel to CD');
      service.addCondition('AB = BC');
      service.addCondition('O is the midpoint of AC');

      const conditions = service.getConditions();
      expect(conditions.length).toBe(3);
      expect(conditions[0]).toBe('AB is parallel to CD');
      expect(conditions[1]).toBe('AB = BC');
      expect(conditions[2]).toBe('O is the midpoint of AC');
    });

    it('should ignore empty or whitespace-only condition on add', () => {
      service.addCondition('   ');
      expect(service.getConditions().length).toBe(0);
    });

    it('should edit an existing condition by index', () => {
      service.addCondition('AB = 5');
      service.addCondition('BC = 7');

      service.updateCondition(0, 'AB = 10');
      expect(service.getConditions()[0]).toBe('AB = 10');
      expect(service.getConditions()[1]).toBe('BC = 7');
    });

    it('should delete a condition by index and preserve remaining order', () => {
      service.addCondition('First');
      service.addCondition('Second');
      service.addCondition('Third');

      service.deleteCondition(1);

      const conditions = service.getConditions();
      expect(conditions.length).toBe(2);
      expect(conditions[0]).toBe('First');
      expect(conditions[1]).toBe('Third');
    });

    it('should reorder conditions correctly', () => {
      service.addCondition('A');
      service.addCondition('B');
      service.addCondition('C');

      service.reorderConditions(0, 2);

      const conditions = service.getConditions();
      expect(conditions).toEqual(['B', 'C', 'A']);
    });

    it('should set multiple conditions at once', () => {
      service.setConditions(['Cond 1', 'Cond 2']);
      expect(service.getConditions()).toEqual(['Cond 1', 'Cond 2']);
    });
  });

  describe('Target (What needs to be found)', () => {
    it('should initialize with empty target', () => {
      expect(service.getTarget()).toBe('');
    });

    it('should set, get, and update target', () => {
      service.setTarget('Find AB');
      expect(service.getTarget()).toBe('Find AB');

      service.setTarget('Find ∠ABC');
      expect(service.getTarget()).toBe('Find ∠ABC');
    });

    it('should clear target', () => {
      service.setTarget('Find the area of triangle ABC');
      service.clearTarget();
      expect(service.getTarget()).toBe('');
    });

    it('should keep target completely independent from additional conditions', () => {
      service.setTarget('Find radius');
      service.addCondition('Circle is tangent to AB');

      expect(service.getTarget()).toBe('Find radius');
      expect(service.getConditions()).toEqual(['Circle is tangent to AB']);

      service.clearTarget();
      expect(service.getTarget()).toBe('');
      expect(service.getConditions()).toEqual(['Circle is tangent to AB']);

      service.clearConditions();
      expect(service.getConditions()).toEqual([]);
    });
  });

  describe('Problem Statement (Text-Only or Free-Form)', () => {
    it('should initialize with empty problem statement', () => {
      expect(service.getProblem()).toBe('');
    });

    it('should set, get, and update problem statement', () => {
      const problemText =
        'In triangle ABC, AB = 5, BC = 5, AC = 6. The angle ABC is 60 degrees. Find the altitude BH to AC.';
      service.setProblem(problemText);
      expect(service.getProblem()).toBe(problemText);

      service.setProblem('New problem text');
      expect(service.getProblem()).toBe('New problem text');
    });

    it('should clear problem statement', () => {
      service.setProblem('Some problem');
      service.clearProblem();
      expect(service.getProblem()).toBe('');
    });
  });

  describe('Clear All', () => {
    it('should clear problem statement, target and conditions', () => {
      service.setProblem('Problem statement text');
      service.setTarget('Find x');
      service.addCondition('x + y = 10');
      service.clearAll();

      expect(service.getProblem()).toBe('');
      expect(service.getTarget()).toBe('');
      expect(service.getConditions()).toEqual([]);
    });
  });
});
