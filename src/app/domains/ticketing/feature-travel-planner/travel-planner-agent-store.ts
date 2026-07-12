import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';

const AGENT_ID = 'travelPlannerAgent';

export function injectTravelPlannerAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [messageWidget, flightWidget, hotelWidget],
  });

  return injectAgentStore(AGENT_ID);
}
