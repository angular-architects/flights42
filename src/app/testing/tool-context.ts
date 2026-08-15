import { HttpAgent } from '@ag-ui/client';
import { type FrontendToolHandlerContext } from '@copilotkit/core';

/**
 * Fully typed FrontendToolHandlerContext for handler tests — no cast needed.
 * The agent is a real HttpAgent that is never run, and the toolCall carries
 * the given tool name and arguments.
 */
export function makeToolContext(
  name = 'test-tool',
  args: Record<string, unknown> = {},
): FrontendToolHandlerContext {
  return {
    toolCall: {
      id: 'tool-call-test',
      type: 'function',
      function: { name, arguments: JSON.stringify(args) },
    },
    agent: new HttpAgent({ url: 'http://mock.invalid/never-called' }),
  };
}
