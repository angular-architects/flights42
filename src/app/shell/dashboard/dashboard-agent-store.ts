import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../domains/shared/util-common/config-service';
import { catalogIdToContextEntry } from '../../domains/shared/util-copilotkit/a2ui/catalog-context';
import { A2UI_CUSTOM_CATALOG } from '../../domains/shared/util-copilotkit/a2ui/provide-a2ui-catalog';
import { initAgentStore } from '../../domains/shared/util-copilotkit/init-agent-store';
import { DashboardPrefs } from './dashboard-prefs';
import { submitFlightSearchTool } from './tools/submit-flight-search.tool';

const AGENT_ID = 'dashboardAgent';

function buildCatalogIdContext() {
  return [catalogIdToContextEntry(inject(A2UI_CUSTOM_CATALOG).id)];
}

export function injectDashboardAgentStore() {
  const catalogContext = buildCatalogIdContext();

  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    forwardedProps: () => ({
      preventCaching: inject(DashboardPrefs).preventCaching(),
    }),
    context: () => catalogContext,
    frontendTools: [submitFlightSearchTool],
  });

  return injectAgentStore(AGENT_ID);
}
