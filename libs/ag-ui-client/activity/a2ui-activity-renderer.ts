import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import { inject, Injectable } from '@angular/core';

import { type AgUiResultWidget } from '../ag-ui-types';
import { A2uiSurfaceWidgetComponent } from '../widgets/a2ui-surface-widget';
import {
  type ActivityRenderer,
  type ActivityRendererContext,
} from './activity-renderer';

@Injectable()
export class A2uiActivityRenderer implements ActivityRenderer {
  readonly activityType = 'a2ui-surface';

  private readonly renderer = inject(A2uiRendererService);

  buildWidget({
    messageId,
    content,
  }: ActivityRendererContext): AgUiResultWidget | null {
    if (
      !content ||
      typeof content !== 'object' ||
      !('operations' in content) ||
      !Array.isArray((content as { operations?: unknown }).operations)
    ) {
      return null;
    }

    const operations = (content as { operations: A2uiMessage[] }).operations;
    this.renderer.processMessages(operations);

    const surfaceId = getRenderedSurfaceId(operations);
    if (!surfaceId || !this.renderer.surfaceGroup.getSurface(surfaceId)) {
      return null;
    }

    return {
      kind: 'result',
      id: `${messageId}-a2ui-${surfaceId}`,
      name: `a2ui_${messageId}`,
      component: A2uiSurfaceWidgetComponent,
      props: { surfaceId },
    };
  }
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
