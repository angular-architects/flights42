import type { A2uiMessage } from '@a2ui/web_core/v0_9';

import type { AppliedMacros } from './apply-macros.js';

const A2UI_VERSION = 'v0.9' as const;

export function toA2uiMessages(
  surfaceId: string,
  catalogId: string,
  applied: AppliedMacros,
): A2uiMessage[] {
  const messages: A2uiMessage[] = [
    {
      version: A2UI_VERSION,
      createSurface: { surfaceId, catalogId },
    } as unknown as A2uiMessage,
    {
      version: A2UI_VERSION,
      updateComponents: { surfaceId, components: applied.components },
    } as unknown as A2uiMessage,
  ];
  for (const entry of applied.data) {
    messages.push({
      version: A2UI_VERSION,
      updateDataModel: { surfaceId, path: entry.path, value: entry.value },
    } as unknown as A2uiMessage);
  }
  return messages;
}
