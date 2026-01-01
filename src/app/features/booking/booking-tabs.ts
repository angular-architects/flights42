import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-booking-tabs',
  imports: [RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './booking-tabs.html',
})
export class BookingTabs {}
