import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './shell/navbar/navbar';
import { Sidebar } from './shell/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [Sidebar, Navbar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly title = signal('flights42');
}
