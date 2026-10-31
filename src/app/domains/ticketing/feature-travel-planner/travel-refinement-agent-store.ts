import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { messageWidget } from '../../shared/ui-assistant/widgets/message-widget';
import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { initialTravelPlan } from './travel-plan-model';

export const TRAVEL_REFINEMENT_AGENT_ID = 'travelRefinementAgent';

export function injectTravelRefinementAgentStore() {
  initAgentStore({
    agentId: TRAVEL_REFINEMENT_AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(TRAVEL_REFINEMENT_AGENT_ID),
    useServerMemory: true,
    components: [messageWidget],
    initialState: initialTravelPlan,
  });

  return injectAgentStore(TRAVEL_REFINEMENT_AGENT_ID);
}
