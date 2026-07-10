import { inject } from '@angular/core';

import { ConfigService } from '../../domains/shared/util-common/config-service';
import { agentStore } from '../../domains/shared/util-copilotkit/agent-store';
import { DashboardPrefs } from './dashboard-prefs';
import { submitFlightSearchTool } from './tools/submit-flight-search.tool';

export const DASHBOARD_AGENT_ID = 'dashboardAgent';

export const DashboardAgentStore = agentStore({
  agentId: DASHBOARD_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(DASHBOARD_AGENT_ID),
  model: () => inject(ConfigService).model,
  forwardedProps: () => ({
    preventCaching: inject(DashboardPrefs).preventCaching(),
  }),
  frontendTools: [submitFlightSearchTool],
});
