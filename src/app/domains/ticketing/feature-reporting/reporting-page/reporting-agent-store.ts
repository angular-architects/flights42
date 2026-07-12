import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../../shared/util-common/config-service';
import { initAgentStore } from '../../../shared/util-copilotkit/init-agent-store';
import { renderChartTool } from './render-chart.tool';

const AGENT_ID = 'reportingAgent';

export function injectReportingAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [renderChartTool],
  });

  return injectAgentStore(AGENT_ID);
}
