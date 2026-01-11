import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-hotel-pane',
  imports: [],
  template: `
    <div class="upselling">
      <h1>Rent a Hotel</h1>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Et minus
        eligendi, quae laboriosam odit sit consectetur maiores, harum
        repellendus numquam corporis laborum id temporibus at ipsum eaque
        mollitia distinctio. Eveniet?
      </p>
      <p>
        <button (click)="book()">Book Offer</button>
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HotelPane {
  private snackBar = inject(MatSnackBar);
  protected book(): void {
    this.snackBar.open('Successfully booked!', 'OK', { duration: 3000 });
  }
}
