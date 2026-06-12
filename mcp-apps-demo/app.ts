import { App } from '@modelcontextprotocol/ext-apps';

import { type AppViewModel, renderApp } from './app-rendering';

const viewModel: AppViewModel = {
  hostContext: undefined,
  toolInput: undefined,
  toolResult: undefined,
  detailsVisible: false,
};

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
  viewModel.toolResult = result;
  renderApp(root, viewModel);
};

app.ontoolinput = (input) => {
  viewModel.toolInput = input;
  renderApp(root, viewModel);
};

app.onhostcontextchanged = (context) => {
  viewModel.hostContext = context;
  renderApp(root, viewModel);
};

await app.connect();
