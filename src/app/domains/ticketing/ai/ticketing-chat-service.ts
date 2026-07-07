import { inject, Injectable } from '@angular/core';
import {
  type AgUiChatResourceRef,
  agUiResource,
  createShowComponentsTool,
  mcpAppsWidgetComponent,
} from '@internal/ag-ui-client';

import { ChatRegistry } from '../../shared/ui-assistant/chat-registry';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { AgentModeService } from '../../shared/util-common/agent-mode-service';
import { ConfigService } from '../../shared/util-common/config-service';
import { flightWidget } from '../ui/flight-widget';
import { addPlanStepTool } from './tools/add-plan-step.tool';
import { clearPlanTool } from './tools/clear-plan.tool';
import { displayFlightDetailTool } from './tools/display-flight-detail.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { getPlanTool } from './tools/get-plan.tool';
import { movePlanStepTool } from './tools/move-plan-step.tool';
import { removePlanStepTool } from './tools/remove-plan-step.tool';
import { reversePlanTool } from './tools/reverse-plan.tool';
import { setPlanTool } from './tools/set-plan.tool';
import { swapPlanStepsTool } from './tools/swap-plan-steps.tool';
import { toggleFlightSelectionTool } from './tools/toggle-flight-selection.tool';
import { updatePlanStepTool } from './tools/update-plan-step.tool';
import { bookFlightActionCard } from './widgets/book-flight-action-card';
import { cancelFlightActionCard } from './widgets/cancel-flight-action-card';
import { planWidget } from './widgets/plan-widget';

const actionCards = [bookFlightActionCard, cancelFlightActionCard];

const planTools = [
  getPlanTool,
  setPlanTool,
  addPlanStepTool,
  removePlanStepTool,
  updatePlanStepTool,
  movePlanStepTool,
  swapPlanStepsTool,
  reversePlanTool,
  clearPlanTool,
];

@Injectable({ providedIn: 'root' })
export class TicketingChatService {
  private readonly config = inject(ConfigService);
  private readonly chatStore = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);

  private chat: AgUiChatResourceRef | null = null;

  public init(): void {
    if (!this.chat) {
      this.chat = agUiResource({
        url: this.config.agUiUrl,
        model: this.config.model,
        useServerMemory: true,
        forwardedProps: () => ({ agentMode: this.agentMode.mode() }),
        tools: [
          findFlightsTool,
          getLoadedFlightsTool,
          toggleFlightSelectionTool,
          getCurrentBasketTool,
          displayFlightDetailTool,
          ...planTools,
          createShowComponentsTool([
            messageWidget,
            flightWidget,
            planWidget,
            mcpAppsWidgetComponent,
            ...actionCards,
          ]),
        ],
      });
    }
    this.chatStore.setChat(this.chat);
  }
}
