import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../../shared/util-common/config-service';
import { FlightInfo } from '../../data/flight-info';
import { FlightWidget, flightWidget } from '../widgets/flight-widget';
import { HotelWidget, hotelWidget } from '../widgets/hotel-widget';
import { type PlanHotel, TravelPlanStore } from './travel-plan-store';
import { TravelRefinementChatService } from './travel-refinement-chat-service';

const DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
] as const;

const WORKFLOW_STEP_LABELS: Record<string, string> = {
  findFlights: 'Flights',
  findHotels: 'Hotels',
  finalize: 'Travel Plan',
};

const PIPELINE_STEPS = [
  { id: 'findFlights', label: 'Flights' },
  { id: 'findHotels', label: 'Hotels' },
  { id: '_plan', label: 'Travel Plan' },
] as const;

type PipelineStepState = 'upcoming' | 'active' | 'done';

interface PipelineStep {
  id: string;
  label: string;
  state: PipelineStepState;
}

@Component({
  selector: 'app-travel-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FlightWidget, HotelWidget],
  templateUrl: './travel-planner-page.html',
  styleUrl: './travel-planner-page.css',
})
export class TravelPlannerPage {
  private readonly config = inject(ConfigService);

  private readonly fb = inject(FormBuilder);

  private readonly refinementChat = inject(TravelRefinementChatService);

  private readonly chatRegistry = inject(ChatRegistry);

  protected readonly planStore = inject(TravelPlanStore);

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

  protected readonly stepPipeline = computed<PipelineStep[]>(() =>
    buildPipeline(
      this.workflowSteps(),
      this.chat.isLoading(),
      this.widgets().length > 0,
    ),
  );

  protected readonly showToolDetails = signal(false);

  /** True between starting a generation and syncing its result into the store. */
  private readonly awaitingPlan = signal(false);

  constructor() {
    // Register the refinement chat so the global assistant panel talks to the
    // travelRefinementAgent while this page is active.
    this.refinementChat.init();

    // When a generation finishes, copy the produced flights/hotels into the
    // plan store (single source of truth) and open the refinement chat.
    effect(() => {
      const loading = this.chat.isLoading();
      if (loading || !this.awaitingPlan()) {
        return;
      }

      const flights = this.flightWidgets()
        .map((widget) => widget.props['flight'] as FlightInfo | undefined)
        .filter((flight): flight is FlightInfo => !!flight);
      const hotels = this.hotelWidgets()
        .map((widget) => widget.props['hotel'] as PlanHotel | undefined)
        .filter((hotel): hotel is PlanHotel => !!hotel);

      if (flights.length === 0 && hotels.length === 0) {
        // Nothing was generated (e.g. an error) — stay ready for a retry.
        this.awaitingPlan.set(false);
        return;
      }

      const summary =
        (this.messageWidgets()[0]?.props['text'] as string | undefined) ?? '';

      this.planStore.setPlan({ summary, flights, hotels });
      this.awaitingPlan.set(false);
      this.chatRegistry.requestOpen();
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.chat.isLoading()) {
      return;
    }

    this.chat.reset();
    this.planStore.clear();
    this.awaitingPlan.set(true);
    this.showToolDetails.set(false);

    const { from, to, duration, preferences } = this.form.getRawValue();
    const trimmedPreferences = preferences.trim();
    const preferenceText = trimmedPreferences
      ? ` Traveler preferences: ${trimmedPreferences}.`
      : '';

    // Always request a travel start of today + 10 days (ISO date without time).
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10);
    const startDateIso = startDate.toISOString().slice(0, 10);

    const content =
      `Please plan a package tour from ${from} to ${to} ` +
      `for ${duration} ${duration === 1 ? 'day' : 'days'} ` +
      `starting on ${startDateIso}.` +
      preferenceText;

    this.chat.sendMessage({ role: 'user', content });
  }

  protected reset(): void {
    this.chat.reset();
    this.planStore.clear();
    this.awaitingPlan.set(false);
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

function buildPipeline(
  steps: AgUiWorkflowStep[],
  isLoading: boolean,
  hasWidgets: boolean,
): PipelineStep[] {
  const statusMap = new Map<string, string>();
  for (const step of steps) {
    statusMap.set(step.name, step.status);
  }

  const sequentialIds = ['findFlights', 'findHotels'];
  const allSequentialDone = sequentialIds.every(
    (id) => statusMap.get(id) === 'complete',
  );
  const firstIncomplete = sequentialIds.find(
    (id) => statusMap.get(id) !== 'complete',
  );
  const finalizeStarted =
    statusMap.has('finalize') || (allSequentialDone && isLoading);

  return PIPELINE_STEPS.map(({ id, label }) => {
    if (id === '_plan') {
      if (!isLoading && hasWidgets) return { id, label, state: 'done' };
      if (finalizeStarted) return { id, label, state: 'active' };
      return { id, label, state: 'upcoming' };
    }
    const status = statusMap.get(id);
    if (status === 'complete') return { id, label, state: 'done' };
    if (status === 'pending') return { id, label, state: 'active' };
    if (isLoading && id === firstIncomplete)
      return { id, label, state: 'active' };
    return { id, label, state: 'upcoming' };
  });
}
