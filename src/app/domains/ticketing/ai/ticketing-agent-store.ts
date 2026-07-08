import { inject } from '@angular/core';

import { mcpAppsActivityRendererConfig } from '../../shared/ui-assistant/copilot/mcp-apps/mcp-apps-activity-renderer';
import { AgentModeService } from '../../shared/util-common/agent-mode-service';
import { ConfigService } from '../../shared/util-common/config-service';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
import {
  type AddPlanStepArgs,
  addPlanStepFrontendTool,
} from './tools/add-plan-step.tool';
import {
  type ClearPlanArgs,
  clearPlanFrontendTool,
} from './tools/clear-plan.tool';
import {
  type DisplayFlightDetailArgs,
  displayFlightDetailFrontendTool,
} from './tools/display-flight-detail.tool';
import {
  type FindFlightsArgs,
  findFlightsTool,
} from './tools/find-flights.tool';
import {
  type GetCurrentBasketArgs,
  getCurrentBasketFrontendTool,
} from './tools/get-current-basket.tool';
import {
  type GetLoadedFlightsArgs,
  getLoadedFlightsFrontendTool,
} from './tools/get-loaded-flights.tool';
import { type GetPlanArgs, getPlanFrontendTool } from './tools/get-plan.tool';
import {
  type MovePlanStepArgs,
  movePlanStepFrontendTool,
} from './tools/move-plan-step.tool';
import {
  type RemovePlanStepArgs,
  removePlanStepFrontendTool,
} from './tools/remove-plan-step.tool';
import {
  type ReversePlanArgs,
  reversePlanFrontendTool,
} from './tools/reverse-plan.tool';
import { type SetPlanArgs, setPlanFrontendTool } from './tools/set-plan.tool';
import {
  type ShowComponentsArgs,
  showComponentsTool,
} from './tools/show-components.tool';
import {
  type SwapPlanStepsArgs,
  swapPlanStepsFrontendTool,
} from './tools/swap-plan-steps.tool';
import {
  type ToggleFlightSelectionArgs,
  toggleFlightSelectionFrontendTool,
} from './tools/toggle-flight-selection.tool';
import {
  type UpdatePlanStepArgs,
  updatePlanStepFrontendTool,
} from './tools/update-plan-step.tool';
import {
  type BookFlightArgs,
  bookFlightRenderTool,
} from './widgets/book-flight-action-card';
import {
  type CancelFlightArgs,
  cancelFlightRenderTool,
} from './widgets/cancel-flight-action-card';

export const TICKETING_AGENT_ID = 'ticketingAgent';

type TicketingFrontendArgs =
  | AddPlanStepArgs
  | ClearPlanArgs
  | DisplayFlightDetailArgs
  | FindFlightsArgs
  | GetCurrentBasketArgs
  | GetLoadedFlightsArgs
  | GetPlanArgs
  | MovePlanStepArgs
  | RemovePlanStepArgs
  | ReversePlanArgs
  | SetPlanArgs
  | ShowComponentsArgs
  | SwapPlanStepsArgs
  | ToggleFlightSelectionArgs
  | UpdatePlanStepArgs;

export const TicketingAgentStore = agentStore<
  TicketingFrontendArgs,
  BookFlightArgs | CancelFlightArgs
>({
  agentId: TICKETING_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(TICKETING_AGENT_ID),
  frontendTools: [
    addPlanStepFrontendTool,
    clearPlanFrontendTool,
    displayFlightDetailFrontendTool,
    findFlightsTool,
    getCurrentBasketFrontendTool,
    getLoadedFlightsFrontendTool,
    getPlanFrontendTool,
    movePlanStepFrontendTool,
    removePlanStepFrontendTool,
    reversePlanFrontendTool,
    setPlanFrontendTool,
    showComponentsTool,
    swapPlanStepsFrontendTool,
    toggleFlightSelectionFrontendTool,
    updatePlanStepFrontendTool,
  ],
  renderToolCalls: [bookFlightRenderTool, cancelFlightRenderTool],
  renderActivityMessages: [mcpAppsActivityRendererConfig],
  forwardedProps: () => ({ agentMode: inject(AgentModeService).mode() }),
  useServerMemory: true,
});
