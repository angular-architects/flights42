import { z } from 'zod';

import { createFrontendTool } from '../../../util-copilotkit/tool-definition';
import { type Widget } from './widget';
import { WidgetToolRenderer } from './widget-tool-renderer';

/**
 * Turns a widget definition into a model-callable frontend tool that renders the
 * widget as its tool-call component ("component as tool"). The tool name is the
 * widget name and its parameters are the widget's props schema.
 *
 * `followUp: false` keeps the widget terminal: once a turn's widgets are
 * rendered the run ends, so the loading indicator stops immediately with no
 * extra (empty) follow-up run to wait through. This is a standard CopilotKit
 * tool flag, not custom infrastructure.
 *
 * It does NOT drive reliability: `followUp` is never sent to the model (only
 * name/description/parameters are), so batching all of an answer's widgets into
 * one assistant message is a matter of the prompt, not this flag. The renderer
 * reads props from the tool call, not the handler result, so the handler only
 * needs to acknowledge.
 */
export function createWidgetTool(widget: Widget) {
  return createFrontendTool<Record<string, unknown>>({
    name: widget.name,
    description: widget.description,
    parameters: widget.schema as z.ZodType<Record<string, unknown>>,
    component: WidgetToolRenderer,
    followUp: false,
    handler: async () => ({ shown: true }),
  });
}

export function widgetTools(widgets: readonly Widget[]) {
  return widgets.map(createWidgetTool);
}
