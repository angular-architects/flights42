import { catalogToPromptSection } from './catalog-to-prompt.js';
import { logSystemPrompt } from './log-prompt.js';

interface AgUiRuntimeContext {
  context?: { description?: string; value?: string }[];
}

interface InstructionsParams {
  requestContext: { get: (key: string) => unknown };
}

export interface AddCustomCatalogInstructionsOptions {
  /** Static system prompt the catalog section is appended to. */
  systemInstructions: string;
  /** When `true` the resulting prompt is logged. Defaults to `false`. */
  log?: boolean;
}

/**
 * Builds a Mastra `instructions` callback that extends the given system
 * prompt with the custom-catalog section forwarded by `agUiResource` via the
 * `ag-ui` runtime context, and optionally logs the final prompt.
 */
export function addCustomCatalogInstructions(
  options: AddCustomCatalogInstructionsOptions,
): (params: InstructionsParams) => string {
  const { systemInstructions, log = false } = options;

  return ({ requestContext }) => {
    const agUi = requestContext.get('ag-ui') as AgUiRuntimeContext | undefined;
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
