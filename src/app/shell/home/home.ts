import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';

@Component({
  selector: 'app-home',
  imports: [],
  template: `
    <h1>Welcome!</h1>
    <div #placeholder></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private injector = inject(Injector);

  protected readonly placeholder = viewChild('placeholder', {
    read: ViewContainerRef,
  });

  constructor() {
    effect(() => {
      this.loadRemoteComponent();
    });
  }

  private async loadRemoteComponent() {
    const placeholder = this.placeholder();
    if (placeholder) {
      const module = await loadRemoteModule('miles', './Component');
      const Comp = module.default;
      placeholder.createComponent(Comp, {
        injector: this.injector,
      });
    }
  }
}
