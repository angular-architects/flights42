import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { createShowComponentsTool } from '@internal/ag-ui-server';
import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import {
  flightWidget,
  messageWidget,
  questionWidget,
} from '../widgets/index.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

const showComponents = createShowComponentsTool([
  messageWidget,
  flightWidget,
  questionWidget,
]);

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: ticketingAgentPrompt,
  model,
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    showComponents,
  },
  memory: new Memory(),
});
