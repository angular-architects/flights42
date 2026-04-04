import { MessageProcessor } from '@a2ui/angular';
import type { UserAction } from '@a2ui/web_core/types/client-event';
import {
  assertInInjectionContext,
  DestroyRef,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type Handlers = Record<string, (action: UserAction) => void>;

export function registerHandlers(handlers: Handlers): void {
  assertInInjectionContext(registerHandlers);

  const processor = inject(MessageProcessor);
  const destroyRef = inject(DestroyRef);
  const environmentInjector = inject(EnvironmentInjector);

  processor.events
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(({ message, completion }) => {
      const action = message.userAction;
      if (action) {
        callHandler(action, handlers, environmentInjector);
      }
      completion.next([]);
    });
}

export function callHandler(
  action: UserAction,
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
