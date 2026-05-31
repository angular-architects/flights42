import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { getWeather } from './weather-api.js';

export const weatherTool = createTool({
  id: 'getWeather',
  description: 'Returns the current weather and temperature for a given city.',
  inputSchema: z.object({
    city: z.string().trim().min(1).describe('The name of the city.'),
  }),
  outputSchema: z.object({
    city: z.string(),
    condition: z.enum(['rainy', 'sunny', 'cloudy']),
    temperature: z.number(),
  }),
  execute: async ({ city }) => {
    return getWeather(city);
  },
});
