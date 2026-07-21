import {
  DestroyRef,
  inject,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { type AgentStore } from '@copilotkit/angular';

export interface AgentStepTracker {
  readonly startedSteps: Signal<ReadonlySet<string>>;
  readonly finishedSteps: Signal<ReadonlySet<string>>;
  reset(): void;
}

export function injectAgentStepTracker(
  store: Signal<AgentStore>,
): AgentStepTracker {
  const started = signal<ReadonlySet<string>>(new Set());
  const finished = signal<ReadonlySet<string>>(new Set());

  const clear = (): void => {
    started.set(new Set());
    finished.set(new Set());
  };

  const addStep = (
    target: WritableSignal<ReadonlySet<string>>,
    stepName: string | undefined,
  ): void => {
    if (!stepName) {
      return;
    }
    target.update((steps) => new Set(steps).add(stepName));
  };

  const subscription = store().agent.subscribe({
    onRunStartedEvent: clear,
    onStepStartedEvent: ({ event }) => {
      addStep(started, event.stepName);
    },
    onStepFinishedEvent: ({ event }) => {
      addStep(finished, event.stepName);
    },
  });

  inject(DestroyRef).onDestroy(() => subscription.unsubscribe());

  return {
    startedSteps: started.asReadonly(),
    finishedSteps: finished.asReadonly(),
    reset: clear,
  };
}
