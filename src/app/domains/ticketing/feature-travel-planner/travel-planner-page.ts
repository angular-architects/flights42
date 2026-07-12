import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CopilotKit, type Message } from '@copilotkit/angular';
import { addDays, format } from 'date-fns';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { featureFlags } from '../../shared/util-common/feature-flags';
import { injectAgentStepTracker } from '../../shared/util-copilotkit/agent-step-tracker';
import {
  reset,
  sendMessage,
  stop as stopRun,
} from '../../shared/util-copilotkit/agent-store-helper';
import { FlightInfo } from '../data/flight-info';
import { FlightStore } from '../data/flight-store';
import { HotelInfo } from '../data/hotel-info';
import { FlightCard } from '../ui/flight-card/flight-card';
import { HotelCard } from '../ui/hotel-card';
import { TravelPlanStore } from './travel-plan-store';
import { injectTravelPlannerAgentStore } from './travel-planner-agent-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { TravelRefinementChatService } from './travel-refinement-chat-service';
import { TravelWorkflowProgress } from './travel-workflow-progress/travel-workflow-progress';

const DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
] as const;

interface ShownComponent {
  name: string;
  props: Record<string, unknown>;
}

@Component({
  selector: 'app-travel-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FlightCard, HotelCard, TravelWorkflowProgress],
  templateUrl: './travel-planner-page.html',
  styleUrl: './travel-planner-page.css',
})
export class TravelPlannerPage {
  private readonly fb = inject(FormBuilder);

  private readonly refinementChat = inject(TravelRefinementChatService);

  private readonly chatRegistry = inject(ChatRegistry);

  protected readonly planStore = inject(TravelPlanStore);

  protected readonly flightStore = inject(FlightStore);

  private readonly requestStore = inject(TravelPlannerRequestStore);

  protected readonly chat = injectTravelPlannerAgentStore();

  private readonly copilotKit = inject(CopilotKit);

  protected readonly durations = DURATION_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    from: [this.requestStore.from(), Validators.required],
    to: [this.requestStore.to(), Validators.required],
    duration: [this.requestStore.duration(), Validators.required],
    preferences: [this.requestStore.preferences()],
  });

  private readonly shownComponents = computed<ShownComponent[]>(() =>
    collectShownComponents(this.chat().messages()),
  );

  protected readonly flightWidgets = computed(() =>
    selectByName(this.shownComponents(), 'flightWidget'),
  );

  protected readonly hotelWidgets = computed(() =>
    selectByName(this.shownComponents(), 'hotelWidget'),
  );

  protected readonly messageWidgets = computed(() =>
    selectByName(this.shownComponents(), 'messageWidget'),
  );

  protected readonly widgetCount = computed(
    () => this.flightWidgets().length + this.hotelWidgets().length,
  );

  protected readonly stepTracker = injectAgentStepTracker(this.chat);

  protected readonly errorMessage = computed<string | null>(() => null);

  /** True between starting a generation and syncing its result into the store. */
  private readonly awaitingPlan = signal(false);

  constructor() {
    // Register the refinement chat so the global assistant panel talks to the
    // travelRefinementAgent while this page is active.
    this.refinementChat.init();

    // When a generation finishes, copy the produced flights/hotels into the
    // plan store (single source of truth) and open the refinement chat.
    effect(() => this.syncGeneratedPlan());
  }

  private syncGeneratedPlan(): void {
    const loading = this.chat().isRunning();
    if (loading || !this.awaitingPlan()) {
      return;
    }

    const flights = this.flightWidgets()
      .map((widget) => widget.props['flight'] as FlightInfo | undefined)
      .filter((flight): flight is FlightInfo => !!flight);
    const hotels = this.hotelWidgets()
      .map((widget) => widget.props['hotel'] as HotelInfo | undefined)
      .filter((hotel): hotel is HotelInfo => !!hotel);

    if (flights.length === 0 && hotels.length === 0) {
      // Nothing was generated (e.g. an error) — stay ready for a retry.
      this.awaitingPlan.set(false);
      return;
    }

    const summary =
      (this.messageWidgets()[0]?.props['text'] as string | undefined) ?? '';

    this.planStore.setPlan({ summary, flights, hotels });
    this.awaitingPlan.set(false);
    if (featureFlags.autoOpenRefinementChat) {
      this.chatRegistry.requestOpen();
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.chat().isRunning()) {
      return;
    }

    reset(this.chat);
    this.stepTracker.reset();
    this.planStore.clear();
    this.awaitingPlan.set(true);

    // Persist the request as the single source of truth; the refinement chat
    // reads the preferences from there.
    this.requestStore.setRequest(this.form.getRawValue());
    const from = this.requestStore.from();
    const to = this.requestStore.to();
    const duration = this.requestStore.duration();
    const trimmedPreferences = this.requestStore.preferences();

    const preferenceText = trimmedPreferences
      ? ` Traveler preferences: ${trimmedPreferences}.`
      : '';

    // Start a fresh refinement session, so it picks up the new plan and
    // preferences once the user starts refining.
    this.refinementChat.reset();

    // Travel starts today + 10 days. We compute the concrete outbound and return
    // dates here (deterministically) and pass both into the prompt, so the agent
    // does not have to derive the schedule from the duration.
    const startDate = addDays(new Date(), 10);
    const startDateIso = trimTime(startDate);

    const endDate = addDays(startDate, duration - 1);
    const endDateIso = trimTime(endDate);

    const nights = duration - 1;
    const content =
      `Please plan a package tour from ${from} to ${to}. ` +
      `The outbound flight is on ${startDateIso} and the final return flight is on ` +
      `${endDateIso} (${duration} ${duration === 1 ? 'day' : 'days'}, ` +
      `${nights} ${nights === 1 ? 'night' : 'nights'}).` +
      preferenceText;

    void sendMessage(this.copilotKit, this.chat, content);
  }

  protected stop(): void {
    stopRun(this.chat);
  }
}

/** Drops the time component and returns the calendar date as `yyyy-MM-dd`. */
function trimTime(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

const WIDGET_TOOL_NAMES = ['flightWidget', 'hotelWidget', 'messageWidget'];

/**
 * Extracts the widgets the agent rendered via the per-widget tools (each tool's
 * arguments ARE the widget props). Reads the tool result when available, falling
 * back to the (identical) call arguments while the run is still in progress.
 */
function collectShownComponents(
  messages: readonly Message[],
): ShownComponent[] {
  const results = new Map<string, string>();
  for (const message of messages) {
    if (message.role === 'tool') {
      results.set(message.toolCallId, message.content);
    }
  }

  const components: ShownComponent[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.toolCalls) {
      continue;
    }
    for (const toolCall of message.toolCalls) {
      const name = toolCall.function.name;
      if (!WIDGET_TOOL_NAMES.includes(name)) {
        continue;
      }
      const raw = results.get(toolCall.id) ?? toolCall.function.arguments;
      const props = safeParseJson(raw);
      if (props && typeof props === 'object') {
        components.push({ name, props: props as Record<string, unknown> });
      }
    }
  }
  return components;
}

function selectByName(
  components: ShownComponent[],
  name: string,
): ShownComponent[] {
  return components.filter((component) => component.name === name);
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
