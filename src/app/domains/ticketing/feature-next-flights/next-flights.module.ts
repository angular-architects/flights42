import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FlightCard } from '../ui/flight-card/flight-card';
import { NextFlightsOverview } from './next-flights-overview/next-flights-overview';
import { NextFlightsStore } from './next-flights-overview/next-flights-store';
import { nextFlightRoutes } from './next-flights-routing.module';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(nextFlightRoutes), FlightCard],
  declarations: [NextFlightsOverview],
  providers: [NextFlightsStore],
  exports: [NextFlightsOverview],
})
export class NextFlightsModule {}
