import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { isActive, Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-booking-tabs',
  imports: [RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './booking-navigation.html',
})
export class BookingNavigation {
  private readonly router = inject(Router);

  protected readonly flightSearchActive = isActive(
    '/ticketing/booking/flight-search',
    this.router,
  );
  protected readonly passengerSearchActive = isActive(
    '/ticketing/booking/passenger-search',
    this.router,
  );
  protected readonly summaryActive = isActive(
    '/ticketing/booking/summary',
    this.router,
    { paths: 'exact' },
  );
}
