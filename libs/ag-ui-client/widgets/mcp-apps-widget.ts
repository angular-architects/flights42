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
import { z } from 'zod';

import {
  type AgUiMcpAppsSnapshotContent,
  defineAgUiComponent,
} from '../ag-ui-types';
import { McpAppsClientService } from './mcp-apps-client';
import { MCP_APPS_CONFIG } from './mcp-apps.provider';

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
  private readonly clientService = inject(McpAppsClientService);

  readonly data = input.required<AgUiMcpAppsSnapshotContent>();

  private readonly appFrame =
    viewChild.required<ElementRef<HTMLIFrameElement>>('appFrame');

  private bridge: AppBridge | null = null;
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
      // All widgets share one MCP client; per-widget clients would exhaust
      // the browser's connection pool (~6 per host) via their SSE streams.
      const client = await this.clientService.getClient();
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
      this.bridge = bridge;

      await whenInitialized(bridge);

      const toolInput = { arguments: data.toolInput };
      bridge.sendToolInput(toolInput);
      bridge.sendToolResult(data.result);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Unable to render MCP App.',
      );
      frame.removeAttribute('srcdoc');
    }
  }

  private async disposeBridge(): Promise<void> {
    const bridge = this.bridge;
    if (!bridge) {
      return;
    }
    this.bridge = null;

    // Graceful shutdown
    await Promise.race([
      bridge.teardownResource({}).catch(() => undefined),
      delay(250),
    ]);
    await bridge.close().catch(() => undefined);
  }

  private async dispose(): Promise<void> {
    // The shared MCP client stays open; only the per-widget bridge goes away.
    await this.disposeBridge();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  component: McpAppsWidgetComponent,
  clientOnly: true,
  schema: mcpAppsSchema as z.ZodType<{ data: AgUiMcpAppsSnapshotContent }>,
});
