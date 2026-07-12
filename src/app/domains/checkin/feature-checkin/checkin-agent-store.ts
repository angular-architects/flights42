import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../shared/util-common/config-service';
import { initAgentStore } from '../../shared/util-copilotkit/init-agent-store';
import { fillCheckinFormClientTool } from './fill-checkin-form.tool';

const AGENT_ID = 'checkinAgent';

export function injectCheckinAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    frontendTools: [fillCheckinFormClientTool],
  });

  return injectAgentStore(AGENT_ID);
}
