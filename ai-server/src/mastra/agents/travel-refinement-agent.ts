import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { modelAdvancedTasks } from '../config.js';
import { findHotelsTool } from '../tools/find-hotels.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { travelRefinementAgentPrompt } from './travel-refinement-agent.prompt.js';
import { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';

export const travelRefinementAgent = new Agent({
  id: 'travelRefinementAgent',
  name: 'Flight42 Travel Refinement',
  instructions: travelRefinementAgentPrompt,
  model: modelAdvancedTasks,
  tools: { searchFlightsTool, findHotelsTool },
  memory: new Memory(),
  defaultOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: 'low',
        textVerbosity: 'low',
      } as OpenAILanguageModelResponsesOptions,
    },
  },
});
