import { inject, Injectable } from '@angular/core';
import { registerHandlers } from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { checkInAction } from './actions/check-in-action';
import { submitAnswerAction } from './actions/submit-answer-action';
import {
  TICKETING_AGENT_ID,
  TicketingAgentStore,
} from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly store = inject(TicketingAgentStore);

  constructor() {
    registerHandlers({
      checkIn: (action) => checkInAction(action),
      submitAnswer: (action) => submitAnswerAction(action, this.store),
    });
  }

  public init(): void {
    this.chatRegistry.setChat(this.store, TICKETING_AGENT_ID);
  }
}
