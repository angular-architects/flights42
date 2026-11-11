import { randomUUID } from 'node:crypto';

import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import { A2UI_CATALOG_ID } from '@flights42/a2ui-catalog/ticketing-extra-components';

import { expressToComponents } from '../a2ui/a2ui-express.js';
import { applyMacros } from '../a2ui/simple-macros/apply-macros.js';
import { toA2uiMessages } from '../a2ui/simple-macros/to-a2ui-messages.js';
import { dashboardMacros } from './dashboard-macros.js';
import { dashboardProcessor } from './dashboard-processor.js';

export interface CompiledDashboard {
  surfaceId: string;
  messages: A2uiMessage[];
}

export async function compileDashboard(
  express: string,
): Promise<CompiledDashboard> {
  const components = expressToComponents(dashboardProcessor, express);
  const applied = await applyMacros(components, dashboardMacros);
  const surfaceId = `dashboard-${randomUUID()}`;
  const messages = toA2uiMessages(surfaceId, A2UI_CATALOG_ID, applied);
  return { surfaceId, messages };
}
