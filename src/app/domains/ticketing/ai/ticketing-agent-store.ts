import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { destinationInfoCard } from '../ui/destination-info-card';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
import { a2uiEventContract } from './actions/a2ui-event-contract';
import { TICKETING_AGENT_ID } from './agent-ids';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';
import { planHandoffCard } from './widgets/plan-widget';

const widgets = [messageWidget, flightWidget, hotelWidget];

export function injectTicketingAgentStore() {
  initAgentStore({
    agentId: TICKETING_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(TICKETING_AGENT_ID),
    useServerMemory: true,
    context: [a2uiEventContract],
    frontendTools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
      ...widgets,
    ],
    // TODO: Add the action cards for bookFlight and cancelFlight
    //       to the toolCallRenderer list
    toolCallRenderer: [planHandoffCard],
    components: [destinationInfoCard],
  });

  return injectAgentStore(TICKETING_AGENT_ID);
}
