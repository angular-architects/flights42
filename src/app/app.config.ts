import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  NavigationError,
  provideRouter,
  RedirectCommand,
  Router,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        // scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // withDebugTracing(),
      withNavigationErrorHandler(handleError),
    ),
  ],
};

function handleError(error: NavigationError) {
  console.error('Navigation Error', error);
  // return true;

  const router = inject(Router);
  const homeUrlTree = router.createUrlTree(['/home']);
  return new RedirectCommand(homeUrlTree);
}
