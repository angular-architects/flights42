import {
  Directive,
  effect,
  EmbeddedViewRef,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

// Context Information to be passed to the template
interface TooltipContext {
  $implicit: string;
  text: string;
}

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseover)': 'setHidden(false)',
    '(mouseout)': 'setHidden(true)',
  },
})
export class TooltipDirective {
  private readonly viewContainer = inject(ViewContainerRef);
  private viewRef: EmbeddedViewRef<TooltipContext> | undefined;

  readonly template = input<TemplateRef<TooltipContext> | undefined>(
    undefined,
    { alias: 'appTooltip' },
  );

  constructor() {
    effect(() => {
      const tmpl = this.template();
      if (!tmpl || this.viewRef) {
        return;
      }
      this.viewRef = this.viewContainer.createEmbeddedView(tmpl, {
        $implicit: 'Tooltip!',
        text: 'Important Information!',
      });

      this.setHidden(true);
    });
  }

  setHidden(hidden: boolean): void {
    this.viewRef?.rootNodes.forEach((nativeElement) => {
      nativeElement.hidden = hidden;
    });
  }
}
