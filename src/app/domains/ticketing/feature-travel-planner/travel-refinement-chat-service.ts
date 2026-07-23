import { effect, inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  addDeveloperMessage,
  reset,
} from '../../shared/util-copilotkit/agent-store-helper';
import { TravelPlan, TravelPlanStore } from './travel-plan-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { injectTravelRefinementAgentStore } from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  private readonly planStore = inject(TravelPlanStore);
  private readonly store = injectTravelRefinementAgentStore();

  private readonly syncSharedState = effect(() => {
    const state = this.store().state();
    if (isTravelPlan(state)) {
      this.planStore.setPlan(state);
    }
  });

  public init(): void {
    this.chatRegistry.setChat(
      this.store,
      'Do you want to refine your travel plan?',
      false,
    );
  }

  public reset(): void {
    reset(this.store);
    const preamble = buildPreferencePreamble(this.requestStore.preferences());
    if (preamble) {
      addDeveloperMessage(this.store, preamble);
    }
  }
}

function isTravelPlan(value: unknown): value is TravelPlan {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as TravelPlan).flights) &&
    Array.isArray((value as TravelPlan).hotels)
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
