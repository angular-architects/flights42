import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  type PipelineStep,
  selectVisibleToolCalls,
  selectWorkflowSteps,
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

  protected readonly workflowSteps = computed<AgUiWorkflowStep[]>(() =>
    selectWorkflowSteps(this.messages()),
  );

  protected readonly stepPipeline = computed<PipelineStep[]>(() =>
    buildPipeline(this.workflowSteps(), this.loading(), this.widgetCount() > 0),
  );

  protected readonly canToggleDetails = computed(
    () => this.toolCalls().length > 0,
  );

  protected readonly showToolDetails = signal(false);

  protected toggleToolDetails(): void {
    this.showToolDetails.update((value) => !value);
  }

  protected formatToolArgs(args: unknown): string | null {
    return formatToolArgsValue(args);
  }
}
