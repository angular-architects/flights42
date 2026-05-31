export function extractText(
  message: Record<string, unknown>,
): string | undefined {
  if (message['type'] === 'text-delta') {
    const payload = message['payload'] as { text?: string } | undefined;
    return payload?.text;
  }
  if (message['type'] === 'TEXT_MESSAGE_CHUNK') {
    return message['delta'] as string | undefined;
  }
  return undefined;
}

export function detailFor(message: Record<string, unknown>): string {
  const type = message['type'];
  const payload = message['payload'] as Record<string, unknown> | undefined;
  const toolName = String(payload?.['toolName'] ?? '');

  switch (type) {
    // --- native Mastra format ---
    case 'text-delta':
      return String(payload?.['text'] ?? '');
    case 'tool-call':
    case 'tool-call-input-streaming-start':
      return toolName;
    case 'tool-call-delta':
      return `${toolName} ${String(payload?.['argsTextDelta'] ?? '')}`;
    case 'tool-result':
      return `${JSON.stringify(payload?.['result'])}`;
    case 'tool-error':
      return `${toolName} ${JSON.stringify(payload?.['error'])}`;

    // --- AG-UI protocol ---
    case 'TEXT_MESSAGE_CONTENT':
    case 'TEXT_MESSAGE_CHUNK':
      return String(message['delta'] ?? '');
    case 'TOOL_CALL_START':
      return String(message['toolCallName'] ?? '');
    case 'TOOL_CALL_ARGS':
      return String(message['delta'] ?? '');
    case 'TOOL_CALL_RESULT':
      return String(message['content'] ?? '');

    default:
      return '';
  }
}
