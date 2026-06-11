import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import type { AgUiChatResourceRef } from '@internal/ag-ui-client';

interface Question {
  id: string;
  question: string;
  answer: string;
}

interface QuestionContext {
  questions: Record<string, Question>;
}

export function submitAnswerAction(
  action: A2uiClientAction,
  chat: AgUiChatResourceRef,
): void {
  const context = action.context as QuestionContext;

  chat.sendMessage({
    role: 'user',
    content: JSON.stringify({
      type: 'a2ui_form_response',
      surfaceId: action.surfaceId,
      context,
    }),
  });
}
