import { catalogToPromptSection } from './catalog-to-prompt.js';
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
    const catalogSection = catalogToPromptSection(agUi?.context);
    const fullPrompt = catalogSection
      ? `${systemInstructions}\n\n${catalogSection}`
      : systemInstructions;
    if (log) {
      logSystemPrompt(fullPrompt);
    }
    return fullPrompt;
  };
}
