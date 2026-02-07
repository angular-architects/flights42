import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { LuggageFeatureCheckin } from '@flights42/luggage-feature-checkin';

@Component({
  imports: [NxWelcome, RouterModule, LuggageFeatureCheckin],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'luggage';
}
