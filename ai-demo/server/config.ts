import type { MastraModelConfig } from '@mastra/core/llm';

/**
 * Central model used by all Mastra agents in this project.
 * Change this single value to switch the model everywhere.
 */
export const model: MastraModelConfig = 'openai/gpt-5.5';
// export const model: MastraModelConfig = 'google/gemini-flash-latest'; // Gemini Flash
