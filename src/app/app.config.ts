import { DEFAULT_CATALOG, provideA2UI } from '@a2ui/angular';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHashbrown } from '@hashbrownai/angular';
import { provideMarkdown } from 'ngx-markdown';

import { a2uiTheme } from './a2ui-theme';
import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(ConfigService).load()),
    // provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    provideA2UI({ catalog: DEFAULT_CATALOG, theme: a2uiTheme }),
    provideHashbrown({
      baseUrl: 'http://localhost:3000/api/chat',
      emulateStructuredOutput: true,
      middleware: [
        (request) => {
          console.log('[Hashbrown Request]', request);
          return request;
        },
      ],
    }),
    provideMarkdown(),
  ],
};
