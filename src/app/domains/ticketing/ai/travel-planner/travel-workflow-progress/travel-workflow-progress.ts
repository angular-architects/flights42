import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import type {
  AgUiChatMessage,
  AgUiToolCall,
  AgUiWorkflowStep,
} from '@internal/ag-ui-client';

import {
  buildPipeline,
  formatToolArgsValue,
  groupToolCallsByStep,
  type PipelineStep,
  readStepLabel,
  selectTopLevelToolCalls,
  selectVisibleToolCalls,
  selectWorkflowSteps,
  WORKFLOW_STEP_LABELS,
} from './travel-workflow-progress.helpers';

/**
 * Renders the workflow step tracker and the tool-call history behind the
 * "More" button. Derives everything from the chat messages, so the page only
 * has to pass the raw messages plus loading state and widget count.
 */
@Component({
  selector: 'app-travel-workflow-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './travel-workflow-progress.html',
  styleUrl: './travel-workflow-progress.css',
})
export class TravelWorkflowProgress {
  readonly messages = input.required<AgUiChatMessage[]>();
  readonly loading = input.required<boolean>();
  readonly widgetCount = input.required<number>();

  protected readonly toolCalls = computed<AgUiToolCall[]>(() =>
    selectVisibleToolCalls(this.messages()),
  );

  protected readonly topLevelToolCalls = computed<AgUiToolCall[]>(() =>
    selectTopLevelToolCalls(this.toolCalls()),
  );

  protected readonly workflowSteps = computed<AgUiWorkflowStep[]>(() =>
    selectWorkflowSteps(this.messages()),
  );

  protected readonly toolCallsByStep = computed<Map<string, AgUiToolCall[]>>(
    () => groupToolCallsByStep(this.toolCalls()),
  );

  protected readonly stepPipeline = computed<PipelineStep[]>(() =>
    buildPipeline(this.workflowSteps(), this.loading(), this.widgetCount() > 0),
  );

  protected readonly showToolDetails = signal(false);

  constructor() {
    // Collapse the details panel whenever there is nothing to show (e.g. after
    // a reset or once a new generation clears the previous run), so it does not
    // pop back open by itself when the next run produces data.
    effect(() => {
      if (this.workflowSteps().length === 0 && this.toolCalls().length === 0) {
        this.showToolDetails.set(false);
      }
    });
  }

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected formatToolArgs(args: unknown): string {
    return formatToolArgsValue(args);
  }

  protected stepLabel(name: string): string {
    return readStepLabel(name, WORKFLOW_STEP_LABELS);
  }

  protected toolCallsFor(stepName: string): AgUiToolCall[] {
    return this.toolCallsByStep().get(stepName) ?? [];
  }
}
