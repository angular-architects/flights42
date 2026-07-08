import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import {
  TICKETING_AGENT_ID,
  TicketingAgentStore,
} from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatStore = inject(ChatRegistry);
  private readonly agentStore = inject(TicketingAgentStore);

  public init(): void {
    this.chatStore.setAgentStore(this.agentStore, TICKETING_AGENT_ID);
  }
}
