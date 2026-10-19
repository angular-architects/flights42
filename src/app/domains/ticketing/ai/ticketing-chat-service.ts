import { effect, inject, Injectable } from '@angular/core';

import {
  ChatConfig,
  ChatRegistry,
} from '../../shared/ui-assistant/chat-registry';
import {
  AgentMode,
  AgentModeService,
} from '../../shared/util-common/agent-mode-service';
import { reset } from '../../shared/util-copilotkit/agent-store-helper';
import { injectPlanningAgentStore } from './planning-agent-store';
import { injectTicketingAgentStore } from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);

  private readonly executionChat: ChatConfig = {
    store: injectTicketingAgentStore(),
  };

  private readonly planningChat: ChatConfig = {
    store: injectPlanningAgentStore(),
  };

  private previousMode: AgentMode | undefined;

  constructor() {
    effect(() => {
      const mode = this.agentMode.mode();
      if (this.previousMode !== undefined && this.previousMode !== mode) {
        reset(this.chatFor(this.previousMode).store);
      }
      this.previousMode = mode;
      if (this.ownsActiveChat()) {
        this.chatRegistry.setChat(this.chatFor(mode));
      }
    });
  }

  public init(): void {
    this.chatRegistry.setChat(this.chatFor(this.agentMode.mode()));
  }

  private chatFor(mode: AgentMode): ChatConfig {
    return mode === 'plan' ? this.planningChat : this.executionChat;
  }

  private ownsActiveChat(): boolean {
    const active = this.chatRegistry.store;
    return (
      active === this.executionChat.store || active === this.planningChat.store
    );
  }
}
