import { Component } from '@angular/core';

import { NextFlightsModule } from '../feature-next-flights/next-flights.module';

@Component({
  selector: 'app-dashboard',
  imports: [NextFlightsModule],
  template: ` <app-next-flights /> `,
})
export class Dashboard {}
