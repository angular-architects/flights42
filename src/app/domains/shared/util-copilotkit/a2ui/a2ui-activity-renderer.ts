import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  type ActivityRenderer,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';
import { z } from 'zod';

export const a2uiSurfaceContentSchema = z.object({
  operations: z.array(z.custom<A2uiMessage>()),
});

export type A2uiSurfaceContent = z.infer<typeof a2uiSurfaceContentSchema>;

/**
 * CopilotKit activity renderer for `activityType: "a2ui-surface"` snapshots.
 * Feeds the emitted A2UI operations into the existing `@a2ui/angular/v0_9`
 * renderer and shows the resulting surface. Kept as legacy A2UI wiring: it does
 * not adapt the catalog to `@copilotkit/a2ui-renderer`.
 */
@Component({
  selector: 'app-a2ui-activity-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent],
  template: `
    @let surface = surfaceId();
    @if (surface) {
      <a2ui-v09-surface [surfaceId]="surface" />
    }
  `,
})
export class A2uiActivityRenderer implements ActivityRenderer<A2uiSurfaceContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<A2uiSurfaceContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input.required<AbstractAgent | undefined>();

  private readonly renderer = inject(A2uiRendererService);

  constructor() {
    effect(() => {
      this.renderer.processMessages(this.content().operations);
    });
  }

  protected readonly surfaceId = computed(() =>
    getRenderedSurfaceId(this.content().operations),
  );
}

export const a2uiActivityRendererConfig: RenderActivityMessageConfig<A2uiSurfaceContent> =
  {
    activityType: 'a2ui-surface',
    content: a2uiSurfaceContentSchema,
    component: A2uiActivityRenderer,
  };

function getRenderedSurfaceId(operations: A2uiMessage[]): string | null {
  for (const operation of operations) {
    if ('createSurface' in operation && operation.createSurface.surfaceId) {
      return operation.createSurface.surfaceId;
    }

    if (
      'updateComponents' in operation &&
      operation.updateComponents.surfaceId
    ) {
      return operation.updateComponents.surfaceId;
    }

    if ('updateDataModel' in operation && operation.updateDataModel.surfaceId) {
      return operation.updateDataModel.surfaceId;
    }
  }
  return null;
}
