import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  runInInjectionContext,
  type Type,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';

import { WIDGET_REGISTRY } from './widget-registry';

interface WidgetView {
  component: Type<unknown>;
  props: Record<string, unknown>;
}

/**
 * Shared tool-call renderer for every component-tool. It looks the render
 * metadata up by the tool-call name in the registry and renders the component
 * with the call arguments. Captured props (e.g. `planWidget`) are frozen once
 * the arguments are final, so a card keeps showing the state as it was even if
 * its store changes later.
 */
@Component({
  selector: 'app-widget-tool-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    @let view = widgetView();
    @if (view) {
      <ng-container *ngComponentOutlet="view.component; inputs: view.props" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class WidgetToolRenderer implements ToolRenderer {
  readonly toolCall = input.required<AngularToolCall>();

  private readonly registry = inject(WIDGET_REGISTRY);
  private readonly injector = inject(Injector);
  private frozen: WidgetView | null = null;

  protected readonly widgetView = computed<WidgetView | null>(() => {
    const call = this.toolCall();
    if (this.frozen) {
      return this.frozen;
    }

    const render = call.name ? this.registry.get(call.name) : undefined;
    if (!render) {
      return null;
    }

    // While arguments are still streaming, render data components live but hold
    // off on `captureProps` components (they take no args and would snapshot the
    // store too early).
    if (call.status === 'in-progress') {
      return render.captureProps
        ? null
        : {
            component: render.component,
            props: (call.args ?? {}) as Record<string, unknown>,
          };
    }

    const args = (call.args ?? {}) as Record<string, unknown>;
    const props = render.captureProps
      ? runInInjectionContext(this.injector, () => render.captureProps!(args))
      : args;

    this.frozen = { component: render.component, props };
    return this.frozen;
  });
}
