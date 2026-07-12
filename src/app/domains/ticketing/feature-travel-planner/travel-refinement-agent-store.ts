import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
import { addFlightToPlanTool } from './ai-tools/add-flight-to-plan.tool';
import { addHotelToPlanTool } from './ai-tools/add-hotel-to-plan.tool';
import { getTravelPlanTool } from './ai-tools/get-travel-plan.tool';
import { removeFlightFromPlanTool } from './ai-tools/remove-flight-from-plan.tool';
import { removeHotelFromPlanTool } from './ai-tools/remove-hotel-from-plan.tool';
import { replaceFlightInPlanTool } from './ai-tools/replace-flight-in-plan.tool';
import { setTravelPlanTool } from './ai-tools/set-travel-plan.tool';

const AGENT_ID = 'travelRefinementAgent';

const widgets = [messageWidget, flightWidget, hotelWidget];

export function injectTravelRefinementAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    useServerMemory: true,
    frontendTools: [
      getTravelPlanTool,
      setTravelPlanTool,
      addFlightToPlanTool,
      removeFlightFromPlanTool,
      replaceFlightInPlanTool,
      addHotelToPlanTool,
      removeHotelFromPlanTool,
      ...widgets,
    ],
  });

  return injectAgentStore(AGENT_ID);
}
