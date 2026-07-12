import { type Context } from '@ag-ui/core';
import { inject } from '@angular/core';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { AgentModeService } from '../../shared/util-common/agent-mode-service';
import { ConfigService } from '../../shared/util-common/config-service';
import { catalogToContextEntry } from '../../shared/util-copilotkit/a2ui/catalog-context';
import { A2UI_CUSTOM_CATALOG } from '../../shared/util-copilotkit/a2ui/provide-a2ui-catalog';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
import { flightWidget } from '../ui/flight-widget';
import { hotelWidget } from '../ui/hotel-widget';
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

export const TICKETING_AGENT_ID = 'ticketingAgent';

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

const widgets = [messageWidget, flightWidget, hotelWidget, planWidget];

let catalogContext: Context[] | undefined;

function buildCatalogContext(): Context[] {
  const entry = catalogToContextEntry(inject(A2UI_CUSTOM_CATALOG));
  return entry ? [entry] : [];
}

export const TicketingAgentStore = agentStore({
  agentId: TICKETING_AGENT_ID,
  url: () => inject(ConfigService).agUiUrl,
  model: () => inject(ConfigService).model,
  useServerMemory: true,
  forwardedProps: () => ({ agentMode: inject(AgentModeService).mode() }),
  context: () => (catalogContext ??= buildCatalogContext()),
  frontendTools: [
    findFlightsTool,
    getLoadedFlightsTool,
    toggleFlightSelectionTool,
    getCurrentBasketTool,
    displayFlightDetailTool,
    ...planTools,
    ...widgets,
  ],
  renderToolCalls: [bookFlightActionCard, cancelFlightActionCard],
});
