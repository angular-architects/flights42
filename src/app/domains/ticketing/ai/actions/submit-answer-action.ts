import type { UserAction } from '@a2ui/web_core/types/client-event';
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
  action: UserAction,
  chat: AgUiChatResourceRef,
): void {
  const context = normalizeQuestionContext(action.context);

  chat.sendMessage({
    role: 'user',
    content: JSON.stringify({
      type: 'a2ui_form_response',
      surfaceId: action.surfaceId,
      context,
    }),
  });
}

/*
 * We need the following conversion because a2ui 0.8 is storing data
 * in explicit key/value pairs in the shape { key: 'x', value: 'y' }.
 * The upcoming a2ui 0.9 will simplify this by using a nested object
 * structure.
 */

function normalizeQuestionContext(value: unknown): QuestionContext {
  const context = toRecord(value);
  const questions = toQuestionRecord(context['questions']);
  return { questions };
}

function toQuestionRecord(value: unknown): Record<string, Question> {
  return Object.fromEntries(
    Object.entries(toRecord(value)).map(([key, nestedValue]) => [
      key,
      toRecord(nestedValue) as unknown as Question,
    ]),
  ) as Record<string, Question>;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries(), ([key, nestedValue]) => [
        String(key),
        nestedValue instanceof Map ? toRecord(nestedValue) : nestedValue,
      ]),
    );
  }

  return value as Record<string, unknown>;
}
