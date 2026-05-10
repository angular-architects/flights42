import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  type AgUiChatMessage,
  agUiResource,
  type AgUiToolCall,
  type AgUiWidgetInstance,
  type AgUiWorkflowStep,
  createShowComponentsTool,
  WidgetContainerComponent,
} from '@internal/ag-ui-client';

import { messageWidget } from '../../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../../shared/util-common/config-service';
import { flightWidget } from '../widgets/flight-widget';
import { hotelWidget } from '../widgets/hotel-widget';

const DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
] as const;

const WORKFLOW_STEP_LABELS: Record<string, string> = {
  findOutboundFlights: 'Searching outbound flights',
  findReturnFlights: 'Searching return flights',
  findHotels: 'Searching hotels',
  evaluateHotels: 'Evaluating hotels',
  hotelMatchState: 'Matching hotel found',
  hotelFallbackState: 'No matching hotel — travel agency takes over',
  finalize: 'Finalizing result',
  showComponents: 'Rendering UI',
};

@Component({
  selector: 'app-travel-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, WidgetContainerComponent],
  templateUrl: './travel-planner-page.html',
  styleUrl: './travel-planner-page.css',
})
export class TravelPlannerPage {
  private readonly config = inject(ConfigService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly durations = DURATION_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    from: ['Graz', Validators.required],
    to: ['Rome', Validators.required],
    duration: [3, Validators.required],
    preferences: [''],
  });

  protected readonly chat = agUiResource({
    url: `${this.config.aiServerUrl}/ag-ui/travelPlannerAgent`,
    model: this.config.model,
    useServerMemory: false,
    tools: [
      createShowComponentsTool([messageWidget, flightWidget, hotelWidget]),
    ],
  });

  protected readonly widgets = computed(() =>
    selectAssistantWidgets(this.chat.value()),
  );

  protected readonly messageWidgets = computed(() =>
    selectWidgetsByName(this.widgets(), 'messageWidget'),
  );

  protected readonly flightWidgets = computed(() =>
    selectWidgetsByName(this.widgets(), 'flightWidget'),
  );

  protected readonly hotelWidgets = computed(() =>
    selectWidgetsByName(this.widgets(), 'hotelWidget'),
  );

  protected readonly otherWidgets = computed(() =>
    selectOtherWidgets(this.widgets()),
  );

  protected readonly errorMessage = computed<string | null>(() =>
    readErrorMessage(this.chat.value()),
  );

  protected readonly toolCalls = computed<AgUiToolCall[]>(() =>
    selectVisibleToolCalls(this.chat.value()),
  );

  /**
   * Tool calls that don't belong to any workflow step (top-level agent calls
   * like the `workflow-*` wrapper around the workflow itself). Surfaced as a
   * small extra section below the step timeline so they aren't lost.
   */
  protected readonly topLevelToolCalls = computed<AgUiToolCall[]>(() =>
    selectTopLevelToolCalls(this.toolCalls()),
  );

  protected readonly workflowSteps = computed<AgUiWorkflowStep[]>(() =>
    selectWorkflowSteps(this.chat.value()),
  );

  protected readonly toolCallsByStep = computed<Map<string, AgUiToolCall[]>>(
    () => groupToolCallsByStep(this.toolCalls()),
  );

  protected readonly currentWorkflowStep = computed<string | null>(() => {
    return readCurrentWorkflowStep(this.workflowSteps(), WORKFLOW_STEP_LABELS);
  });

  protected readonly currentStatus = computed<string>(() => {
    return readCurrentStatus(
      this.currentWorkflowStep(),
      this.chat.isLoading(),
      this.widgets().length,
    );
  });

  protected readonly showToolDetails = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.chat.destroy());
  }

  protected submit(): void {
    if (this.form.invalid || this.chat.isLoading()) {
      return;
    }

    this.chat.reset();
    this.showToolDetails.set(false);

    const { from, to, duration, preferences } = this.form.getRawValue();
    const trimmedPreferences = preferences.trim();
    const preferenceText = trimmedPreferences
      ? ` Traveler preferences: ${trimmedPreferences}.`
      : '';

    const content =
      `Please plan a package tour from ${from} to ${to} ` +
      `for ${duration} ${duration === 1 ? 'day' : 'days'} starting next week.` +
      preferenceText;

    this.chat.sendMessage({ role: 'user', content });
  }

  protected reset(): void {
    this.chat.reset();
    this.showToolDetails.set(false);
  }

  protected stop(): void {
    this.chat.stop();
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

  protected hasWorkflowSteps(): boolean {
    return this.workflowSteps().length > 0;
  }

  protected toolCallsFor(stepName: string): AgUiToolCall[] {
    return this.toolCallsByStep().get(stepName) ?? [];
  }
}

function selectAssistantWidgets(
  messages: AgUiChatMessage[],
): AgUiWidgetInstance[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.widgets);
}

function selectWidgetsByName(
  widgets: AgUiWidgetInstance[],
  name: string,
): AgUiWidgetInstance[] {
  return widgets.filter((widget) => widget.name === name);
}

function selectOtherWidgets(
  widgets: AgUiWidgetInstance[],
): AgUiWidgetInstance[] {
  const known = new Set(['messageWidget', 'flightWidget', 'hotelWidget']);
  return widgets.filter((widget) => !known.has(widget.name));
}

function readErrorMessage(messages: AgUiChatMessage[]): string | null {
  const error = messages.find((message) => message.role === 'error');
  return error?.content ?? null;
}

function selectVisibleToolCalls(messages: AgUiChatMessage[]): AgUiToolCall[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.toolCalls)
    .filter((toolCall) => toolCall.name !== 'showComponents');
}

function selectTopLevelToolCalls(toolCalls: AgUiToolCall[]): AgUiToolCall[] {
  return toolCalls.filter(
    (toolCall) => !toolCall.stepName && !toolCall.name.startsWith('workflow-'),
  );
}

function selectWorkflowSteps(messages: AgUiChatMessage[]): AgUiWorkflowStep[] {
  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) => message.workflowSteps);
}

function groupToolCallsByStep(
  toolCalls: AgUiToolCall[],
): Map<string, AgUiToolCall[]> {
  const map = new Map<string, AgUiToolCall[]>();
  for (const toolCall of toolCalls) {
    const key = toolCall.stepName;
    if (!key) {
      continue;
    }
    const list = map.get(key);
    if (list) {
      list.push(toolCall);
    } else {
      map.set(key, [toolCall]);
    }
  }
  return map;
}

function readCurrentWorkflowStep(
  steps: AgUiWorkflowStep[],
  labels: Record<string, string>,
): string | null {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.status === 'pending') {
      return labels[step.name] ?? step.name;
    }
  }
  return null;
}

function readCurrentStatus(
  currentWorkflowStep: string | null,
  isLoading: boolean,
  widgetCount: number,
): string {
  if (currentWorkflowStep) {
    return currentWorkflowStep;
  }
  if (isLoading) {
    return 'Building travel plan';
  }
  if (widgetCount > 0) {
    return 'Done';
  }
  return 'Ready';
}

function formatToolArgsValue(args: unknown): string {
  if (args === undefined || args === null) {
    return '';
  }
  if (typeof args === 'string') {
    return args;
  }
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function readStepLabel(name: string, labels: Record<string, string>): string {
  return labels[name] ?? name;
}
