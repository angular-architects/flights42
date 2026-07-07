import { computed } from '@angular/core';
import { withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

import { PlanStep, PlanStepInput } from './plan-schemas';

interface PlanState {
  title: string;
  steps: PlanStep[];
}

export const PlanStore = signalStore(
  { providedIn: 'root' },

  withState<PlanState>({
    title: '',
    steps: [],
  }),

  withComputed((store) => ({
    isEmpty: computed(() => store.steps().length === 0),
  })),

  withMethods((store) => ({
    setPlan(plan: { title?: string; steps: PlanStepInput[] }): void {
      patchState(store, {
        title: plan.title ?? store.title(),
        steps: plan.steps.map(withId),
      });
    },

    addStep(step: PlanStepInput, position?: number): void {
      patchState(store, (state) => {
        const next = [...state.steps];
        const index =
          position == null
            ? next.length
            : clampIndex(position - 1, next.length);
        next.splice(index, 0, withId(step));
        return { steps: next };
      });
    },

    removeStep(id: string): void {
      patchState(store, (state) => ({
        steps: state.steps.filter((step) => step.id !== id),
      }));
    },

    updateStep(id: string, patch: Partial<PlanStepInput>): void {
      patchState(store, (state) => ({
        steps: state.steps.map((step) =>
          step.id === id ? { ...step, ...patch } : step,
        ),
      }));
    },

    moveStep(id: string, toPosition: number): void {
      patchState(store, (state) => {
        const from = state.steps.findIndex((step) => step.id === id);
        if (from === -1) {
          return {};
        }
        const next = [...state.steps];
        const [moved] = next.splice(from, 1);
        next.splice(clampIndex(toPosition - 1, next.length), 0, moved);
        return { steps: next };
      });
    },

    swapSteps(idA: string, idB: string): void {
      patchState(store, (state) => {
        const a = state.steps.findIndex((step) => step.id === idA);
        const b = state.steps.findIndex((step) => step.id === idB);
        if (a === -1 || b === -1 || a === b) {
          return {};
        }
        const next = [...state.steps];
        [next[a], next[b]] = [next[b], next[a]];
        return { steps: next };
      });
    },

    reverse(): void {
      patchState(store, (state) => ({ steps: [...state.steps].reverse() }));
    },

    clear(): void {
      patchState(store, { title: '', steps: [] });
    },
  })),

  withDevtools('coPlan'),
);

function withId(step: PlanStepInput): PlanStep {
  return { ...step, id: crypto.randomUUID() };
}

function clampIndex(index: number, length: number): number {
  if (index < 0) {
    return 0;
  }
  if (index > length) {
    return length;
  }
  return index;
}
