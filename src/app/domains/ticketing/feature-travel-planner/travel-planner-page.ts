import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CopilotKit } from '@copilotkit/angular';
import { addDays, format } from 'date-fns';
import { z } from 'zod';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { featureFlags } from '../../shared/util-common/feature-flags';
import { type BackgroundTaskContent } from '../../shared/util-copilotkit/activity/background-task';
import {
  reset,
  sendMessage,
  stop as stopRun,
} from '../../shared/util-copilotkit/agent-store-helper';
import { FlightStore } from '../data/flight-store';
import { FlightCard } from '../ui/flight-card/flight-card';
import { HotelCard } from '../ui/hotel-card';
import { type TravelPlan } from './travel-plan-model';
import { TravelPlanStore } from './travel-plan-store';
import { injectTravelPlannerAgentStore } from './travel-planner-agent-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { TravelRefinementChatService } from './travel-refinement-chat-service';
import { TravelWorkflowProgress } from './travel-workflow-progress/travel-workflow-progress';
import { selectBackgroundTask } from './travel-workflow-progress/travel-workflow-progress.helpers';

const DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
] as const;

const generatedPlanSchema = z.object({
  result: z.object({
    summary: z.string(),
    flights: z.array(
      z.object({
        id: z.number(),
        from: z.string(),
        to: z.string(),
        date: z.string(),
        delay: z.number(),
      }),
    ),
    hotels: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        stars: z.number(),
        imageUrl: z.string(),
        city: z.string(),
      }),
    ),
  }),
});

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

  private readonly generatedPlan = computed(() =>
    readGeneratedPlan(selectBackgroundTask(this.chat().messages())),
  );

  protected readonly hasPlan = computed(() => !!this.generatedPlan());

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

    const plan = this.generatedPlan();
    if (!plan) {
      return;
    }

    this.planStore.setPlan(plan);
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

function readGeneratedPlan(
  task: BackgroundTaskContent | undefined,
): TravelPlan | undefined {
  if (task?.status !== 'completed') {
    return undefined;
  }
  return generatedPlanSchema.safeParse(task.result).data?.result;
}
