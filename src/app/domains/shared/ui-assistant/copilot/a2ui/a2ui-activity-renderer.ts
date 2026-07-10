import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import {
  type ActivityRenderer,
  type AngularActivityContentSchema,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

export interface A2uiSurfaceContent {
  operations: A2uiMessage[];
}

export const a2uiSurfaceContentSchema: AngularActivityContentSchema<A2uiSurfaceContent> =
  {
    safeParse: (content) =>
      isA2uiSurfaceContent(content)
        ? { success: true, data: content }
        : { success: false },
  };

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
export class A2uiActivityRenderer
  implements ActivityRenderer<A2uiSurfaceContent>, OnInit
{
  readonly activityType = input.required<string>();
  readonly content = input.required<A2uiSurfaceContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input.required<AbstractAgent | undefined>();

  private readonly renderer = inject(A2uiRendererService);

  ngOnInit(): void {
    // Feed the surface into the shared renderer HERE, not inside the `surfaceId`
    // computed. `processMessages` writes the renderer's version signal, and a
    // side effect / signal write inside a `computed` is invalid in Angular.
    // `ngOnInit` runs before this view is first rendered, so the surface is in
    // the model by the time `surfaceId` is read below.
    this.renderer.processMessages(this.content().operations);
  }

  protected readonly surfaceId = computed(() => {
    const surfaceId = getRenderedSurfaceId(this.content().operations);
    return surfaceId && this.renderer.surfaceGroup.getSurface(surfaceId)
      ? surfaceId
      : null;
  });
}

export const a2uiActivityRendererConfig: RenderActivityMessageConfig<A2uiSurfaceContent> =
  {
    activityType: 'a2ui-surface',
    content: a2uiSurfaceContentSchema,
    component: A2uiActivityRenderer,
  };

function isA2uiSurfaceContent(content: unknown): content is A2uiSurfaceContent {
  return (
    !!content &&
    typeof content === 'object' &&
    Array.isArray((content as { operations?: unknown }).operations)
  );
}

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
