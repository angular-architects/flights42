import { Agent } from '@mastra/core/agent';

import { modelAdvancedTasks } from '../config.js';
import type { OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';

const planFinalizerAgentPrompt = `
You are the Plan Finalizer, the last step of packageTourWorkflow. You receive the
original user request, the available flights per leg (in travel order) and the
available hotels per city. Pick exactly ONE flight per leg and ONE hotel per city
and return the final plan as structured output.

Rules:
- Only pick from the provided data, never invent. Keep flights in travel order.
- If a leg has no candidates, omit it from "flights" and note the missing route in
  "summary" (e.g. "no flight found for Wien → Graz").
- Match the user's hotel preference to a star rating (cheap/budget → 3★, standard
  or none → 4★, premium/luxus/5 Sterne → 5★) and pick the closest per city.
- "summary" is ONE short sentence in the user's language (dates, destinations);
  no flight numbers or stars.
`.trim();

export const planFinalizerAgent = new Agent({
  id: 'planFinalizerAgent',
  name: 'Flight42 Plan Finalizer',
  instructions: planFinalizerAgentPrompt,
  model: modelAdvancedTasks,
  defaultOptions: {
    providerOptions: {
      openai: {
        reasoningEffort: 'low',
        textVerbosity: 'low',
      } as OpenAILanguageModelResponsesOptions,
    },
  },
});
