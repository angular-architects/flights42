import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import { type CopilotKit } from '@copilotkit/angular';

import {
  type CopilotAgentStore,
  sendDeveloperMessage,
} from '../../../shared/util-copilotkit/agent-store-helper';

export function submitAnswerAction(
  action: A2uiClientAction,
  copilotKit: CopilotKit,
  store: CopilotAgentStore,
): void {
  void sendDeveloperMessage(
    copilotKit,
    store,
    JSON.stringify({
      type: 'a2ui_form_response',
      surfaceId: action.surfaceId,
      context: action.context,
    }),
  );
}
