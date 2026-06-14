import { inject, Injectable, signal } from '@angular/core';
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

  /** The traveler's original preferences, seeded into the first refinement turn. */
  private readonly preferences = signal('');

  public init(): void {
    if (!this.chat) {
      this.chat = agUiResource({
        url: `${this.config.aiServerUrl}/ag-ui/travelRefinementAgent`,
        model: this.config.model,
        useServerMemory: true,
        firstMessagePreamble: () => buildPreferencePreamble(this.preferences()),
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
    this.chatStore.setChat(
      this.chat,
      'Do you want to refine your travel plan?',
    );
  }

  /**
   * Starts a fresh refinement session for a newly created plan and seeds it
   * with the traveler's preferences, so they are carried into the first turn
   * and not lost during refinement.
   */
  public startSession(preferences: string): void {
    this.preferences.set(preferences.trim());
    this.chat?.reset();
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
