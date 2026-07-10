import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  TICKETING_AGENT_ID,
  TicketingAgentStore,
} from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly store = inject(TicketingAgentStore);

  public init(): void {
    this.chatRegistry.setChat(this.store, TICKETING_AGENT_ID);
  }
}
