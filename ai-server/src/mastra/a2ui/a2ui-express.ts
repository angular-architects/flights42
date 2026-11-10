import {
  type A2uiRequestProcessor,
  type AgentToRendererMessage,
} from '@a2ui/agent';

export function compileExpress(
  processor: A2uiRequestProcessor,
  express: string,
): AgentToRendererMessage[] {
  const parts = processor.parseResponse(express);
  return parts.flatMap((part) => (part.type === 'text' ? [] : part.a2ui));
}
