import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Luggage, LuggageClient } from '@flights42/luggage-domain';
// import { MilesService } from '@flights42/miles-data';

@Component({
  selector: 'lib-luggage-feature-checkin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './luggage-feature-checkin.html',
  styleUrl: './luggage-feature-checkin.css',
})
export class LuggageFeatureCheckin implements OnInit {
  private luggageClient = inject(LuggageClient);
  luggage: Luggage[] = [];

  ngOnInit(): void {
    this.luggageClient.load().subscribe((luggage) => {
      this.luggage = luggage;
    });
  }
}
