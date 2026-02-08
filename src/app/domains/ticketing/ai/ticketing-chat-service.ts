import { inject, Injectable } from '@angular/core';
import { uiChatResource } from '@hashbrownai/angular';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { systemExtended } from './system-prompt';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private config = inject(ConfigService);
  private chatStore = inject(ChatRegistry);

  private readonly chat = uiChatResource({
    model: this.config.model,
    system: systemExtended,
    tools: [],
    components: [messageWidget],
  });

  public init(): void {
    this.chatStore.setChat(this.chat);
  }
}
