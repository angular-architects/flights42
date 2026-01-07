import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { createTool } from '@hashbrownai/angular';

export const getCurrentRoute = createTool({
  name: 'getCurrentRoute',
  description: `
    returns the current route path as a string
  `,
  handler: () => {
    const router = inject(Router);
    return Promise.resolve(router.url);
  },
});
