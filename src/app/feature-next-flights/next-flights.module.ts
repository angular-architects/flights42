import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NextFlightsOverview } from './next-flights-overview/next-flights-overview';
import { FlightCard } from '../shared/flight-card/flight-card';
import { NextFlightsStore } from './next-flights-overview/next-flights-store';
import { RouterModule } from '@angular/router';
import { nextFlightRoutes } from './next-flights-routing.module';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(nextFlightRoutes), FlightCard],
  declarations: [NextFlightsOverview],
  providers: [NextFlightsStore],
  exports: [NextFlightsOverview],
})
export class NextFlightsModule {}
