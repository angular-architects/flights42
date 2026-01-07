import { Component } from '@angular/core';
import { UiCommon } from '@flights42/ui-common';

@Component({
  selector: 'app-root',
  imports: [UiCommon],
  template: `
    <h1>Your Bonus Miles</h1>

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

    <p>&nbsp;</p>

    <lib-ui-common />
  `,
})
export class App {}
