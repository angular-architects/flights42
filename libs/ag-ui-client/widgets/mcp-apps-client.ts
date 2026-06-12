import { inject, Injectable } from '@angular/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { MCP_APPS_SERVER_URL } from './mcp-apps.provider';

/**
 * Shares _a single MCP client — and therefore a single server connection —
 * across all MCP-Apps widgets.
 */
@Injectable({ providedIn: 'root' })
export class McpAppsClientService {
  private readonly serverUrl = inject(MCP_APPS_SERVER_URL);
  private clientPromise: Promise<Client> | null = null;

  getClient(): Promise<Client> {
    this.clientPromise ??= this.createClient();
    return this.clientPromise;
  }

  private async createClient(): Promise<Client> {
    const client = new Client({
      name: 'MCP Host',
      version: '1.0.0',
    });

    try {
      await client.connect(
        new StreamableHTTPClientTransport(new URL(this.serverUrl)),
      );
      return client;
    } catch (error) {
      // Drop the cached promise so the next widget can retry the connection.
      this.clientPromise = null;
      throw error;
    }
  }
}
