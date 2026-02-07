import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '@flights42/util-auth';

import { AssistantChat } from './domains/shared/ui-assistant/assistant-chat/assistant-chat';
import { Navbar } from './shell/navbar/navbar';
import { Sidebar } from './shell/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Sidebar, AssistantChat],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly title = signal('flights42');
  protected readonly isLoading = signal(false);

  constructor() {
    this.authService.login('John Doe');

    this.router.events.subscribe((events) => {
      if (events instanceof NavigationStart) {
        this.isLoading.set(true);
      } else if (
        events instanceof NavigationEnd ||
        events instanceof NavigationError ||
        events instanceof NavigationCancel
      ) {
        this.isLoading.set(false);
      }
    });
  }
}
