import { inject } from '@angular/core';

import { widgetTools } from '../../shared/ui-assistant/copilot/widget-tools/widget-tool';
import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { AgentModeService } from '../../shared/util-common/agent-mode-service';
import { ConfigService } from '../../shared/util-common/config-service';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
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
import { bookFlightRenderTool } from './widgets/book-flight-tool-call-renderer';
import { cancelFlightRenderTool } from './widgets/cancel-flight-tool-call-renderer';
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

export const TicketingAgentStore = agentStore({
  agentId: TICKETING_AGENT_ID,
  // Ticketing uses the default AG-UI url; the server swaps the effective agent
  // (planning vs. ticketing) based on the forwarded `agentMode`.
  url: () => inject(ConfigService).agUiUrl,
  model: () => inject(ConfigService).model,
  useServerMemory: true,
  forwardedProps: () => ({ agentMode: inject(AgentModeService).mode() }),
  frontendTools: [
    findFlightsTool,
    getLoadedFlightsTool,
    toggleFlightSelectionTool,
    getCurrentBasketTool,
    displayFlightDetailTool,
    ...planTools,
    ...widgetTools([messageWidget, flightWidget, planWidget]),
  ],
  // bookFlightTool / cancelFlightTool are server-side Mastra tools that
  // suspend for the payment/confirmation choice (see ai-server/src/mastra/
  // tools/book-flight.ts, cancel-flight.ts); the suspend surfaces as an AG-UI
  // interrupt (see ChatMessages' pendingInterrupts handling), not a
  // client-side human-in-the-loop tool. These renderers only display the
  // completed tool's result.
  renderToolCalls: [bookFlightRenderTool, cancelFlightRenderTool],
});
