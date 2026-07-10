import { inject } from '@angular/core';

import { ConfigService } from '../../shared/util-common/config-service';
import { agentStore } from '../../shared/util-copilotkit/agent-store';
import { fillCheckinFormClientTool } from './fill-checkin-form.tool';

export const CHECKIN_AGENT_ID = 'checkinAgent';

export const CheckinAgentStore = agentStore({
  agentId: CHECKIN_AGENT_ID,
  url: () => inject(ConfigService).agUiUrlFor(CHECKIN_AGENT_ID),
  model: () => inject(ConfigService).model,
  frontendTools: [fillCheckinFormClientTool],
});
