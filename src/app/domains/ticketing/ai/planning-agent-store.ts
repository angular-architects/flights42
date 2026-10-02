import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { PLANNING_AGENT_ID } from './agent-ids';
import { findFlightsTool } from './tools/find-flights.tool';
import { getCurrentBasketTool } from './tools/get-current-basket.tool';
import { getLoadedFlightsTool } from './tools/get-loaded-flights.tool';
import { addPlanStepTool } from './tools/plan/add-plan-step.tool';
import { clearPlanTool } from './tools/plan/clear-plan.tool';
import { getPlanTool } from './tools/plan/get-plan.tool';
import { movePlanStepTool } from './tools/plan/move-plan-step.tool';
import { removePlanStepTool } from './tools/plan/remove-plan-step.tool';
import { reversePlanTool } from './tools/plan/reverse-plan.tool';
import { setPlanTool } from './tools/plan/set-plan.tool';
import { swapPlanStepsTool } from './tools/plan/swap-plan-steps.tool';
import { updatePlanStepTool } from './tools/plan/update-plan-step.tool';
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
    ],
    components: [messageWidget, planWidget],
  });

  return injectAgentStore(PLANNING_AGENT_ID);
}
