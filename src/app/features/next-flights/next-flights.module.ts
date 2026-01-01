import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NextFlights } from './next-flights';
import { FlightCard } from '../../shared/flight-card/flight-card';
import { NextFlightsStore } from './next-flights-store';
import { NextFlightsRoutingModule } from './next-flights-routing.module';

@NgModule({
  imports: [CommonModule, NextFlightsRoutingModule, FlightCard],
  declarations: [NextFlights],
  providers: [NextFlightsStore],
  exports: [NextFlights],
})
export class NextFlightsModule {}
