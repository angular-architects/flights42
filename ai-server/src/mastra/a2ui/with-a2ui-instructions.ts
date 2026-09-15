import {
  DEFAULT_GENERATION_GUIDELINES,
  splitA2UISchemaContext,
} from '@ag-ui/a2ui-toolkit';

import {
  readAgUiContext,
  type RequestContextReader,
} from './catalog-context.js';

interface InstructionsParams {
  requestContext: RequestContextReader;
}

export function withA2uiInstructions(
  systemInstructions: string,
): (params: InstructionsParams) => string {
  return ({ requestContext }) => {
    const [schema] = splitA2UISchemaContext(readAgUiContext(requestContext));
    const sections = [systemInstructions, DEFAULT_GENERATION_GUIDELINES];
    if (schema) {
      sections.push(`## Available Components\n${schema}`);
    }
    return sections.join('\n\n');
  };
}
