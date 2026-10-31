import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../../shared/util-common/config-service';
import { initAgentStore } from '../../../shared/util-copilotkit/init-agent-store';
import { chartWidget } from './chart-widget';

const AGENT_ID = 'reportingAgent';

export function injectReportingAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    toolCallRenderer: [chartWidget],
  });

  return injectAgentStore(AGENT_ID);
}
