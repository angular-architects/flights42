import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { UserPanel } from '@flights42/ui-common';

@Component({
  selector: 'app-root',
  imports: [UserPanel, RouterOutlet, RouterLink],
  template: `
    <p>
      <a routerLink="miles">Your Miles</a> |
      <a routerLink="next-level">Next Level</a>
    </p>
    <hr />
    <lib-user-panel />
    <router-outlet />
  `,
})
export class App {}
