import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { type Message } from '@copilotkit/angular';

import { readBackgroundTaskProgress } from '../../../shared/util-copilotkit/activity/background-task';
import { injectWidgetToolNames } from '../../../shared/util-copilotkit/widget-tool-names';
import {
  buildPipeline,
  formatToolArgsValue,
  type PipelineStep,
  selectBackgroundTask,
  selectServiceCalls,
  selectVisibleToolCalls,
  type WorkflowToolCall,
} from './travel-workflow-progress.helpers';

/**
 * Renders the workflow step tracker and the tool-call history behind the
 * "More" button. The pipeline is derived from which widgets have appeared plus
 * the run state (see `buildPipeline`), so the page passes the raw messages,
 * loading state, and per-widget readiness flags.
 */
@Component({
  selector: 'app-travel-workflow-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './travel-workflow-progress.html',
  styleUrl: './travel-workflow-progress.css',
})
export class TravelWorkflowProgress {
  readonly messages = input.required<Message[]>();
  readonly loading = input.required<boolean>();
  readonly hasWidgets = input.required<boolean>();

  private readonly widgetToolNames = injectWidgetToolNames();

  private readonly progress = computed(() =>
    readBackgroundTaskProgress(selectBackgroundTask(this.messages())),
  );

  protected readonly toolCalls = computed<WorkflowToolCall[]>(() => [
    ...selectVisibleToolCalls(this.messages(), this.widgetToolNames()),
    ...selectServiceCalls(this.progress()),
  ]);

  protected readonly stepPipeline = computed<PipelineStep[]>(() => {
    const progress = this.progress();
    return buildPipeline(
      progress.startedSteps,
      progress.finishedSteps,
      this.loading(),
    );
  });

  protected readonly showTracker = computed(
    () => this.loading() || this.hasWidgets() || this.toolCalls().length > 0,
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
