import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
import { TravelPlanStore } from './travel-plan-store';

export const TRAVEL_REFINEMENT_AGENT_ID = 'travelRefinementAgent';

const widgets = [messageWidget, flightWidget, hotelWidget];

export function injectTravelRefinementAgentStore() {
  const planStore = inject(TravelPlanStore);

  initAgentStore({
    agentId: TRAVEL_REFINEMENT_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(TRAVEL_REFINEMENT_AGENT_ID),
    useServerMemory: true,
    state: () => planStore.plan(),
    frontendTools: [...widgets],
  });

  return injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);
}
