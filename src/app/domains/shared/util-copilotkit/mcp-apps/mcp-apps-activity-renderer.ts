import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  type ActivityRenderer,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

import {
  type McpAppsSnapshotContent,
  mcpAppsSnapshotContentSchema,
} from './mcp-apps-content';
import { McpAppsWidget } from './mcp-apps-widget';

@Component({
  selector: 'app-mcp-apps-activity-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [McpAppsWidget],
  template: `<app-mcp-apps-widget [data]="content()" />`,
})
export class McpAppsActivityRenderer implements ActivityRenderer<McpAppsSnapshotContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<McpAppsSnapshotContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input.required<AbstractAgent | undefined>();
}

export const mcpAppsActivityRendererConfig: RenderActivityMessageConfig<McpAppsSnapshotContent> =
  {
    activityType: 'mcp-apps',
    content: mcpAppsSnapshotContentSchema,
    component: McpAppsActivityRenderer,
  };
