import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { PLANNING_AGENT_ID } from './agent-ids';
import { addPlanStepTool } from './tools/add-plan-step.tool';
import { clearPlanTool } from './tools/clear-plan.tool';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { getPlanTool } from './tools/get-plan.tool';
import { movePlanStepTool } from './tools/move-plan-step.tool';
import { removePlanStepTool } from './tools/remove-plan-step.tool';
import { reversePlanTool } from './tools/reverse-plan.tool';
import { setPlanTool } from './tools/set-plan.tool';
import { swapPlanStepsTool } from './tools/swap-plan-steps.tool';
import { updatePlanStepTool } from './tools/update-plan-step.tool';
import { planWidget } from './widgets/plan-widget';

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

export function injectPlanningAgentStore() {
  initAgentStore({
    agentId: PLANNING_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(PLANNING_AGENT_ID),
    useServerMemory: true,
    frontendTools: [
      findFlightsTool,
      getLoadedFlightsTool,
      getCurrentBasketTool,
      ...planTools,
      messageWidget,
      planWidget,
    ],
  });

  return injectAgentStore(PLANNING_AGENT_ID);
}
