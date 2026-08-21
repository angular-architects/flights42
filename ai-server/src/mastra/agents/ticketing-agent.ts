import {
  addCustomCatalogInstructions,
  renderA2uiTool,
} from '@internal/ag-ui-server';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config.js';
import { blockedWordsGuard } from '../processors/blocked-words-guard.js';
import { offTopicGuard } from '../processors/off-topic-guard.js';
import { promptInjectionGuard } from '../processors/prompt-injection-guard.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { hotelAgent } from './hotel-agent.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: addCustomCatalogInstructions({
    systemInstructions: ticketingAgentPrompt,
  }),
  model,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    renderA2uiTool,
  },
  agents: { hotelAgent },
  // inputProcessors: [blockedWordsGuard, offTopicGuard, promptInjectionGuard],
  memory: new Memory(),
});
