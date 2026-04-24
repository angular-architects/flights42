import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import {
  catalogToPromptSection,
  logSystemPromptIfEnabled,
  renderA2uiTool,
} from '@internal/ag-ui-server';
import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

interface AgUiRuntimeContext {
  context?: { description?: string; value?: string }[];
}

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ({ requestContext }) => {
    const agUi = requestContext.get('ag-ui') as AgUiRuntimeContext | undefined;
    const catalogSection = catalogToPromptSection(agUi?.context);

    const fullPrompt = catalogSection
      ? `${ticketingAgentPrompt}\n\n${catalogSection}`
      : ticketingAgentPrompt;

    logSystemPromptIfEnabled('ticketingAgent', fullPrompt);

    return fullPrompt;
  },
  model,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    renderA2uiTool,
  },
  memory: new Memory(),
});
