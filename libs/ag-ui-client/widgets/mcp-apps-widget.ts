import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';

import {
  type AgUiMcpAppsSnapshotContent,
  defineAgUiComponent,
} from '../ag-ui-types';
import { MCP_APPS_CONFIG, MCP_APPS_SERVER_URL } from './mcp-apps.provider';

@Component({
  selector: 'app-mcp-apps-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p class="mcp-apps-error">{{ error() }}</p>
    }

    <iframe #appFrame class="mcp-apps-frame"></iframe>
  `,
  styles: `
    .mcp-apps-frame {
      display: block;
      width: 100%;
      min-height: 260px;
      border: 0;
      background: transparent;
    }

    .mcp-apps-error {
      margin: 20px 0;
      padding: 16px 0;
      color: darkred;
    }
  `,
})
export class McpAppsWidgetComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly mcpAppsConfig = inject(MCP_APPS_CONFIG);
  private readonly mcpAppsServerUrl = inject(MCP_APPS_SERVER_URL);

  readonly data = input.required<AgUiMcpAppsSnapshotContent>();

  private readonly appFrame =
    viewChild.required<ElementRef<HTMLIFrameElement>>('appFrame');

  private bridge: AppBridge | null = null;
  private client: Client | null = null;
  protected readonly error = signal('');

  constructor() {
    this.destroyRef.onDestroy(() => {
      void this.dispose();
    });

    afterNextRender(() => {
      const frame = this.appFrame().nativeElement;
      const data = this.data();
      void this.renderApp(frame, data);
    });
  }

  private async renderApp(
    frame: HTMLIFrameElement,
    data: AgUiMcpAppsSnapshotContent,
  ): Promise<void> {
    this.error.set('');

    try {
      const client = await this.getClient();
      const resource = await client.readResource({ uri: data.resourceUri });
      const content = resource.contents[0] as { text: string };
      const html = content.text;

      frame.setAttribute('sandbox', 'allow-scripts allow-forms');

      const bridge = new AppBridge(
        client,
        this.mcpAppsConfig.hostInfo,
        this.mcpAppsConfig.hostCapabilities,
        {
          hostContext: {
            ...this.mcpAppsConfig.hostContext,
            containerDimensions: {
              width: Math.round(frame.clientWidth || 640),
              maxHeight: 5000,
            },
          },
        },
      );

      bridge.onopenlink = async ({ url }) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        return {};
      };
      bridge.onloggingmessage = ({ level, data: logData }) => {
        console.info('[MCP App]', level, logData);
      };
      bridge.onsizechange = async ({ height }) => {
        if (typeof height === 'number' && height > 0) {
          frame.style.height = `${Math.ceil(height)}px`;
        }
      };
      bridge.onrequestdisplaymode = async () => ({ mode: 'inline' });

      frame.srcdoc = html;
      await bridge.connect(
        new PostMessageTransport(frame.contentWindow!, frame.contentWindow!),
      );

      await whenInitialized(bridge);

      const toolInput = { arguments: data.toolInput };
      bridge.sendToolInput(toolInput);
      bridge.sendToolResult(data.result);

      this.bridge = bridge;
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Unable to render MCP App.',
      );
      frame.removeAttribute('srcdoc');
    }
  }

  private async disposeBridge(): Promise<void> {
    if (this.bridge) {
      await this.bridge.teardownResource({}).catch(() => undefined);
      await this.bridge.close().catch(() => undefined);
      this.bridge = null;
    }
  }

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = await this.createClient();
    }

    return this.client;
  }

  private async createClient(): Promise<Client> {
    const client = new Client({
      name: 'MCP Host',
      version: '1.0.0',
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(this.mcpAppsServerUrl),
    );

    await client.connect(transport);
    return client;
  }

  private async disposeClient(): Promise<void> {
    const client = this.client;

    this.client = null;

    if (client) {
      await client.close().catch(() => undefined);
    }
  }

  private async dispose(): Promise<void> {
    await this.disposeBridge();
    await this.disposeClient();
  }
}

function whenInitialized(bridge: AppBridge): Promise<void> {
  return new Promise((resolve) => {
    bridge.oninitialized = () => {
      resolve();
    };
  });
}

const mcpAppsSchema = z.object({
  data: z.object({
    serverId: z.string(),
    resourceUri: z.string(),
    result: z.unknown(),
    toolInput: z.record(z.string(), z.unknown()),
  }),
});

export const mcpAppsWidgetComponent = defineAgUiComponent({
  name: 'mcpAppsWidget',
  description: 'Renders an interactive MCP App inside an iframe.',
  clientOnly: true,
  component: McpAppsWidgetComponent,
  schema: mcpAppsSchema as z.ZodType<{ data: AgUiMcpAppsSnapshotContent }>,
});
