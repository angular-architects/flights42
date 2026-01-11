import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {
  LanguageDetector,
  ServerLanguageDetector,
} from './domains/shared/util-common/language';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: LanguageDetector, useClass: ServerLanguageDetector },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
