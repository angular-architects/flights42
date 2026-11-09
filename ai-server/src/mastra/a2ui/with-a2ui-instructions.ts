import { a2uiProcessor } from './a2ui-processor.js';

export function withA2uiInstructions(systemInstructions: string): string {
  const prompt = `
    ${systemInstructions}

    ${a2uiProcessor.promptSnippet}
  `;

  return prompt;
}
