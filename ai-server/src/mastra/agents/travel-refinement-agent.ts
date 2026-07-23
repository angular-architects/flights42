import { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { modelAdvancedTasks } from '../config.js';
import { findHotelsTool } from '../tools/find-hotels.js';
import {
  addFlightToPlanTool,
  addHotelToPlanTool,
  getTravelPlanTool,
  removeFlightFromPlanTool,
  removeHotelFromPlanTool,
  replaceFlightInPlanTool,
  setTravelPlanTool,
} from '../tools/plan/index.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { travelRefinementAgentPrompt } from './travel-refinement-agent.prompt.js';

export const travelRefinementAgent = new Agent({
  id: 'travelRefinementAgent',
  name: 'Flight42 Travel Refinement',
  instructions: travelRefinementAgentPrompt,
  model: modelAdvancedTasks,
  tools: {
    searchFlightsTool,
    findHotelsTool,
    getTravelPlanTool,
    setTravelPlanTool,
    addFlightToPlanTool,
    removeFlightFromPlanTool,
    replaceFlightInPlanTool,
    addHotelToPlanTool,
    removeHotelFromPlanTool,
  },
  defaultOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: 'high',
      } as OpenAILanguageModelResponsesOptions,
    },
  },
  memory: new Memory(),
});
