import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { ConfigService } from './domains/shared/util-common/config-service';
import { provideLanguageService } from './domains/shared/util-common/language';
import { LogLevel } from './domains/shared/util-common/logger/log-level';
import { provideLogger } from './domains/shared/util-common/logger/provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAppInitializer(() => inject(ConfigService).load()),
    provideLanguageService('browser'),
    provideLogger({ level: LogLevel.INFO }),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
