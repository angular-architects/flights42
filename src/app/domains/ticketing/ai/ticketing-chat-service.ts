import { inject, Injectable } from '@angular/core';

import { agUiResource } from '../../shared/ui-agent/ag-ui-resource';
import { createShowComponentTool } from '../../shared/ui-agent/tools/show-component.tool';
import { messageWidgetComponent } from '../../shared/ui-agent/widgets/message-widget';
import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { ConfigService } from '../../shared/util-common/config-service';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';
import { flightWidgetComponent } from './widgets/flight-widget';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);

  private readonly chat = agUiResource({
    url: this.config.agUiUrl,
    model: this.config.model,
    tools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
      createShowComponentTool([messageWidgetComponent, flightWidgetComponent]),
    ],
  });

  public init(): void {
    this.chatStore.setChat(this.chat);
  }
}
