import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NextFlightsModule } from '../../domains/ticketing/feature-next-flights/next-flights.module';

@Component({
  selector: 'app-dashboard',
  imports: [NextFlightsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<app-next-flights />`,
})
export class Dashboard {}
