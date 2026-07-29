import { effect, inject, Injectable } from '@angular/core';
import { injectInterrupt } from '@copilotkit/angular';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  addDeveloperMessage,
  reset,
} from '../../shared/util-copilotkit/agent-store-helper';
import { isTravelPlan, TravelPlanStore } from './travel-plan-store';
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
      if (isTravelPlan(state)) {
        this.planStore.setPlan(state);
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
