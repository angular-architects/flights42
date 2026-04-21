import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiClientAction } from '@a2ui/web_core/v0_9';
import {
  assertInInjectionContext,
  DestroyRef,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';

export type Handlers = Record<string, (action: A2uiClientAction) => void>;

export function registerHandlers(handlers: Handlers): void {
  assertInInjectionContext(registerHandlers);

  const renderer = inject(A2uiRendererService);
  const destroyRef = inject(DestroyRef);
  const environmentInjector = inject(EnvironmentInjector);

  const subscription = renderer.surfaceGroup.onAction.subscribe((action) => {
    callHandler(action, handlers, environmentInjector);
  });

  destroyRef.onDestroy(() => {
    subscription.unsubscribe();
  });
}

export function callHandler(
  action: A2uiClientAction,
  handlers: Handlers,
  environmentInjector: EnvironmentInjector,
): void {
  const handler = handlers[action.name];
  if (!handler) {
    return;
  }

  runInInjectionContext(environmentInjector, () => {
    handler(action);
  });
}
