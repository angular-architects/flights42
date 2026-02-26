import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  DestroyableInjector,
  inject,
  Injector,
  signal,
  Type,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogService } from './dialog.service';
import { DIALOG_DATA } from './dialog.token';
import { DialogEvent } from './dialog-event';

@Component({
  selector: 'app-dialog-outlet',
  imports: [NgComponentOutlet],
  templateUrl: './dialog-outlet.html',
  styleUrl: './dialog-outlet.css',
})
export class DialogOutlet {
  private readonly dialogService = inject(DialogService);
  private readonly parentInjector = inject(Injector);

  protected component = signal<Type<unknown> | null>(null);
  protected injector = signal<DestroyableInjector | null>(null);

  constructor() {
    this.dialogService.dialogEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        this.processEvent(event);
      });
  }

  private processEvent(event: DialogEvent): void {
    const injector = this.injector();
    if (injector) {
      injector.destroy();
      this.injector.set(null);
    }

    if (!event.component) {
      this.component.set(null);
      return;
    }

    this.component.set(event.component);

    const newInjector = Injector.create({
      providers: [{ provide: DIALOG_DATA, useValue: event.data }],
      parent: this.parentInjector,
    });
    this.injector.set(newInjector);
  }
}
