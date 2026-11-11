import {
  type A2uiRequestProcessor,
  type AgentToRendererMessage,
} from '@a2ui/agent';
import { DISPLAY_DSL } from '@flights42/feature-flags';

import type { A2uiComponent } from './simple-macros/macro.js';

export function compileExpress(
  processor: A2uiRequestProcessor,
  express: string,
): AgentToRendererMessage[] {
  if (DISPLAY_DSL) {
    console.log('DSL', express);
  }

  const parts = processor.parseResponse(express);
  return parts.flatMap((part) => (part.type === 'text' ? [] : part.a2ui));
}

export function expressToComponents(
  processor: A2uiRequestProcessor,
  express: string,
): A2uiComponent[] {
  const messages = compileExpress(processor, express);
  const components = messages.flatMap((message) => extractComponents(message));
  if (components.length === 0) {
    throw new Error('The express program renders no components');
  }
  return components;
}

function extractComponents(message: AgentToRendererMessage): A2uiComponent[] {
  if (!('updateComponents' in message)) {
    return [];
  }
  return message.updateComponents.components;
}
