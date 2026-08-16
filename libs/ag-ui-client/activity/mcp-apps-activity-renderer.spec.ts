import { McpAppsWidgetComponent } from '../widgets/mcp-apps-widget';
import { McpAppsActivityRenderer } from './mcp-apps-activity-renderer';

const validSnapshot = {
  serverId: 'server-1',
  resourceUri: 'ui://widget.html',
  toolInput: { query: 'x' },
  result: { content: [] },
};

describe('McpAppsActivityRenderer', () => {
  const renderer = new McpAppsActivityRenderer();

  it('handles the mcp-apps activity type', () => {
    expect(renderer.activityType).toBe('mcp-apps');
  });

  it('builds an MCP apps widget from a valid snapshot', () => {
    const widget = renderer.buildWidget({
      messageId: 'm1',
      content: validSnapshot,
    });

    expect(widget).toEqual({
      kind: 'result',
      id: 'm1-mcp-apps',
      name: 'mcpAppsWidget',
      component: McpAppsWidgetComponent,
      props: { data: validSnapshot },
    });
  });

  it('rejects snapshots with missing fields', () => {
    const { serverId: _serverId, ...withoutServerId } = validSnapshot;

    expect(
      renderer.buildWidget({ messageId: 'm1', content: withoutServerId }),
    ).toBeNull();
    expect(
      renderer.buildWidget({
        messageId: 'm1',
        content: { ...validSnapshot, result: {} },
      }),
    ).toBeNull();
    expect(renderer.buildWidget({ messageId: 'm1', content: null })).toBeNull();
  });
});
