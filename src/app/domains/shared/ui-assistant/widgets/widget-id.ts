import { Directive, inject, InjectionToken, input } from '@angular/core';

export const WIDGET_ID = new InjectionToken<string>('WIDGET_ID');

// CopilotKit's RenderToolCalls creates renderer components via ngComponentOutlet
// without a custom injector, so they resolve tokens through the element injector
// of the <copilot-render-tool-calls> host. Placing this directive on that host
// hands each widget the tool-call id it is rendered for as a stable WIDGET_ID.
@Directive({
  selector: '[appWidgetId]',
  providers: [
    {
      provide: WIDGET_ID,
      useFactory: () => inject(WidgetIdDirective).appWidgetId(),
    },
  ],
})
export class WidgetIdDirective {
  readonly appWidgetId = input.required<string>();
}
