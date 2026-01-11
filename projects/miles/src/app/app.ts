import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <p>
      <a routerLink="home">Your Miles</a> |
      <a routerLink="next-level">Next Level</a>
    </p>
    <hr />
    <router-outlet />
  `,
})
export class App {}
