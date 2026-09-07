import type { Context } from '@ag-ui/core';

import {
  A2UI_DEFAULT_CATALOG_ID,
  catalogToPromptSection,
  readCatalogId,
} from './catalog-context.js';

interface AgUiRequestContext {
  context?: Context[];
}

interface InstructionsParams {
  requestContext: { get: (key: string) => unknown };
}

export interface AddCustomCatalogInstructionsOptions {
  systemInstructions: (catalogId: string) => string;
  log?: boolean;
}

export function addCustomCatalogInstructions(
  options: AddCustomCatalogInstructionsOptions,
): (params: InstructionsParams) => string {
  return ({ requestContext }) => {
    const agUi = requestContext.get('ag-ui') as AgUiRequestContext | undefined;
    const catalogId = readCatalogId(agUi?.context) ?? A2UI_DEFAULT_CATALOG_ID;
    const catalogSection = catalogToPromptSection(agUi?.context);
    const base = options.systemInstructions(catalogId);
    const prompt = catalogSection ? `${base}\n\n${catalogSection}` : base;
    if (options.log) {
      console.log(
        `\n===== SYSTEM PROMPT =====\n\n${prompt}\n\n===== END SYSTEM PROMPT =====\n`,
      );
    }
    return prompt;
  };
}
