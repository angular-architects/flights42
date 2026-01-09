import { Component, inject } from '@angular/core';

import { DialogService } from './dialog.service';
import { DIALOG_DATA } from './dialog.token';

@Component({
  selector: 'app-demo-dialog',
  template: `
    <div class="card">
      <div class="card-body mb-20">
        <h2 class="title">Message</h2>
        <p>{{ message }}</p>
        <button (click)="close()">Close</button>
      </div>
    </div>
  `,
})
export class DemoDialog {
  private readonly data = inject(DIALOG_DATA);
  private readonly dialogService = inject(DialogService);

  protected readonly message = this.data as string;

  close(): void {
    this.dialogService.hide();
  }
}
