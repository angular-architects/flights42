import { computed, inject, Injectable } from '@angular/core';
import {
  type AgUiChatResourceRef,
  agUiResource,
  createShowComponentsTool,
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { TravelPlanStore } from './travel-plan-store';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { flightWidget } from './ui/flight-widget';
import { hotelWidget } from './ui/hotel-widget';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  private readonly planStore = inject(TravelPlanStore);

  private readonly preferencePreamble = computed(() =>
    buildPreferencePreamble(this.requestStore.preferences()),
  );

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      this.chat = agUiResource({
        url: `${this.config.aiServerUrl}/ag-ui/travelRefinementAgent`,
        model: this.config.model,
        useServerMemory: true,
        firstMessagePreamble: () => this.preferencePreamble(),
        state: () => this.planStore.plan(),
        onStateSnapshot: (state) => {
          this.planStore.setPlan(state);
        },
        tools: [
          createShowComponentsTool([messageWidget, flightWidget, hotelWidget]),
        ],
      });
    }
    this.chatStore.setChat(
      this.chat,
      'Do you want to refine your travel plan?',
    );
  }

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
