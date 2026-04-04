import { DestroyRef, inject, Injectable } from '@angular/core';
import { agUiResource } from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { ConfigService } from '../../shared/util-common/config-service';
import { checkInAction } from './actions/check-in-action';
import { submitAnswerAction } from './actions/submit-answer-action';
import { registerHandlers } from './register-handlers';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly destroyRef = inject(DestroyRef);

  private readonly chat = agUiResource({
    url: this.config.agUiUrl,
    model: this.config.model,
    useServerMemory: true,
    tools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
    ],
  });

  constructor() {
    registerHandlers({
      checkIn: (action) => checkInAction(action),
      submitAnswer: (action) => submitAnswerAction(action, this.chat),
    });

    this.destroyRef.onDestroy(() => this.cleanupChat());
  }

  public init(): void {
    this.chatStore.setChat(this.chat);
  }

  private cleanupChat(): void {
    this.chat.dispose();
    this.chatStore.clearChat();
  }
}
