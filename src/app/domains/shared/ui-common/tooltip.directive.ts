import {
  afterRenderEffect,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

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
  private host = inject(ElementRef<HTMLElement>);

  readonly template = input<TemplateRef<TooltipContext> | undefined>(
    undefined,
    { alias: 'appTooltip' },
  );

  constructor() {
    afterRenderEffect(() => {
      const template = this.template();
      if (!template || this.viewRef) {
        return;
      }
      this.initToolTip(template);
    });
  }

  initToolTip(template: TemplateRef<TooltipContext>): void {
    this.viewRef = this.viewContainer.createEmbeddedView(template, {
      $implicit: 'Tooltip!',
      text: 'Important Information!',
    });

    this.applyStyles();
  }

  applyStyles(): void {
    this.viewRef?.rootNodes.forEach((nativeElement) => {
      nativeElement.className = 'tooltip';

      const r = this.host.nativeElement.getBoundingClientRect();
      nativeElement.style.left = `${r.left + r.width / 2}px`;
      nativeElement.style.top = `${r.top - 8}px`;
      nativeElement.style.transform = 'translate(-50%, -100%)';
      nativeElement.hidden = true;
    });
  }

  setHidden(hidden: boolean): void {
    this.viewRef?.rootNodes.forEach((nativeElement) => {
      nativeElement.hidden = hidden;
    });
  }
}
