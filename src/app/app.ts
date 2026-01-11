import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
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

import { AssistantChat } from './domains/shared/ui-assistant/assistant-chat/assistant-chat';
import { LanguageDetector } from './domains/shared/util-common/language';
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
  private language = inject(LanguageDetector);
  private platform = inject(PLATFORM_ID);

  private readonly title = signal('flights42');
  protected readonly isLoading = signal(false);

  constructor() {
    console.log('language', this.language.getUserLang());

    if (isPlatformBrowser(this.platform)) {
      console.log('platform: browser');
    } else if (isPlatformServer(this.platform)) {
      console.log('platform: server');
    }

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
