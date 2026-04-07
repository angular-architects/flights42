import { App } from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('Missing app root element.');
}

const root = appRoot;

const app = new App({
  name: 'MCP Apps Demo App',
  version: '1.0.0',
});

app.ontoolresult = (result) => {
  render(result);
};

await app.connect();

function render(result: CallToolResult): void {
  root.innerHTML = '<pre></pre>';
  const pre = root.querySelector('pre');

  if (pre instanceof HTMLPreElement) {
    pre.textContent = JSON.stringify(result, null, 2);
  }
}
