import { inject } from '@angular/core';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';

export const TRAVEL_PLANNER_AGENT_ID = 'travelPlannerAgent';

export const TravelPlannerAgentStore = agentStore({
  agentId: TRAVEL_PLANNER_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(TRAVEL_PLANNER_AGENT_ID),
  model: () => inject(ConfigService).model,
  frontendTools: [messageWidget, flightWidget, hotelWidget],
});
