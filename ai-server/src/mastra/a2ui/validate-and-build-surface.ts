import {
  A2UI_OPERATIONS_KEY,
  assembleOps,
  formatValidationErrors,
  validateA2UIComponents,
} from '@ag-ui/a2ui-toolkit';

import type { RenderA2uiInput } from './render-a2ui.schema.js';

export const A2UI_DEFAULT_CATALOG_ID =
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

export const RENDER_A2UI_TOOL_NAME = 'render_a2ui';

type ComponentEntry = Record<string, unknown>;

const SINGLE_CHILD_COMPONENTS = new Set(['Card', 'Button']);
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

export function validateAndBuildSurface(input: RenderA2uiInput) {
  const validation = validateA2UIComponents({
    components: input.components,
    data: input.data,
  });
  const report = [
    formatValidationErrors(validation.errors),
    ...childShapeErrors(input.components),
  ]
    .filter((line) => line.length > 0)
    .join('\n');
  if (report.length > 0) {
    throw new Error(`${RENDER_A2UI_TOOL_NAME}: invalid surface\n${report}`);
  }

  const operations = assembleOps({
    intent: 'create',
    surfaceId: input.surfaceId,
    catalogId: A2UI_DEFAULT_CATALOG_ID,
    components: input.components,
    data: input.data,
  });
  return { surfaceId: input.surfaceId, [A2UI_OPERATIONS_KEY]: operations };
}
