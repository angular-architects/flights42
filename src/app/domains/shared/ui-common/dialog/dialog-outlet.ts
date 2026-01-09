import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, Injector, signal } from '@angular/core';

import { DialogInfo } from './dialog-info';
import { DialogService } from './dialog.service';
import { DIALOG_DATA } from './dialog.token';

@Component({
  selector: 'app-dialog-outlet',
  imports: [NgComponentOutlet],
  templateUrl: './dialog-outlet.html',
  styleUrl: './dialog-outlet.css',
})
export class DialogOutlet {
  private readonly dialogService = inject(DialogService);
  private readonly parentInjector = inject(Injector);

  private readonly dialogInfo = signal<DialogInfo>({
    component: null,
    data: null,
  });

  constructor() {
    this.dialogService.dialogInfo$.subscribe((info) => {
      this.dialogInfo.set(info);
    });
  }

  protected readonly comp = computed(() => this.dialogInfo().component);

  protected readonly injector = computed(() => {
    const info = this.dialogInfo();
    if (!info.component) {
      return null;
    }

    return Injector.create({
      providers: [{ provide: DIALOG_DATA, useValue: info.data }],
      parent: this.parentInjector,
    });
  });
}
