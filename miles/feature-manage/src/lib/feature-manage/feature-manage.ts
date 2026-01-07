import { Component, inject } from '@angular/core';
import { MilesService } from '@flights42/miles-data';

@Component({
  selector: 'lib-feature-manage',
  imports: [],
  templateUrl: './feature-manage.html',
  styleUrl: './feature-manage.css',
})
export class FeatureManage {
  private milesService = inject(MilesService);
  protected readonly milesResource = this.milesService.load();
}
