import { inject, Injectable } from '@angular/core';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
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

  private readonly stores = {
    execution: injectTicketingAgentStore(),
    plan: injectPlanningAgentStore(),
  };

  constructor() {
    this.chatRegistry.modeRequested.subscribe((mode) => this.setMode(mode));
  }

  public init(): void {
    this.chatRegistry.setChat({ store: this.stores[this.agentMode.mode()] });
  }

  public setMode(newMode: AgentMode): void {
    const currentMode = this.agentMode.mode();
    const currentStore = this.stores[currentMode];
    const newStore = this.stores[newMode];

    if (currentMode === newMode) {
      return;
    }

    reset(currentStore);
    this.agentMode.setMode(newMode);

    if (this.isTicketingChatActive()) {
      this.chatRegistry.setChat({ store: newStore });
    }
  }

  private isTicketingChatActive(): boolean {
    const active = this.chatRegistry.store;
    return active === this.stores.execution || active === this.stores.plan;
  }
}
