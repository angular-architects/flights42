import { effect, inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { deepEqual } from '../../shared/util-common/deep-equal';
import {
  addDeveloperMessage,
  reset,
} from '../../shared/util-copilotkit/agent-store-helper';
import { travelPlanSchema, TravelPlanStore } from './travel-plan-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { injectTravelRefinementAgentStore } from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  private readonly planStore = inject(TravelPlanStore);
  private readonly agentStore = injectTravelRefinementAgentStore();

  constructor() {
    effect(() => {
      const result = travelPlanSchema.safeParse(this.agentStore().state());
      if (result.success) {
        this.planStore.setPlan(result.data);
      }
    });

    effect(() => {
      const plan = this.planStore.plan();
      const agent = this.agentStore().agent;
      if (!deepEqual(agent.state, plan)) {
        agent.setState(plan);
      }
    });
  }

  public init(): void {
    this.chatRegistry.setChat({
      store: this.agentStore,
      greeting: 'Do you want to refine your travel plan?',
      showModeSelector: false,
    });
  }

  public reset(): void {
    reset(this.agentStore);
    const preamble = buildPreferencePreamble(this.requestStore.preferences());
    if (preamble) {
      addDeveloperMessage(this.agentStore, preamble);
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
