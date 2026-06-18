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

/**
 * Canonical, client-side state of the co-plan.
 *
 * This is the heart of the tool-based co-planning: the plan lives here, NOT in
 * the model's text output. The co-planner mutates it through small, atomic
 * operations (add/remove/move/swap/update). The store performs the structural
 * change deterministically, so reordering or swapping never depends on the
 * model recomputing positions or reproducing the full list -- exactly the part
 * that small models get wrong when they have to keep the whole list "in their
 * head" and rewrite it every turn.
 */
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
    /** Replaces the whole plan. Used when the agent first drafts it. */
    setPlan(plan: { title?: string; steps: PlanStepInput[] }): void {
      patchState(store, {
        title: plan.title ?? store.title(),
        steps: plan.steps.map(withId),
      });
    },

    /** Inserts a step (1-based position; appended when omitted). */
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

    /** Patches a single step's fields, addressed by its stable id. */
    updateStep(id: string, patch: Partial<PlanStepInput>): void {
      patchState(store, (state) => ({
        steps: state.steps.map((step) =>
          step.id === id ? { ...step, ...patch } : step,
        ),
      }));
    },

    /** Moves the step with the given id to a 1-based target position. */
    moveStep(id: string, toPosition: number): void {
      patchState(store, (state) => {
        const from = state.steps.findIndex((step) => step.id === id);
        if (from === -1) return {};
        const next = [...state.steps];
        const [moved] = next.splice(from, 1);
        next.splice(clampIndex(toPosition - 1, next.length), 0, moved);
        return { steps: next };
      });
    },

    /** Swaps the positions of two steps addressed by their ids. */
    swapSteps(idA: string, idB: string): void {
      patchState(store, (state) => {
        const a = state.steps.findIndex((step) => step.id === idA);
        const b = state.steps.findIndex((step) => step.id === idB);
        if (a === -1 || b === -1 || a === b) return {};
        const next = [...state.steps];
        [next[a], next[b]] = [next[b], next[a]];
        return { steps: next };
      });
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
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}
