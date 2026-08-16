import { agUiResource } from '@agentic-angular/core';
import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { flightWidget } from '../ui/flight-widget';
import { addFlightToPlanTool } from './ai-tools/add-flight-to-plan.tool';
import { addHotelToPlanTool } from './ai-tools/add-hotel-to-plan.tool';
import { getTravelPlanTool } from './ai-tools/get-travel-plan.tool';
import { removeFlightFromPlanTool } from './ai-tools/remove-flight-from-plan.tool';
import { removeHotelFromPlanTool } from './ai-tools/remove-hotel-from-plan.tool';
import { replaceFlightInPlanTool } from './ai-tools/replace-flight-in-plan.tool';
import { setTravelPlanTool } from './ai-tools/set-travel-plan.tool';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { hotelWidget } from './ui/hotel-widget';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);

  private readonly chat = agUiResource({
    url: `${this.config.aiServerUrl}/ag-ui/travelRefinementAgent`,
    model: this.config.model,
    useServerMemory: true,
    firstMessagePreamble: () =>
      buildPreferencePreamble(this.requestStore.preferences()),
    tools: [
      getTravelPlanTool,
      setTravelPlanTool,
      addFlightToPlanTool,
      removeFlightFromPlanTool,
      replaceFlightInPlanTool,
      addHotelToPlanTool,
      removeHotelFromPlanTool,
    ],
    components: [messageWidget, flightWidget, hotelWidget],
  });

  public init(): void {
    this.chatStore.setChat(
      this.chat,
      'Do you want to refine your travel plan?',
      false,
    );
  }

  /**
   * Clears the current refinement conversation so a newly created plan starts
   * from a fresh session. Preferences are read live from the input store.
   */
  public reset(): void {
    this.chat.reset();
  }
}

function buildPreferencePreamble(preferences: string): string | undefined {
  const trimmed = preferences.trim();
  if (!trimmed) {
    return undefined;
  }
  return (
    `For context, the traveler's original preferences for this trip are: ` +
    `"${trimmed}". Keep honoring them while refining the plan unless I ` +
    `explicitly ask to change them.`
  );
}
