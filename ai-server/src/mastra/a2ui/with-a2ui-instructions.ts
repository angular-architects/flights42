import {
  BASIC_COMPONENTS,
  Catalog,
  MessageProcessor,
} from '@a2ui/web_core/v0_9';
import {
  DEFAULT_GENERATION_GUIDELINES,
  splitA2UISchemaContext,
} from '@ag-ui/a2ui-toolkit';
import { ADD_BASIC_CATALOG, DISPLAY_PROMPT } from '@flights42/feature-flags';

import {
  A2UI_DEFAULT_CATALOG_ID,
  readAgUiContext,
  type RequestContextReader,
} from './catalog-context.js';

interface InstructionsParams {
  requestContext: RequestContextReader;
}

const [basicCatalog] =
  new MessageProcessor([
    new Catalog(A2UI_DEFAULT_CATALOG_ID, BASIC_COMPONENTS),
  ]).getClientCapabilities({ includeInlineCatalogs: true })['v0.9']
    ?.inlineCatalogs ?? [];

const basicComponentsSection = `## Basic Components\n${JSON.stringify(basicCatalog?.components ?? {}, null, 2)}`;

export function withA2uiInstructions(
  systemInstructions: string,
): (params: InstructionsParams) => string {
  return ({ requestContext }) => {
    const [schema] = splitA2UISchemaContext(readAgUiContext(requestContext));
    const sections = [systemInstructions, DEFAULT_GENERATION_GUIDELINES];
    if (ADD_BASIC_CATALOG) {
      sections.push(basicComponentsSection);
    }
    if (schema) {
      sections.push(`## Custom Components\n${schema}`);
    }
    const prompt = sections.join('\n\n');
    if (DISPLAY_PROMPT) {
      console.log('prompt', prompt);
    }
    return prompt;
  };
}
