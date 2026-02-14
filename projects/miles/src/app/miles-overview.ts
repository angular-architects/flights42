import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserPanel } from '@flights42/ui-common';
import { AuthService } from '@flights42/util-auth';

@Component({
  selector: 'app-miles',
  imports: [UserPanel],
  template: `
    <h1>Your Bonus Miles</h1>

    <lib-user-panel />

    <table>
      <tr>
        <th>Id</th>
        <th>Flight Route</th>
        <th>Mile Credits</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Graz - London</td>
        <td>300</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Graz - New York</td>
        <td>3000</td>
      </tr>
      <tr>
        <td>3</td>
        <td>New York - London</td>
        <td>2500</td>
      </tr>
    </table>
  `,
})
export class MilesOverview {
  private readonly authService = inject(AuthService);

  constructor() {
    this.authService.userName
      .pipe(takeUntilDestroyed())
      .subscribe((userName) => {
        console.log('userName', userName ? userName : 'unknown');
      });
  }
}

export default MilesOverview;
