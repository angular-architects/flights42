import { AGUIEvent, EventType } from '@ag-ui/core';

export function detailFor(event: AGUIEvent): string {
  if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
    return event.delta;
  }
  if (event.type === EventType.TEXT_MESSAGE_CHUNK) {
    return event.delta ?? '';
  }
  if (event.type === EventType.TOOL_CALL_START) {
    return event.toolCallName;
  }
  if (event.type === EventType.TOOL_CALL_ARGS) {
    return event.delta;
  }
  if (event.type === EventType.TOOL_CALL_RESULT) {
    return event.content;
  }
  return '';
}
