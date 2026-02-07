import { Component, inject } from '@angular/core';
import { MilesService } from '@flights42/miles-data';
import { AuthService } from '@flights42/shared/util-auth';

@Component({
  selector: 'lib-feature-manage',
  imports: [],
  templateUrl: './feature-manage.html',
  styleUrl: './feature-manage.css',
})
export class FeatureManage {
  private milesService = inject(MilesService);
  private authService = inject(AuthService);
  protected readonly milesResource = this.milesService.load();
  protected readonly userName = this.authService.userName;
}
