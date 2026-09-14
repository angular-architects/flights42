import {
  A2UI_OPERATIONS_KEY,
  assembleOps,
  formatValidationErrors,
  validateA2UIComponents,
} from '@ag-ui/a2ui-toolkit';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import {
  A2UI_DEFAULT_CATALOG_ID,
  readAgUiContext,
  readCatalogId,
} from './catalog-context.js';

export const RENDER_A2UI_TOOL_NAME = 'render_a2ui';

export const renderA2uiInputSchema = z.object({
  surfaceId: z
    .string()
    .describe('Unique id for the surface, e.g. "booked-flights-table".'),
  components: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      'Flat A2UI v0.9 component array. Exactly one entry must have id "root".',
    ),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Initial surface data model for { "path": "/..." } bindings (forms, lists).',
    ),
});
export type RenderA2uiInput = z.infer<typeof renderA2uiInputSchema>;

type ComponentEntry = Record<string, unknown>;

const SINGLE_CHILD_COMPONENTS = new Set(['Card', 'Button', 'Modal']);
const MULTI_CHILD_COMPONENTS = new Set(['Row', 'Column', 'List']);

function childShapeErrors(components: ComponentEntry[]): string[] {
  const errors: string[] = [];
  for (const component of components) {
    const name = component['component'];
    if (typeof name !== 'string') {
      continue;
    }
    const id =
      typeof component['id'] === 'string' ? component['id'] : '<unknown>';
    if (
      SINGLE_CHILD_COMPONENTS.has(name) &&
      Array.isArray(component['children'])
    ) {
      errors.push(
        `- [child_shape] components[id=${id}]: ${name} uses "children", but ${name} takes a SINGLE "child" (one component id). To show multiple elements, wrap them in a Column or Row and set that container's id as "child".`,
      );
    }
    if (
      MULTI_CHILD_COMPONENTS.has(name) &&
      typeof component['child'] === 'string'
    ) {
      errors.push(
        `- [child_shape] components[id=${id}]: ${name} uses "child", but ${name} takes a "children" array of component ids.`,
      );
    }
  }
  return errors;
}

export const renderA2uiTool = createTool({
  id: RENDER_A2UI_TOOL_NAME,
  description:
    'Render a custom A2UI surface. Follow the A2UI Protocol Instructions in the system prompt.',
  inputSchema: renderA2uiInputSchema,
  execute: async ({ surfaceId, components, data }, context) => {
    const report = [
      formatValidationErrors(
        validateA2UIComponents({ components, data }).errors,
      ),
      ...childShapeErrors(components),
    ]
      .filter((line) => line.length > 0)
      .join('\n');
    if (report.length > 0) {
      throw new Error(`${RENDER_A2UI_TOOL_NAME}: invalid surface\n${report}`);
    }

    const catalogId =
      readCatalogId(readAgUiContext(context.requestContext)) ??
      A2UI_DEFAULT_CATALOG_ID;
    const operations = assembleOps({
      intent: 'create',
      surfaceId,
      catalogId,
      components,
      data,
    });
    return { surfaceId, [A2UI_OPERATIONS_KEY]: operations };
  },
});
