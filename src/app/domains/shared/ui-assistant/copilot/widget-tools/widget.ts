import { InjectionToken, type Provider, type Type } from '@angular/core';
import { z } from 'zod';

/**
 * A flights UI component the model can render by calling its own frontend tool.
 * This is the domain-specific registry that stays flights code; CopilotKit owns
 * the tool lifecycle around it.
 */
export interface Widget {
  name: string;
  description: string;
  component: Type<unknown>;
  /** Zod schema of the props the model must supply (the tool parameters). */
  schema: z.ZodTypeAny;
  /**
   * Optional hook to freeze live client state into the widget props at the
   * moment the widget is rendered. Runs inside an Angular injection context, so
   * it may `inject(...)`. Use it for widgets whose data lives in a mutable store
   * (e.g. `planWidget`) so each rendered card stays immutable.
   */
  captureProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}

/** Identity helper that keeps name, description, component, and schema together. */
export function defineWidget<const TName extends string>(widget: {
  name: TName;
  description: string;
  component: Type<unknown>;
  schema: z.ZodTypeAny;
  captureProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}): Widget {
  return widget;
}

/**
 * Global registry mapping widget name to its definition. Each widget is exposed
 * as its own frontend tool (`createWidgetTool`), and the shared
 * `WidgetToolRenderer` looks the definition up by the tool-call name.
 */
export const WIDGET_REGISTRY = new InjectionToken<ReadonlyMap<string, Widget>>(
  'WIDGET_REGISTRY',
);

export function provideWidgets(widgets: readonly Widget[]): Provider {
  return {
    provide: WIDGET_REGISTRY,
    useValue: new Map(widgets.map((widget) => [widget.name, widget])),
  };
}
