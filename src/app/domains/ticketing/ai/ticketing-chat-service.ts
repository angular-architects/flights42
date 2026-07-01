import {
  EnvironmentInjector,
  inject,
  Injectable,
  runInInjectionContext,
} from '@angular/core';
import {
  type AgUiChatResourceRef,
  agUiResource,
  createShowComponentsTool,
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { flightWidget } from '../feature-travel-planner/ui/flight-widget';
import { hotelWidget } from '../feature-travel-planner/ui/hotel-widget';
import { displayFlightDetailTool } from './ticketing-tools/display-flight-detail.tool';
import { findFlightsTool } from './ticketing-tools/find-flights.tool';
import { getCurrentBasketTool } from './ticketing-tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './ticketing-tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './ticketing-tools/toggle-flight-selection.tool';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly injector = inject(EnvironmentInjector);

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      this.chat = runInInjectionContext(this.injector, () =>
        agUiResource({
          url: this.config.agUiUrl,
          model: this.config.model,
          useServerMemory: true,
          tools: [
            findFlightsTool,
            getLoadedFlightsTool,
            toggleFlightSelectionTool,
            getCurrentBasketTool,
            displayFlightDetailTool,
            createShowComponentsTool([
              messageWidget,
              flightWidget,
              hotelWidget,
            ]),
          ],
        }),
      );
    }
    this.chatStore.setChat(this.chat);
  }
}
