import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CheckinDialogComponent } from './checkin-dialog';

@Component({
  selector: 'app-checkin',
  imports: [FormsModule],
  templateUrl: './checkin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkin {
  private dialog = inject(MatDialog);

  checkin(): void {
    this.dialog.open(CheckinDialogComponent, {
      width: '400px',
    });
  }
}
