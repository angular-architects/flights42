import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-checkin-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Check-in Confirmation</h2>
    <mat-dialog-content>
      <p>You are checked in now</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">OK</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckinDialogComponent {
  private dialogRef = inject(MatDialogRef<CheckinDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
