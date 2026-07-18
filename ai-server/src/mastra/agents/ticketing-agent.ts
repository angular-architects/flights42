import {
  addCustomCatalogInstructions,
  renderA2uiTool,
} from '@internal/ag-ui-server';
import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';
import { Memory } from '@mastra/memory';

import { USE_MCP } from '../../../../libs/feature-flags/feature-flags.js';
import { model } from '../config.js';
import { bookFlightTool } from '../tools/book-flight.js';
import { cancelFlightTool } from '../tools/cancel-flight.js';
import { findBookedFlightsTool } from '../tools/find-booked-flights.js';
import { ticketingAgentPrompt } from './ticketing-agent.prompt.js';

const hotelsMcpTools = USE_MCP
  ? await new MCPClient({
      id: 'hotels-mcp-client',
      servers: { hotels: { url: new URL('http://127.0.0.1:3002/mcp') } },
    }).listTools()
  : {};

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
    ...hotelsMcpTools,
  },
  memory: new Memory(),
});
