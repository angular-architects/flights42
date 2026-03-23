import {
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

@Directive({
  selector: '[appCustomTemplateOutlet]',
})
export class CustomTemplateOutletDirective<T extends object> {
  readonly template = input<TemplateRef<unknown> | undefined>(undefined, {
    alias: 'appCustomTemplateOutlet',
  });
  readonly context = input<T>(undefined, {
    alias: 'appCustomTemplateOutletContext',
  });

  private readonly viewContainer = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const tmpl = this.template();
      const ctx = this.context();

      if (!tmpl) {
        return;
      }

      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(tmpl, ctx);
    });
  }
}
