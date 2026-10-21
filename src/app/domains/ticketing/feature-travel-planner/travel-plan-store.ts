import { computed, Injectable } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { sortHotelsByRoute } from './sort-hotels-by-route';
import { initialTravelPlan, type TravelPlan } from './travel-plan-model';
import { TRAVEL_REFINEMENT_AGENT_ID } from './travel-refinement-agent-store';

@Injectable({ providedIn: 'root' })
export class TravelPlanStore {
  private readonly agentStore = injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);

  public readonly plan = computed(
    () => this.agentStore().state() as TravelPlan,
  );

  public readonly summary = computed(() => this.plan().summary);
  public readonly flights = computed(() => this.plan().flights);
  public readonly hotels = computed(() => this.plan().hotels);

  public setPlan(plan: TravelPlan): void {
    // In case the model mixed up the order
    const sortedHotels = sortHotelsByRoute(plan.hotels, plan.flights);

    this.agentStore().agent.setState({
      summary: plan.summary,
      flights: plan.flights,
      hotels: sortedHotels,
    });
  }

  public clear(): void {
    this.agentStore().agent.setState(initialTravelPlan);
  }
}
