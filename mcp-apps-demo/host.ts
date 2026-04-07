import {
  AppBridge,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps/app-bridge';

const frameHost = document.getElementById('iframe-host');

if (!(frameHost instanceof HTMLDivElement)) {
  throw new Error('Missing iframe host element.');
}

const iframe = document.createElement('iframe');
iframe.title = 'MCP App Demo';
iframe.sandbox.add('allow-scripts');
iframe.sandbox.add('allow-same-origin');
iframe.src = new URL('./app.html', window.location.href).toString();
frameHost.append(iframe);

const bridge = new AppBridge(
  null,
  { name: 'MCP Apps Demo Host', version: '1.0.0' },
  { logging: { level: 'info' } },
);

bridge.onsizechange = (event) => {
  iframe.style.height = `${Math.ceil(event.height ?? 0)}px`;
};

await bridge.connect(
  new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
);

await waitForInitialization(bridge);

bridge.sendToolResult({
  content: [
    {
      type: 'text',
      text: 'The host sends this tool result to the app.',
    },
  ],
  structuredContent: {
    city: 'Graz',
    hotels: ['Grand Palace', 'Skyline Suites', 'Biz Hotel'],
  },
});

function waitForInitialization(bridge: AppBridge): Promise<void> {
  return new Promise((resolve) => {
    bridge.oninitialized = () => {
      resolve();
    };
  });
}
