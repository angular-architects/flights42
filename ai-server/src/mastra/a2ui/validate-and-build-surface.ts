import { A2UI_OPERATIONS_KEY } from '@ag-ui/a2ui-toolkit';

import { compileExpress } from './a2ui-express.js';
import { a2uiProcessor } from './a2ui-processor.js';

export const RENDER_A2UI_TOOL_NAME = 'render_a2ui';

export function validateAndBuildSurface(express: string) {
  const operations = compileExpress(a2uiProcessor, express);
  if (operations.length === 0) {
    throw new Error(`${RENDER_A2UI_TOOL_NAME}: the program renders no surface`);
  }
  return { [A2UI_OPERATIONS_KEY]: operations };
}
