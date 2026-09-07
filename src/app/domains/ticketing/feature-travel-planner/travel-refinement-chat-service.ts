import { effect, inject, Injectable } from '@angular/core';
import { injectInterrupt } from '@copilotkit/angular';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  addDeveloperMessage,
  reset,
} from '../../shared/util-copilotkit/agent-store-helper';
import { type TravelPlan, TravelPlanStore } from './travel-plan-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import {
  injectTravelRefinementAgentStore,
  TRAVEL_REFINEMENT_AGENT_ID,
} from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  private readonly planStore = inject(TravelPlanStore);
  private readonly store = injectTravelRefinementAgentStore();
  private readonly interrupts = injectInterrupt({
    agentId: TRAVEL_REFINEMENT_AGENT_ID,
  });

  constructor() {
    effect(() => {
      const state = this.store().state();
      if (isCompletePlan(state)) {
        this.planStore.setPlan(state);
      }
    });

    effect(() => {
      const plan = this.planStore.plan();
      const agent = this.store().agent;
      if (JSON.stringify(agent.state) !== JSON.stringify(plan)) {
        agent.setState(plan);
      }
    });
  }

  public init(): void {
    this.chatRegistry.setChat({
      store: this.store,
      interrupts: this.interrupts,
      greeting: 'Do you want to refine your travel plan?',
      showModeSelector: false,
    });
  }

  public reset(): void {
    reset(this.store);
    const preamble = buildPreferencePreamble(this.requestStore.preferences());
    if (preamble) {
      addDeveloperMessage(this.store, preamble);
    }
  }
}

function isCompletePlan(state: unknown): state is TravelPlan {
  if (!state || typeof state !== 'object') {
    return false;
  }
  const { flights, hotels } = state as Partial<TravelPlan>;
  return (
    Array.isArray(flights) &&
    Array.isArray(hotels) &&
    flights.every(
      (flight) =>
        typeof flight.id === 'number' &&
        typeof flight.from === 'string' &&
        typeof flight.to === 'string' &&
        typeof flight.delay === 'number' &&
        !Number.isNaN(Date.parse(flight.date)),
    ) &&
    hotels.every(
      (hotel) =>
        typeof hotel.id === 'string' &&
        typeof hotel.name === 'string' &&
        typeof hotel.city === 'string' &&
        typeof hotel.stars === 'number',
    )
  );
}

function buildPreferencePreamble(preferences: string): string | undefined {
  const trimmed = preferences.trim();
  if (!trimmed) {
    return undefined;
  }
  return (
    `For context, the traveler's original preferences for this trip are: ` +
    `"${trimmed}". Keep honoring them while refining the plan unless I ` +
    `explicitly ask to change them.`
  );
}
