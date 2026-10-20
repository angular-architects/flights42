/* eslint-disable @typescript-eslint/no-unused-vars */
import { computed, Injectable } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { sortHotelsByRoute } from './sort-hotels-by-route';
import { initialTravelPlan, type TravelPlan } from './travel-plan-model';
import { TRAVEL_REFINEMENT_AGENT_ID } from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelPlanStore {
  private readonly agentStore = injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);

  // TODO: Derive the plan from the agent's state
  //       (this.agentStore().state() as TravelPlan)
  public readonly plan = computed<TravelPlan>(() => initialTravelPlan);

  public readonly summary = computed(() => this.plan().summary);
  public readonly flights = computed(() => this.plan().flights);
  public readonly hotels = computed(() => this.plan().hotels);

  public setPlan(plan: TravelPlan): void {
    // In case the model mixed up the order
    const sortedHotels = sortHotelsByRoute(plan.hotels, plan.flights);

    // TODO: Write summary, flights and sortedHotels to the agent's state
    //       (this.agentStore().agent.setState)
  }

  public clear(): void {
    // TODO: Reset the agent's state to the initialTravelPlan
    //       (this.agentStore().agent.setState)
  }
}
