import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  type ActivityRenderer,
  type AngularActivityContentSchema,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

import { type McpAppsSnapshotContent } from './mcp-apps.provider';
import { McpAppsWidgetComponent } from './mcp-apps-widget';

export const mcpAppsContentSchema: AngularActivityContentSchema<McpAppsSnapshotContent> =
  {
    safeParse: (content) =>
      isMcpAppsContent(content)
        ? { success: true, data: content }
        : { success: false },
  };

/**
 * CopilotKit activity renderer for `activityType: "mcp-apps"` snapshots. This
 * is the intended migration path for MCP Apps: the server keeps emitting the
 * snapshots and the client renders them through the iframe host.
 */
@Component({
  selector: 'app-mcp-apps-activity-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [McpAppsWidgetComponent],
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
    content: mcpAppsContentSchema,
    component: McpAppsActivityRenderer,
  };

function isMcpAppsContent(content: unknown): content is McpAppsSnapshotContent {
  if (!content || typeof content !== 'object') {
    return false;
  }

  const value = content as Partial<McpAppsSnapshotContent>;
  return (
    typeof value.serverId === 'string' &&
    typeof value.resourceUri === 'string' &&
    typeof value.toolInput === 'object' &&
    !!value.result &&
    typeof value.result === 'object' &&
    Array.isArray((value.result as { content?: unknown }).content)
  );
}
