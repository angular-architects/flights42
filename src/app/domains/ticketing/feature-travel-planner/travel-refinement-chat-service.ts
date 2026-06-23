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
import { addFlightToPlanTool } from './ai-tools/add-flight-to-plan.tool';
import { addHotelToPlanTool } from './ai-tools/add-hotel-to-plan.tool';
import { getTravelPlanTool } from './ai-tools/get-travel-plan.tool';
import { removeFlightFromPlanTool } from './ai-tools/remove-flight-from-plan.tool';
import { removeHotelFromPlanTool } from './ai-tools/remove-hotel-from-plan.tool';
import { replaceFlightInPlanTool } from './ai-tools/replace-flight-in-plan.tool';
import { setTravelPlanTool } from './ai-tools/set-travel-plan.tool';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { flightWidget } from './ui/flight-widget';
import { hotelWidget } from './ui/hotel-widget';

@Injectable({ providedIn: 'root' })
export class TravelRefinementChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly requestStore = inject(TravelPlannerRequestStore);
  // Root injector (this service is providedIn: 'root'). Used to create the chat
  // resource so its lifecycle is bound to the root injector, not to the
  // component that happens to trigger init() first.
  private readonly injector = inject(EnvironmentInjector);

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      // agUiResource() builds an Angular resource() whose internal effect is
      // tied to the active injection context's DestroyRef. Creating it in the
      // root injector keeps it alive across navigations; otherwise it would die
      // with the first page that called init() and the cached chat would stop
      // reacting after navigating away and back.
      this.chat = runInInjectionContext(this.injector, () =>
        agUiResource({
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
            createShowComponentsTool([
              messageWidget,
              flightWidget,
              hotelWidget,
            ]),
          ],
        }),
      );
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
