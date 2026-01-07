import { Component } from '@angular/core';
import { FeatureManage } from '@flights42/miles-feature-manage';
import { MilesFeatureNextLevel } from '@flights42/miles-feature-next-level';

@Component({
  imports: [FeatureManage, MilesFeatureNextLevel],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'miles-app';
}
