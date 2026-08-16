import { Injectable } from '@angular/core';

import {
  type AgUiMcpAppsSnapshotContent,
  type AgUiResultWidget,
} from '../ag-ui-types';
import { McpAppsWidgetComponent } from '../widgets/mcp-apps-widget';
import {
  type ActivityRenderer,
  type ActivityRendererContext,
} from './activity-renderer';

@Injectable()
export class McpAppsActivityRenderer implements ActivityRenderer {
  readonly activityType = 'mcp-apps';

  buildWidget({
    messageId,
    content,
  }: ActivityRendererContext): AgUiResultWidget | null {
    if (!isMcpAppsSnapshotContent(content)) {
      return null;
    }

    return {
      kind: 'result',
      id: `${messageId}-mcp-apps`,
      name: 'mcpAppsWidget',
      component: McpAppsWidgetComponent,
      props: { data: content },
    };
  }
}

function isMcpAppsSnapshotContent(
  value: unknown,
): value is AgUiMcpAppsSnapshotContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { serverId?: unknown }).serverId === 'string' &&
    typeof (value as { resourceUri?: unknown }).resourceUri === 'string' &&
    typeof (value as { toolInput?: unknown }).toolInput === 'object' &&
    isCallToolResult((value as { result?: unknown }).result)
  );
}

function isCallToolResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { content?: unknown }).content)
  );
}
