import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  DestroyRef,
  DOCUMENT,
  EnvironmentInjector,
  inject,
  Injectable,
} from '@angular/core';

import { DialogOutlet } from './dialog-outlet';

@Injectable({ providedIn: 'root' })
export class DialogOutletService {
  private envInjector = inject(EnvironmentInjector);
  private appRef = inject(ApplicationRef);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  private componentRef: ComponentRef<DialogOutlet> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.componentRef?.destroy();
    });
  }

  ensureOutlet() {
    if (!this.componentRef) {
      this.componentRef = createComponent(DialogOutlet, {
        environmentInjector: this.envInjector,
      });

      this.appRef.attachView(this.componentRef.hostView);
      this.document.body.appendChild(this.componentRef.location.nativeElement);
    }
  }
}
