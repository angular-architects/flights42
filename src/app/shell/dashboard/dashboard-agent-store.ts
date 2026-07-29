import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../domains/shared/util-common/config-service';
import { initAgentStore } from '../../domains/shared/util-copilotkit/init-agent-store';
import { DashboardPrefs } from './dashboard-prefs';
import { submitFlightSearchTool } from './tools/submit-flight-search.tool';

const AGENT_ID = 'dashboardAgent';

export function injectDashboardAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    forwardedProps: () => ({
      preventCaching: inject(DashboardPrefs).preventCaching(),
    }),
    catalogIdOnly: true,
    frontendTools: [submitFlightSearchTool],
  });

  return injectAgentStore(AGENT_ID);
}
