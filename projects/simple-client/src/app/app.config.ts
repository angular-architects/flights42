import { HttpAgent } from '@ag-ui/client';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideCopilotKit } from '@copilotkit/angular';

const chatUrl = 'http://localhost:4555/chat';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCopilotKit({
      agents: {
        weatherAgent: new HttpAgent({ url: chatUrl }),
      },
    }),
  ],
};
