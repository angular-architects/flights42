import { inject } from '@angular/core';

import { ConfigService } from '../../../shared/util-common/config-service';
import { agentStore } from '../../../shared/util-copilotkit/agent-store';
import { renderChartTool } from './render-chart.tool';

export const REPORTING_AGENT_ID = 'reportingAgent';

export const ReportingAgentStore = agentStore({
  agentId: REPORTING_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(REPORTING_AGENT_ID),
  model: () => inject(ConfigService).model,
  frontendTools: [renderChartTool],
});
