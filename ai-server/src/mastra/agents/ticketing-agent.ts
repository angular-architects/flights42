// import { initMcpServer } from '@internal/ag-ui-server';
import {
  addCustomCatalogInstructions,
  renderA2uiTool,
} from '@internal/ag-ui-server';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

// const hotelsMcpTools = await initMcpServer({
//   serverId: 'hotels',
//   url: new URL('http://127.0.0.1:3002/mcp'),
// });

export const ticketingAgent = new Agent({
  id: 'ticketingAgent',
  name: 'Flight42 Ticketing Assistant',
  instructions: addCustomCatalogInstructions({
    systemInstructions: ticketingAgentPrompt,
  }),
  model,
  // defaultOptions: {
  //   providerOptions: {
  //     openai: {
  //       reasoningEffort: 'high',
  //     } as OpenAILanguageModelResponsesOptions,
  //   },
  // },
  tools: {
    findBookedFlightsTool,
    bookFlightTool,
    cancelFlightTool,
    renderA2uiTool,
    // ...hotelsMcpTools,
  },
  memory: new Memory(),
});
