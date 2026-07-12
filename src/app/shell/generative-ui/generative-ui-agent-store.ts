import { inject } from '@angular/core';
import { injectAgentStore } from '@copilotkit/angular';

import { ConfigService } from '../../domains/shared/util-common/config-service';
import { initAgentStore } from '../../domains/shared/util-copilotkit/init-agent-store';
import { GenerativeUiPrefs } from './generative-ui-prefs';

const AGENT_ID = 'generativeUiAgent';

export function injectGenerativeUiAgentStore() {
  initAgentStore({
    agentId: AGENT_ID,
    url: inject(ConfigService).agUiUrlFor(AGENT_ID),
    forwardedProps: () => ({
      preventCaching: inject(GenerativeUiPrefs).preventCaching(),
    }),
  });

  return injectAgentStore(AGENT_ID);
}
