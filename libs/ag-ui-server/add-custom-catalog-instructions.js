import {
  A2UI_DEFAULT_CATALOG_ID,
  catalogToPromptSection,
  extractCatalogId,
} from './catalog-to-prompt.js';
import { logSystemPrompt } from './log-prompt.js';
/**
 * Builds a Mastra `instructions` callback that extends the given system
 * prompt with the custom-catalog section forwarded by `agUiResource` via the
 * `ag-ui` runtime context, and optionally logs the final prompt.
 */
export function addCustomCatalogInstructions(options) {
  const { systemInstructions, log = false } = options;
  return ({ requestContext }) => {
    const agUi = requestContext.get('ag-ui');
    const catalogId =
      extractCatalogId(agUi?.context) ?? A2UI_DEFAULT_CATALOG_ID;
    const catalogSection = catalogToPromptSection(agUi?.context);
    const baseInstructions = systemInstructions(catalogId);
    const fullPrompt = catalogSection
      ? `${baseInstructions}\n\n${catalogSection}`
      : baseInstructions;
    if (log) {
      logSystemPrompt(fullPrompt);
    }
    return fullPrompt;
  };
}
