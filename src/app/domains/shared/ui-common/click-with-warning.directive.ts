import { Dialog } from '@angular/cdk/dialog';
import { Directive, inject, input, output } from '@angular/core';

import { ConfirmComponent } from './confirm/confirm';

@Directive({
  selector: '[appClickWithWarning]',
  exportAs: 'clickWithWarning',
  host: {
    '[class]': '"btn btn-danger"',
    '(click)': 'handleClick($event.shiftKey)',
  },
})
export class ClickWithWarningDirective {
  private readonly dialog = inject(Dialog);

  readonly warning = input('Are you sure?');
  readonly appClickWithWarning = output<void>();

  handleClick(shiftKey: boolean): void {
    if (shiftKey) {
      this.appClickWithWarning.emit();
      return;
    }

    const ref = this.dialog.open<boolean>(ConfirmComponent, {
      data: this.warning(),
    });
    ref.closed.subscribe((result) => {
      if (result) {
        this.appClickWithWarning.emit();
      }
    });
  }
}
