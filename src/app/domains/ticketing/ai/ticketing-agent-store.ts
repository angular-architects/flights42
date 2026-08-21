import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';
import { USE_ACTION_CARDS } from '@flights42/feature-flags';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
import { bookFlightActionCard } from './action-cards/book-flight-action-card';
import { cancelFlightActionCard } from './action-cards/cancel-flight-action-card';
import { TICKETING_AGENT_ID } from './agent-ids';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';

const widgets = [messageWidget, flightWidget, hotelWidget];

const actionCards = USE_ACTION_CARDS
  ? [bookFlightActionCard, cancelFlightActionCard]
  : [];

export function injectTicketingAgentStore() {
  initAgentStore({
    agentId: TICKETING_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(TICKETING_AGENT_ID),
    useServerMemory: true,
    frontendTools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
    ],
    toolCallRenderer: [...actionCards],
    components: widgets,
  });

  return injectAgentStore(TICKETING_AGENT_ID);
}
