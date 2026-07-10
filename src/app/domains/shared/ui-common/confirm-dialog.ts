import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="card">
      <div class="card-body">
        <p>
          {{ message }}
        </p>
        <button (click)="close(true)" class="btn btn-default">Yes</button>
        <button (click)="close(false)" class="btn btn-default">No</button>
      </div>
    </div>
  `,
  styles: `
    .card-body {
      padding: 0 10px;
      margin-bottom: 15px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly message = inject(DIALOG_DATA) as string;
  private readonly dialogRef = inject(DialogRef) as DialogRef<boolean>;

  close(decision: boolean): void {
    this.dialogRef.close(decision);
  }
}
