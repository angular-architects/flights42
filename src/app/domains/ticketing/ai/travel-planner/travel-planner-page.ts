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
  type AgUiWidgetInstance,
  createShowComponentsTool,
} from '@internal/ag-ui-client';
import { addDays, format } from 'date-fns';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../../shared/util-common/config-service';
import { featureFlags } from '../../../shared/util-common/feature-flags';
import { FlightInfo } from '../../data/flight-info';
import { FlightWidget, flightWidget } from '../widgets/flight-widget';
import { HotelWidget, hotelWidget } from '../widgets/hotel-widget';
import { type PlanHotel, TravelPlanStore } from './travel-plan-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { TravelRefinementChatService } from './travel-refinement-chat-service';
import { TravelWorkflowProgress } from './travel-workflow-progress/travel-workflow-progress';

const DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
] as const;

@Component({
  selector: 'app-travel-planner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FlightWidget,
    HotelWidget,
    TravelWorkflowProgress,
  ],
  templateUrl: './travel-planner-page.html',
  styleUrl: './travel-planner-page.css',
})
export class TravelPlannerPage {
  private readonly config = inject(ConfigService);

  private readonly fb = inject(FormBuilder);

  private readonly refinementChat = inject(TravelRefinementChatService);

  private readonly chatRegistry = inject(ChatRegistry);

  protected readonly planStore = inject(TravelPlanStore);

  private readonly requestStore = inject(TravelPlannerRequestStore);

  protected readonly durations = DURATION_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    from: [this.requestStore.from(), Validators.required],
    to: [this.requestStore.to(), Validators.required],
    duration: [this.requestStore.duration(), Validators.required],
    preferences: [this.requestStore.preferences()],
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

  /**
   * Once a generation finishes, copies the produced flights/hotels into the
   * plan store (single source of truth) and opens the refinement chat.
   */
  private syncGeneratedPlan(): void {
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
    if (featureFlags.autoOpenRefinementChat) {
      this.chatRegistry.requestOpen();
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.chat.isLoading()) {
      return;
    }

    this.chat.reset();
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

    this.chat.sendMessage({ role: 'user', content });
  }

  protected stop(): void {
    this.chat.stop();
  }
}

/** Drops the time component and returns the calendar date as `yyyy-MM-dd`. */
function trimTime(date: Date): string {
  return format(date, 'yyyy-MM-dd');
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
