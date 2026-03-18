import { inject, Injectable } from '@angular/core';
import { uiChatResource } from '@hashbrownai/angular';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { systemExtended } from './system-prompt';
import { displayFlightDetail } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getBookedFlights } from './tools/get-booked-flights.tool';
import { getCurrentBasket } from './tools/get-current-basket.tool';
import { getCurrentFlight } from './tools/get-current-flight.tool';
import { getCurrentRoute } from './tools/get-current-route.tool';
import { getLoadedFlights } from './tools/get-loaded-flights.tool';
import { toggleFlightSelection } from './tools/toggle-flight-selection.tool';
import { updateFlight } from './tools/update-flight.tool';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private config = inject(ConfigService);
  private chatStore = inject(ChatRegistry);

  private readonly chat = uiChatResource({
    model: this.config.model,
    system: systemExtended,
    tools: [
      findFlightsTool,
      getLoadedFlights,
      toggleFlightSelection,
      getCurrentBasket,
      displayFlightDetail,
      // showBookedFlights,
      getBookedFlights,
      updateFlight,
      getCurrentRoute,
      getCurrentFlight,
    ],
    components: [messageWidget],
  });

  public init(): void {
    this.chatStore.setChat(this.chat);
  }
}
