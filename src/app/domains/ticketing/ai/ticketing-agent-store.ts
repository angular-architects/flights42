import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';

export const TICKETING_AGENT_ID = 'ticketingAgent';

export function injectTicketingAgentStore() {
  initAgentStore({
    agentId: TICKETING_AGENT_ID,
    url: inject(ConfigService).agUiUrl,
    useServerMemory: true,
    frontendTools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
      messageWidget,
      flightWidget,
    ],
  });

  return injectAgentStore(TICKETING_AGENT_ID);
}
