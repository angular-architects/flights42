import { effect, inject, Injectable } from '@angular/core';
import { CopilotKit, injectInterrupt } from '@copilotkit/angular';

import {
  ChatConfig,
  ChatRegistry,
} from '../../shared/ui-assistant/chat-registry';
import {
  AgentMode,
  AgentModeService,
} from '../../shared/util-common/agent-mode-service';
import { registerHandlers } from '../../shared/util-copilotkit/a2ui/a2ui-action-handlers';
import { reset } from '../../shared/util-copilotkit/agent-store-helper';
import { checkInAction } from './actions/check-in-action';
import { submitAnswerAction } from './actions/submit-answer-action';
import { PLANNING_AGENT_ID, TICKETING_AGENT_ID } from './agent-ids';
import { injectPlanningAgentStore } from './planning-agent-store';
import { injectTicketingAgentStore } from './ticketing-agent-store';

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);
  private readonly copilotKit = inject(CopilotKit);

  private readonly executionChat: ChatConfig = {
    store: injectTicketingAgentStore(),
    interrupts: injectInterrupt({ agentId: TICKETING_AGENT_ID }),
  };

  private readonly planningChat: ChatConfig = {
    store: injectPlanningAgentStore(),
    interrupts: injectInterrupt({ agentId: PLANNING_AGENT_ID }),
  };

  private previousMode: AgentMode | undefined;

  constructor() {
    registerHandlers({
      checkIn: (action) => checkInAction(action),
      submitAnswer: (action) =>
        submitAnswerAction(action, this.copilotKit, this.executionChat.store),
    });

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
