import { Agent } from '@mastra/core/agent';

import { model } from './config.js';
import { weatherTool } from './weather-tool.js';

export const weatherAgent = new Agent({
  id: 'weatherAgent',
  name: 'Weather Assistant',
  instructions: `
You are a friendly weather assistant.

When the user asks about the weather in a city,
look it up. Then answer in one short, natural sentence that mentions the
condition and the temperature in degrees Celsius.
`.trim(),
  model,
  tools: { getWeather: weatherTool },
});
