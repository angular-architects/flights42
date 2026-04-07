import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  AppBridge,
  buildAllowAttribute,
  type McpUiResourcePermissions,
  PostMessageTransport,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  CallToolResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  type AgUiMcpAppsSnapshotContent,
  defineAgUiComponent,
} from '@internal/ag-ui-client';
import { z } from 'zod';

import { ConfigService } from '../../util-common/config-service';
import { MCP_APPS_CONFIG } from './mcp-apps.provider';

@Component({
  selector: 'app-mcp-apps-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <p class="mcp-apps-error">{{ error() }}</p>
    } @else {
      <iframe #appFrame class="mcp-apps-frame"></iframe>
    }
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
  private readonly config = inject(ConfigService);
  private readonly mcpAppsConfig = inject(MCP_APPS_CONFIG);

  readonly serverId = input.required<string>();
  readonly resourceUri = input.required<string>();
  readonly result = input.required<unknown>();
  readonly toolInput = input.required<Record<string, unknown>>();

  protected readonly error = signal('');

  private readonly appFrame =
    viewChild.required<ElementRef<HTMLIFrameElement>>('appFrame');

  private bridge: AppBridge | null = null;
  private client: Client | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect((onCleanup) => {
      const frame = this.appFrame().nativeElement;
      const data: AgUiMcpAppsSnapshotContent = {
        serverId: this.serverId(),
        resourceUri: this.resourceUri(),
        result: this.result(),
        toolInput: this.toolInput(),
      };

      let disposed = false;
      onCleanup(() => {
        disposed = true;
        void this.disposeBridge();
      });

      void this.renderApp(frame, data, () => disposed);
    });
  }

  private async renderApp(
    frame: HTMLIFrameElement,
    data: AgUiMcpAppsSnapshotContent,
    isDisposed: () => boolean,
  ): Promise<void> {
    await this.disposeBridge();
    this.error.set('');

    try {
      const client = new Client({
        name: 'Flights42 MCP Host',
        version: '1.0.0',
      });
      const transport = new StreamableHTTPClientTransport(
        new URL(this.config.mcpServerUrl),
      );

      await client.connect(transport);
      if (isDisposed()) {
        await client.close();
        return;
      }

      const resource = await client.readResource({ uri: data.resourceUri });
      const { html, permissions } = extractHtmlResource(resource);
      if (isDisposed()) {
        await client.close();
        return;
      }

      frame.setAttribute(
        'sandbox',
        'allow-scripts allow-forms allow-same-origin',
      );
      const allowAttribute = buildAllowAttribute(permissions);
      if (allowAttribute) {
        frame.setAttribute('allow', allowAttribute);
      }

      const bridge = new AppBridge(
        client,
        this.mcpAppsConfig.hostInfo,
        this.mcpAppsConfig.hostCapabilities,
        {
          hostContext: {
            ...this.mcpAppsConfig.hostContext,
            theme: prefersDarkMode() ? 'dark' : 'light',
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

      const initialized = new Promise<void>((resolve) => {
        bridge.oninitialized = () => {
          resolve();
        };
      });

      frame.srcdoc = html;
      await bridge.connect(
        new PostMessageTransport(frame.contentWindow!, frame.contentWindow!),
      );
      await initialized;

      await sendInitialToolState(bridge, data);

      this.resizeObserver = new ResizeObserver(([entry]) => {
        bridge.sendHostContextChange({
          containerDimensions: {
            width: Math.round(entry.contentRect.width),
            maxHeight: 5000,
          },
        });
      });
      this.resizeObserver.observe(frame);

      const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      const darkModeListener = (event: MediaQueryListEvent) => {
        bridge.sendHostContextChange({
          theme: event.matches ? 'dark' : 'light',
        });
      };
      darkModeMedia.addEventListener('change', darkModeListener);

      this.bridge = bridge;
      this.client = client;

      const previousOnclose = bridge.onclose;
      bridge.onclose = () => {
        darkModeMedia.removeEventListener('change', darkModeListener);
        previousOnclose?.();
      };
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Unable to render MCP App.',
      );
      frame.removeAttribute('srcdoc');
    }
  }

  private async disposeBridge(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.bridge) {
      await this.bridge.teardownResource({}).catch(() => undefined);
      await this.bridge.close().catch(() => undefined);
      this.bridge = null;
    }

    if (this.client) {
      await this.client.close().catch(() => undefined);
      this.client = null;
    }
  }
}

function extractHtmlResource(resource: ReadResourceResult): {
  html: string;
  permissions?: McpUiResourcePermissions;
} {
  const content = resource.contents[0];
  if (!content) {
    throw new Error('MCP App resource is empty.');
  }

  if (content.mimeType !== RESOURCE_MIME_TYPE) {
    throw new Error(`Unsupported MCP App mime type: ${content.mimeType}`);
  }

  const html = 'text' in content ? content.text : atob(content.blob);
  const permissions = readUiPermissions(content);
  return { html, permissions };
}

function readUiPermissions(content: ReadResourceResult['contents'][number]) {
  const meta = (
    content as { _meta?: { ui?: { permissions?: McpUiResourcePermissions } } }
  )._meta;
  return meta?.ui?.permissions;
}

function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function toCallToolResult(value: unknown): CallToolResult {
  if (
    value &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as CallToolResult;
  }

  if (value && typeof value === 'object') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(value),
        },
      ],
      structuredContent: value as Record<string, unknown>,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: String(value ?? ''),
      },
    ],
  };
}

async function sendInitialToolState(
  bridge: AppBridge,
  data: AgUiMcpAppsSnapshotContent,
): Promise<void> {
  const toolResult = toCallToolResult(data.result);
  const toolInput = { arguments: data.toolInput };

  bridge.sendToolInput(toolInput);
  bridge.sendToolResult(toolResult);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 50);
  });

  bridge.sendToolInput(toolInput);
  bridge.sendToolResult(toolResult);
}

export const mcpAppsWidgetComponent = defineAgUiComponent({
  name: 'mcpAppsWidget',
  description: 'Renders an interactive MCP App inside an iframe.',
  component: McpAppsWidgetComponent,
  clientOnly: true,
  schema: z.object({
    serverId: z.string(),
    resourceUri: z.string(),
    result: z.unknown(),
    toolInput: z.record(z.string(), z.unknown()),
  }),
});
