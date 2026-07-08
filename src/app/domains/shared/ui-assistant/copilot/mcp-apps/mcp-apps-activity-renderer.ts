import { type AbstractAgent, type ActivityMessage } from '@ag-ui/client';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  type ActivityRenderer,
  type AngularActivityContentSchema,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';
import {
  type AgUiMcpAppsSnapshotContent,
  McpAppsWidgetComponent,
} from '@internal/ag-ui-client';

@Component({
  selector: 'app-mcp-apps-activity-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [McpAppsWidgetComponent],
  template: `<app-mcp-apps-widget [data]="content()" />`,
})
export class McpAppsActivityRenderer implements ActivityRenderer<AgUiMcpAppsSnapshotContent> {
  readonly activityType = input.required<string>();
  readonly content = input.required<AgUiMcpAppsSnapshotContent>();
  readonly message = input.required<ActivityMessage>();
  readonly agent = input<AbstractAgent | undefined>();
}

const mcpAppsContentSchema: AngularActivityContentSchema<AgUiMcpAppsSnapshotContent> =
  {
    safeParse: (content) => {
      if (!isMcpAppsSnapshotContent(content)) {
        return { success: false };
      }

      return {
        success: true,
        data: content,
      };
    },
  };

export const mcpAppsActivityRendererConfig: RenderActivityMessageConfig<AgUiMcpAppsSnapshotContent> =
  {
    activityType: 'mcp-apps',
    content: mcpAppsContentSchema,
    component: McpAppsActivityRenderer,
  };

function isMcpAppsSnapshotContent(
  content: unknown,
): content is AgUiMcpAppsSnapshotContent {
  if (!content || typeof content !== 'object') {
    return false;
  }

  const record = content as Partial<AgUiMcpAppsSnapshotContent>;

  return (
    typeof record.serverId === 'string' &&
    typeof record.resourceUri === 'string' &&
    !!record.toolInput &&
    typeof record.toolInput === 'object' &&
    !Array.isArray(record.toolInput) &&
    'result' in record
  );
}
