import { inject } from '@angular/core';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
import { flightWidget } from '../ui/flight-widget';
import { addFlightToPlanTool } from './ai-tools/add-flight-to-plan.tool';
import { addHotelToPlanTool } from './ai-tools/add-hotel-to-plan.tool';
import { getTravelPlanTool } from './ai-tools/get-travel-plan.tool';
import { removeFlightFromPlanTool } from './ai-tools/remove-flight-from-plan.tool';
import { removeHotelFromPlanTool } from './ai-tools/remove-hotel-from-plan.tool';
import { replaceFlightInPlanTool } from './ai-tools/replace-flight-in-plan.tool';
import { setTravelPlanTool } from './ai-tools/set-travel-plan.tool';
import { TravelPlannerRequestStore } from './travel-planner-request-store';
import { hotelWidget } from './ui/hotel-widget';

export const TRAVEL_REFINEMENT_AGENT_ID = 'travelRefinementAgent';

const widgets = [messageWidget, flightWidget, hotelWidget];

export const TravelRefinementAgentStore = agentStore({
  agentId: TRAVEL_REFINEMENT_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(TRAVEL_REFINEMENT_AGENT_ID),
  model: () => inject(ConfigService).model,
  useServerMemory: true,
  firstMessagePreamble: () =>
    buildPreferencePreamble(inject(TravelPlannerRequestStore).preferences()),
  frontendTools: [
    getTravelPlanTool,
    setTravelPlanTool,
    addFlightToPlanTool,
    removeFlightFromPlanTool,
    replaceFlightInPlanTool,
    addHotelToPlanTool,
    removeHotelFromPlanTool,
    ...widgets,
  ],
});

function buildPreferencePreamble(preferences: string): string | undefined {
  const trimmed = preferences.trim();
  if (!trimmed) {
    return undefined;
  }
  return (
    `For context, the traveler's original preferences for this trip are: ` +
    `"${trimmed}". Keep honoring them while refining the plan unless I ` +
    `explicitly ask to change them.`
  );
}
