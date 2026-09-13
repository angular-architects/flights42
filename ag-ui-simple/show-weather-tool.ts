import { type Tool } from '@ag-ui/core';
import { z } from 'zod';

const weatherSchema = z.object({
  condition: z.string().describe('e.g., sunny, cloudy, rainy.'),
  temperature: z.string().describe('e.g., 25°C, 77°F.'),
  wind: z.string().describe('e.g., 5 km/h, 3 mph.'),
});

export type Weather = z.infer<typeof weatherSchema>;

/**
 * Description of a client-side tool. The client announces it to the agent on
 * every run; the agent forwards it to the language model, which decides when
 * to call it. `parameters` has to be a JSON schema - here derived from Zod.
 */
export const showWeatherTool: Tool = {
  name: 'showWeather',
  description: 'Provide weather data the client can render.',
  parameters: z.toJSONSchema(weatherSchema),
};
