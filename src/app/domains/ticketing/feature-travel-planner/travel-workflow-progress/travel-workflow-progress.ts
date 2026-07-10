import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { type Message } from '@copilotkit/angular';

import {
  buildPipeline,
  formatToolArgsValue,
  type PipelineStep,
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
  readonly flightsReady = input.required<boolean>();
  readonly hotelsReady = input.required<boolean>();
  readonly hasWidgets = input.required<boolean>();

  protected readonly toolCalls = computed<WorkflowToolCall[]>(() =>
    selectVisibleToolCalls(this.messages()),
  );

  protected readonly stepPipeline = computed<PipelineStep[]>(() =>
    buildPipeline(
      this.flightsReady(),
      this.hotelsReady(),
      this.loading(),
      this.hasWidgets(),
    ),
  );

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
