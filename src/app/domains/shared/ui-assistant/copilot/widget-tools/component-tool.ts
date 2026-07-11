import { type Type } from '@angular/core';
import { type FrontendToolConfig } from '@copilotkit/angular';
import { z } from 'zod';

import {
  createFrontendTool,
  type WithoutAgentId,
} from '../../../util-copilotkit/tool-definition';
import { type ComponentToolRender, RENDER_META } from './widget-registry';
import { WidgetToolRenderer } from './widget-tool-renderer';

/**
 * A frontend tool the model calls to render a UI component ("component as
 * tool"). It is an ordinary CopilotKit frontend tool that additionally carries
 * the render metadata `provideWidgets` needs to wire up the shared renderer.
 */
export type ComponentTool = WithoutAgentId<
  FrontendToolConfig<Record<string, unknown>>
> & { readonly [RENDER_META]: ComponentToolRender };

/**
 * Defines a component-tool. The tool name IS its model-facing name — keep the
 * `Widget` suffix (e.g. `flightWidget`) to signal it renders UI rather than
 * acting, as opposed to action tools like `findFlightsTool` — and its
 * parameters are the component's props schema.
 *
 * `followUp: false` keeps it terminal: once a turn's component-tools are
 * rendered the run ends, so the loading indicator stops immediately with no
 * extra (empty) follow-up run to wait through. The shared `WidgetToolRenderer`
 * reads props from the tool call (not the handler result), so the handler only
 * needs to acknowledge.
 */
export function componentTool(config: {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  component: Type<unknown>;
  captureProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}): ComponentTool {
  const tool = createFrontendTool<Record<string, unknown>>({
    name: config.name,
    description: config.description,
    parameters: config.schema as z.ZodType<Record<string, unknown>>,
    component: WidgetToolRenderer,
    followUp: false,
    handler: async () => ({ shown: true }),
  });

  return Object.assign(tool, {
    [RENDER_META]: {
      component: config.component,
      captureProps: config.captureProps,
    } satisfies ComponentToolRender,
  });
}
