import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import express, { type Request, type Response } from 'express';

import {
  findHotels,
  findHotelsInputSchema,
  findHotelsResultSchema,
  HOTELS_RESOURCE_URI,
} from './hotels.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(currentDir, '../dist');
const publicDir = resolve(currentDir, '../public');
const htmlPath = resolve(distDir, 'index.html');
const port = 3002;
const allowedCorsOrigins = readAllowedCorsOrigins();

type SessionRequest = Request & { headers: Request['headers'] };

function createServer(): McpServer {
  const server = new McpServer({
    name: 'Flights42 Hotels MCP Server',
    version: '1.0.0',
  });

  registerAppTool(
    server,
    'findHotels',
    {
      title: 'Find Hotels',
      description:
        'Find three demo hotels for a city. Use this when the user asks for hotels in a specific city.',
      inputSchema: findHotelsInputSchema.shape,
      outputSchema: findHotelsResultSchema.shape,
      _meta: {
        ui: {
          resourceUri: HOTELS_RESOURCE_URI,
        },
      },
    },
    async (input) => {
      const result = findHotels(findHotelsInputSchema.parse(input));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        structuredContent: result,
      };
    },
  );

  registerAppResource(
    server,
    'Flights42 Hotel Results',
    HOTELS_RESOURCE_URI,
    {
      description: 'Hotel results rendered as an interactive MCP App.',
    },
    async () => {
      const html = await readFile(htmlPath, 'utf8');

      return {
        contents: [
          {
            uri: HOTELS_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: ['http://127.0.0.1:3002'],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}

async function start(): Promise<void> {
  const app = createMcpExpressApp({ host: '127.0.0.1' });
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      if (!origin || isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin "${origin}" is not allowed.`));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'Last-Event-ID',
      'mcp-protocol-version',
      'mcp-session-id',
    ],
    exposedHeaders: ['mcp-session-id'],
  };

  app.use((req, res, next) => {
    applyCorsResponseHeaders(req, res);

    if (req.header('Access-Control-Request-Private-Network') === 'true') {
      res.header('Access-Control-Allow-Private-Network', 'true');
    }

    next();
  });
  app.use(cors(corsOptions));
  app.options('/mcp', cors(corsOptions));
  app.use('/assets', express.static(publicDir));
  app.use(express.json());

  app.post('/mcp', async (req: SessionRequest, res: Response) => {
    const sessionId = req.headers['mcp-session-id'];
    const existingTransport =
      typeof sessionId === 'string' ? transports.get(sessionId) : undefined;

    let transport = existingTransport;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        if (transport?.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      await createServer().connect(transport);
    }

    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  });

  app.get('/mcp', async (req: SessionRequest, res: Response) => {
    const sessionId = req.headers['mcp-session-id'];

    if (typeof sessionId !== 'string') {
      res.status(400).send('Missing session ID.');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send('Session not found.');
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req: SessionRequest, res: Response) => {
    const sessionId = req.headers['mcp-session-id'];

    if (typeof sessionId !== 'string') {
      res.status(400).send('Missing session ID.');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).send('Session not found.');
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.listen(port, '127.0.0.1', () => {
    console.log(
      `Flights42 Hotels MCP server listening on http://127.0.0.1:${port}/mcp`,
    );
  });
}

function readAllowedCorsOrigins(): string[] {
  const configuredOrigins = process.env['MCP_SERVER_CORS_ORIGINS']?.trim();

  if (!configuredOrigins) {
    return ['*'];
  }

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function isAllowedCorsOrigin(origin: string): boolean {
  return (
    allowedCorsOrigins.includes('*') || allowedCorsOrigins.includes(origin)
  );
}

void start();

function applyCorsResponseHeaders(req: Request, res: Response): void {
  const origin = req.header('Origin');

  if (origin && isAllowedCorsOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else if (allowedCorsOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Accept, Authorization, Content-Type, Last-Event-ID, mcp-protocol-version, mcp-session-id',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');
}
