import { inject, Injectable } from '@angular/core';
import {
  type AgUiChatResourceRef,
  agUiResource,
  createShowComponentsTool,
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../../shared/util-common/config-service';
import { flightWidget } from '../widgets/flight-widget';
import { hotelWidget } from '../widgets/hotel-widget';
import { addFlightToPlanTool } from './tools/add-flight-to-plan.tool';
import { addHotelToPlanTool } from './tools/add-hotel-to-plan.tool';
import { getTravelPlanTool } from './tools/get-travel-plan.tool';
import { removeFlightFromPlanTool } from './tools/remove-flight-from-plan.tool';
import { removeHotelFromPlanTool } from './tools/remove-hotel-from-plan.tool';
import { replaceFlightInPlanTool } from './tools/replace-flight-in-plan.tool';
import { setTravelPlanTool } from './tools/set-travel-plan.tool';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      this.chat = agUiResource({
        url: `${this.config.aiServerUrl}/ag-ui/travelRefinementAgent`,
        model: this.config.model,
        useServerMemory: true,
        tools: [
          getTravelPlanTool,
          setTravelPlanTool,
          addFlightToPlanTool,
          removeFlightFromPlanTool,
          replaceFlightInPlanTool,
          addHotelToPlanTool,
          removeHotelFromPlanTool,
          createShowComponentsTool([messageWidget, flightWidget, hotelWidget]),
        ],
      });
    }
    this.chatStore.setChat(this.chat);
  }
}
