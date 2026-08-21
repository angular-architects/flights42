import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { injectTicketingAgentStore } from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly store = injectTicketingAgentStore();

  public init(): void {
    this.chatRegistry.setChat({ store: this.store });
  }
}
