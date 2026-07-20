import { type Context } from '@ag-ui/core';
import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import {
  USE_ACTION_CARDS,
  USE_MCP,
} from '../../../../../libs/feature-flags/feature-flags';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { AgentModeService } from '../../shared/util-common/agent-mode-service';
import { ConfigService } from '../../shared/util-common/config-service';
import { catalogToContextEntry } from '../../shared/util-copilotkit/a2ui/catalog-context';
import { A2UI_CUSTOM_CATALOG } from '../../shared/util-copilotkit/a2ui/provide-a2ui-catalog';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
import { bookFlightActionCard } from './action-cards/book-flight-action-card';
import { cancelFlightActionCard } from './action-cards/cancel-flight-action-card';
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
import { planWidget } from './widgets/plan-widget';

const AGENT_ID = 'ticketingAgent';

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

const widgets = USE_MCP
  ? [messageWidget, flightWidget, planWidget]
  : [messageWidget, flightWidget, hotelWidget, planWidget];

function buildCatalogContext(): Context[] {
  const entry = catalogToContextEntry(inject(A2UI_CUSTOM_CATALOG));
  return entry ? [entry] : [];
}

export function injectTicketingAgentStore() {
  const catalogContext = buildCatalogContext();

  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrl,
    useServerMemory: true,
    forwardedProps: () => ({ agentMode: inject(AgentModeService).mode() }),
    context: () => catalogContext,
    frontendTools: [
      findFlightsTool,
      getLoadedFlightsTool,
      toggleFlightSelectionTool,
      getCurrentBasketTool,
      displayFlightDetailTool,
      ...planTools,
      ...widgets,
    ],
    toolCallRenderer: USE_ACTION_CARDS
      ? [bookFlightActionCard, cancelFlightActionCard]
      : [],
  });

  return injectAgentStore(AGENT_ID);
}
