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
} from '@angular/router';

import { FlightSearch } from './domains/ticketing/feature-booking/proto-flight-search/flight-search';
import { Navbar } from './shell/navbar/navbar';
import { Sidebar } from './shell/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [Navbar, Sidebar, FlightSearch],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

  private readonly title = signal('flights42');
  protected readonly isLoading = signal(false);

  constructor() {
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
