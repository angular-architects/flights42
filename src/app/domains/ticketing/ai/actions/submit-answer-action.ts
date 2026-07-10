import type { A2uiClientAction } from '@a2ui/web_core/v0_9';

import { type CopilotAgentStore } from '../../../shared/util-copilotkit/agent-store';

// The form answers travel back as a hidden user message: the agent needs them
// to continue, but the raw JSON payload should not appear as a chat bubble.
export function submitAnswerAction(
  action: A2uiClientAction,
  store: CopilotAgentStore,
): void {
  void store.sendMessage(
    JSON.stringify({
      type: 'a2ui_form_response',
      surfaceId: action.surfaceId,
      context: action.context,
    }),
    { hidden: true },
  );
}
