import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

import { model } from '../config.js';
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
import { planValidationGuardrail } from '../processors/plan-validation-guardrail.js';
import { searchFlightsTool } from '../tools/search-flights.js';
import { travelRefinementAgentPrompt } from './travel-refinement-agent.prompt.js';
import { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';

export const travelRefinementAgent = new Agent({
  id: 'travelRefinementAgent',
  name: 'Flight42 Travel Refinement',
  instructions: travelRefinementAgentPrompt,
  model: model,
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
  outputProcessors: [planValidationGuardrail],
  memory: new Memory(),
  defaultOptions: {
    maxSteps: 12,
    providerOptions: {
      openai: {
        parallelToolCalls: false,
        reasoningEffort: 'medium',
      } as OpenAILanguageModelResponsesOptions,
    },
  },
});
