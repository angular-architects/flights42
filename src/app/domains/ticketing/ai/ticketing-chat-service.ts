import { inject, Injectable } from '@angular/core';

import { agUiResource } from '../../shared/ui-agent/ag-ui-resource';
import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidgetComponent } from '../../shared/ui-assistant/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import {
  createDisplayFlightDetailTool,
  createFindFlightsTool,
  createGetCurrentBasketTool,
  createGetLoadedFlightsTool,
  createShowComponentTool,
  createToggleFlightSelectionTool,
} from './tools';
import { flightWidgetComponent } from './widgets/flight-widget';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly findFlightsTool = createFindFlightsTool();
  private readonly getLoadedFlightsTool = createGetLoadedFlightsTool();
  private readonly toggleFlightSelectionTool =
    createToggleFlightSelectionTool();
  private readonly getCurrentBasketTool = createGetCurrentBasketTool();
  private readonly displayFlightDetailTool = createDisplayFlightDetailTool();
  private readonly showComponentTool = createShowComponentTool();

  private readonly chat = agUiResource({
    url: this.config.agUiUrl,
    model: this.config.model,
    tools: [
      this.findFlightsTool,
      this.getLoadedFlightsTool,
      this.toggleFlightSelectionTool,
      this.getCurrentBasketTool,
      this.displayFlightDetailTool,
      this.showComponentTool,
    ],
    components: [messageWidgetComponent, flightWidgetComponent],
  });

  public init(): void {
    this.chatStore.setChat(this.chat);
  }
}
