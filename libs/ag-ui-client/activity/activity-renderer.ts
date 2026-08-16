import {
  type EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
  type Type,
} from '@angular/core';

import { type AgUiResultWidget } from '../ag-ui-types';

export interface ActivityRendererContext {
  messageId: string;
  content: unknown;
}

/**
 * Plugin for ACTIVITY_SNAPSHOT events. The implementation registered for the
 * event's `activityType` builds the widget that is upserted (by widget id)
 * into the message object model.
 */
export interface ActivityRenderer {
  readonly activityType: string;

  /**
   * Runs at ACTIVITY_SNAPSHOT time (may perform side effects, e.g. feeding
   * A2UI operations into the renderer service). Returns the widget to upsert,
   * or `null` to ignore the snapshot.
   */
  buildWidget(context: ActivityRendererContext): AgUiResultWidget | null;
}

export const ACTIVITY_RENDERERS = new InjectionToken<
  readonly ActivityRenderer[]
>('ACTIVITY_RENDERERS');

export function provideActivityRenderer(
  renderer: Type<ActivityRenderer>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ACTIVITY_RENDERERS, useClass: renderer, multi: true },
  ]);
}

export type ActivityRendererMap = ReadonlyMap<string, ActivityRenderer>;
