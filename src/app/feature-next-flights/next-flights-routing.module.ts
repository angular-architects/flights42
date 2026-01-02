import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NextFlights } from './next-flights';

const routes: Routes = [
  {
    path: '',
    component: NextFlights,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NextFlightsRoutingModule {}
