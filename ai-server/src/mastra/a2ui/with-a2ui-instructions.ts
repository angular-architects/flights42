import {
  BASIC_COMPONENTS,
  Catalog,
  MessageProcessor,
} from '@a2ui/web_core/v0_9';
import { DEFAULT_GENERATION_GUIDELINES } from '@ag-ui/a2ui-toolkit';
import type { Context } from '@ag-ui/core';
import { ADD_BASIC_CATALOG, DISPLAY_PROMPT } from '@flights42/feature-flags';

import { A2UI_DEFAULT_CATALOG_ID } from './render-a2ui.tool.js';

const CATALOG_CAPABILITIES_DESCRIPTION = 'A2UI catalog capabilities';

interface RequestContextReader {
  get(key: string): unknown;
}

interface AgUiRequestContext {
  context?: Context[];
}

interface InstructionsParams {
  requestContext: RequestContextReader;
}

const [basicCatalog] =
  new MessageProcessor([
    new Catalog(A2UI_DEFAULT_CATALOG_ID, BASIC_COMPONENTS),
  ]).getClientCapabilities({ includeInlineCatalogs: true })['v0.9']
    ?.inlineCatalogs ?? [];

const basicComponentsSection = `## Basic Components\n${JSON.stringify(basicCatalog?.components ?? {}, null, 2)}`;

function readAgUiContext(
  requestContext: RequestContextReader | undefined,
): Context[] | undefined {
  const agUi = requestContext?.get('ag-ui') as AgUiRequestContext | undefined;
  return agUi?.context;
}

function readCatalogCapabilities(
  context: readonly Context[] | undefined,
): string | undefined {
  return context?.find((entry) =>
    entry.description.startsWith(CATALOG_CAPABILITIES_DESCRIPTION),
  )?.value;
}

export function withA2uiInstructions(
  systemInstructions: string,
): (params: InstructionsParams) => string {
  return ({ requestContext }) => {
    const sections = [systemInstructions, DEFAULT_GENERATION_GUIDELINES];

    if (ADD_BASIC_CATALOG) {
      sections.push(basicComponentsSection);
    }

    const customComponents = readCatalogCapabilities(
      readAgUiContext(requestContext),
    );
    if (customComponents) {
      sections.push(`## Custom Components\n${customComponents}`);
    }

    const prompt = sections.join('\n\n');

    if (DISPLAY_PROMPT) {
      console.log('prompt', prompt);
    }

    return prompt;
  };
}
