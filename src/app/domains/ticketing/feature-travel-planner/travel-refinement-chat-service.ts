import { inject, Injectable } from '@angular/core';
import {
  type AgUiChatResourceRef,
  agUiResource,
  createShowComponentsTool,
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { getPlanTool } from './ai-tools/get-plan.tool';
import { setPlanTool } from './ai-tools/set-plan.tool';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { flightWidget } from './ui/flight-widget';
import { hotelWidget } from './ui/hotel-widget';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      this.chat = agUiResource({
        url: `${this.config.aiServerUrl}/ag-ui/travelRefinementAgent`,
        model: this.config.model,
        useServerMemory: true,
        firstMessagePreamble: () =>
          buildPreferencePreamble(this.requestStore.preferences()),
        tools: [
          getPlanTool,
          setPlanTool,
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
   * Clears the current refinement conversation so a newly created plan starts
   * from a fresh session. Preferences are read live from the input store.
   */
  public reset(): void {
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
