import { type AgUiChatMessage } from '../ag-ui-types';
import {
  appendErrorMessage,
  filterPublicMessages,
  friendlyErrorMessage,
  scopeRenderId,
  upsertAssistantMessage,
} from './messages';

function message(overrides: Partial<AgUiChatMessage> = {}): AgUiChatMessage {
  return {
    id: 'm1',
    role: 'assistant',
    content: '',
    widgets: [],
    toolCalls: [],
    workflowSteps: [],
    ...overrides,
  };
}

describe('filterPublicMessages', () => {
  it('drops messages without visible content', () => {
    expect(filterPublicMessages([message()])).toEqual([]);
  });

  it('strips showComponents tool calls but keeps the message', () => {
    const input = message({
      content: 'Hello',
      toolCalls: [
        { id: 'tc1', name: 'showComponents', args: {}, status: 'complete' },
        { id: 'tc2', name: 'findFlights', args: {}, status: 'complete' },
      ],
    });

    const result = filterPublicMessages([input]);

    expect(result).toHaveLength(1);
    expect(result[0].toolCalls.map((toolCall) => toolCall.name)).toEqual([
      'findFlights',
    ]);
  });

  it('drops a message whose only content is a showComponents call without widgets', () => {
    const input = message({
      toolCalls: [
        { id: 'tc1', name: 'showComponents', args: {}, status: 'complete' },
      ],
    });

    expect(filterPublicMessages([input])).toEqual([]);
  });
});

describe('upsertAssistantMessage', () => {
  it('appends a new assistant message', () => {
    const result = upsertAssistantMessage([], 'm1', 'Hello');

    expect(result).toEqual([message({ content: 'Hello' })]);
  });

  it('updates the content of an existing assistant message', () => {
    const result = upsertAssistantMessage(
      [message({ content: 'Hel' })],
      'm1',
      'Hello',
    );

    expect(result).toEqual([message({ content: 'Hello' })]);
  });

  it('does not touch non-assistant messages with the same id', () => {
    const messages = [message({ role: 'user', content: 'Hi' })];

    expect(upsertAssistantMessage(messages, 'm1', 'Hello')).toBe(messages);
  });
});

describe('appendErrorMessage', () => {
  it('appends an error message', () => {
    const result = appendErrorMessage([message()], 'It broke');

    expect(result).toHaveLength(2);
    expect(result[1].role).toBe('error');
    expect(result[1].content).toBe('It broke');
  });
});

describe('friendlyErrorMessage', () => {
  it('maps abort errors to a friendly text', () => {
    const abortError = new DOMException('The user aborted', 'AbortError');

    expect(friendlyErrorMessage(abortError, 'fallback')).toBe(
      'Request was aborted.',
    );
  });

  it('uses the error message of plain errors', () => {
    expect(friendlyErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('falls back for non-errors', () => {
    expect(friendlyErrorMessage('boom', 'fallback')).toBe('fallback');
  });
});

describe('scopeRenderId', () => {
  it('prefixes the id with the run id', () => {
    expect(scopeRenderId('run1', 'tc1-0')).toBe('run1:tc1-0');
  });
});
