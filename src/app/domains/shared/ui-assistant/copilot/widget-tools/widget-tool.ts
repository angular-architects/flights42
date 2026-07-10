import { z } from 'zod';

import { createFrontendTool } from '../../../util-copilotkit/tool-definition';
import { type Widget } from './widget';
import { WidgetToolRenderer } from './widget-tool-renderer';

/**
 * Turns a widget definition into a model-callable frontend tool that renders the
 * widget as its tool-call component ("component as tool"). The tool name is the
 * widget name and its parameters are the widget's props schema. The handler
 * passes the args through so the renderer can read them back.
 *
 * `followUp: false` makes the widget terminal — like the former `showComponents`
 * tool. A frontend-tool call ends the server run, and re-running to "continue"
 * after a purely-rendering tool is fragile (the server re-processes the client
 * tool call and its thought signature, which hangs). Instead the model is
 * prompted to emit all of a turn's widgets as parallel tool calls in ONE
 * assistant message; a single message can carry many tool calls, and they all
 * render.
 */
export function createWidgetTool(widget: Widget) {
  return createFrontendTool<Record<string, unknown>>({
    name: widget.name,
    description: widget.description,
    parameters: widget.schema as z.ZodType<Record<string, unknown>>,
    component: WidgetToolRenderer,
    followUp: false,
    handler: async (args) => args,
  });
}

export function widgetTools(widgets: readonly Widget[]) {
  return widgets.map(createWidgetTool);
}
