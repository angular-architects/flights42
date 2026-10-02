import { A2uiRendererService, SurfaceComponent } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  type ActivityRenderer,
  CopilotA2UIRecovery,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';
import { z } from 'zod';

const a2uiOperationsSchema = z.array(z.custom<A2uiMessage>());

export const a2uiSurfaceContentSchema = z
  .object({
    a2ui_operations: a2uiOperationsSchema.optional(),
    operations: a2uiOperationsSchema.optional(),
    status: z.enum(['building', 'retrying', 'failed']).optional(),
  })
  .passthrough();

export type A2uiSurfaceContent = z.infer<typeof a2uiSurfaceContentSchema>;

export function getSurfaceOperations(
  content: A2uiSurfaceContent,
): A2uiMessage[] {
  return content.a2ui_operations ?? content.operations ?? [];
}

@Component({
  selector: 'app-a2ui-activity-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SurfaceComponent, CopilotA2UIRecovery],
  host: { class: 'a2ui-surface' },
  template: `
    @let surface = surfaceId();
    @if (surface) {
      <a2ui-v09-surface [surfaceId]="surface" />
    } @else if (content().status) {
      <copilot-a2ui-recovery [content]="content()" />
    }
  `,
})
export class A2uiActivityRenderer implements ActivityRenderer<A2uiSurfaceContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<A2uiSurfaceContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input.required<AbstractAgent | undefined>();

  private readonly renderer = inject(A2uiRendererService);
  private renderedSurfaceId: string | null = null;

  constructor() {
    effect(() => {
      const operations = getSurfaceOperations(this.content());
      const surfaceId = getRenderedSurfaceId(operations);
      if (!surfaceId) {
        return;
      }

      if (surfaceId === this.renderedSurfaceId) {
        this.renderer.processMessages(
          operations.filter((operation) => !('createSurface' in operation)),
        );
        return;
      }

      this.releaseSurface();
      this.renderedSurfaceId = surfaceId;
      this.renderer.processMessages(operations);
    });

    inject(DestroyRef).onDestroy(() => {
      this.releaseSurface();
    });
  }

  private releaseSurface(): void {
    if (this.renderedSurfaceId) {
      this.renderer.surfaceGroup.deleteSurface(this.renderedSurfaceId);
      this.renderedSurfaceId = null;
    }
  }

  protected readonly surfaceId = computed(() =>
    getRenderedSurfaceId(getSurfaceOperations(this.content())),
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
