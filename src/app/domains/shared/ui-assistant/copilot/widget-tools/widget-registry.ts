import { InjectionToken, type Provider, type Type } from '@angular/core';

/**
 * Render metadata a component-tool carries for the shared WidgetToolRenderer:
 * which component to render and an optional hook to freeze live client state
 * into the props at render time. CopilotKit's ToolRenderer only receives the
 * tool call, so this metadata reaches the renderer through WIDGET_REGISTRY
 * rather than through the tool call itself.
 */
export interface ComponentToolRender {
  component: Type<unknown>;
  /**
   * Optional hook to freeze live client state into the props at the moment the
   * component is rendered. Runs inside an Angular injection context, so it may
   * `inject(...)`. Use it for components whose data lives in a mutable store
   * (e.g. `planWidget`) so each rendered card stays immutable.
   */
  captureProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}

/** Key under which `componentTool(...)` stashes its render metadata on the tool. */
export const RENDER_META: unique symbol = Symbol('componentToolRender');

/** A component-tool as the registry sees it: a named tool carrying render metadata. */
interface WithRenderMeta {
  name: string;
  [RENDER_META]: ComponentToolRender;
}

/**
 * Maps a tool-call name to the render metadata of its component-tool. The shared
 * `WidgetToolRenderer` looks the entry up by the tool-call name to render the
 * right component with the call arguments.
 */
export const WIDGET_REGISTRY = new InjectionToken<
  ReadonlyMap<string, ComponentToolRender>
>('WIDGET_REGISTRY');

export function provideWidgets(tools: readonly WithRenderMeta[]): Provider {
  return {
    provide: WIDGET_REGISTRY,
    useValue: new Map(tools.map((tool) => [tool.name, tool[RENDER_META]])),
  };
}
