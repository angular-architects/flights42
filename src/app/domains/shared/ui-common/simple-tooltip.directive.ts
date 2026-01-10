import {
  afterRenderEffect,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

@Directive({
  selector: '[appSimpleTooltip]',
  host: {
    '(mouseover)': 'setHidden(false)',
    '(mouseout)': 'setHidden(true)',
  },
})
export class SimpleTooltipDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private tooltipElement: HTMLElement | null = null;
  private readonly destroyRef = inject(DestroyRef);

  readonly tooltipText = input.required<string>({ alias: 'appSimpleTooltip' });

  constructor() {
    afterRenderEffect(() => {
      const text = this.tooltipText();
      this.ensureTooltip();
      this.updateText(text);
    });

    this.destroyRef.onDestroy(() => {
      this.removeTooltip();
    });
  }

  setHidden(hidden: boolean): void {
    if (this.tooltipElement) {
      this.tooltipElement.hidden = hidden;
    }
  }

  private ensureTooltip(): void {
    if (this.tooltipElement) {
      return;
    }

    this.tooltipElement = document.createElement('div');
    this.applyStyles();
    document.body.appendChild(this.tooltipElement);
  }

  private applyStyles() {
    if (!this.tooltipElement) {
      return;
    }

    this.tooltipElement.className = 'tooltip';

    const rect = this.host.nativeElement.getBoundingClientRect();
    this.tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
    this.tooltipElement.style.top = `${rect.top - 8}px`;
    this.tooltipElement.style.transform = 'translate(-50%, -100%)';
    this.tooltipElement.hidden = true;
  }

  private updateText(tooltipText: string): void {
    if (this.tooltipElement) {
      this.tooltipElement.textContent = tooltipText;
    }
  }

  private removeTooltip() {
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
      this.tooltipElement = null;
    }
  }
}
