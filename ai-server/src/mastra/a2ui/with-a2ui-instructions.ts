import { DEFAULT_GENERATION_GUIDELINES } from '@ag-ui/a2ui-toolkit';

import { customComponentsSection } from './a2ui-prompt-sections.js';

export function withA2uiInstructions(systemInstructions: string): string {
  // Alternative: read the custom catalog the client sends as AG-UI context.
  // Drawback: the client controls this prompt part (prompt injection).
  // const context = requestContext.get('ag-ui').context;
  // const catalogEntry = context.find((entry) => entry.description.startsWith('A2UI catalog capabilities'));
  // const customComponentsSection = `## Custom Components\n${catalogEntry.value}`;

  const prompt = `
    ${systemInstructions}

    ${DEFAULT_GENERATION_GUIDELINES}

    ${customComponentsSection}
  `;

  return prompt;
}
