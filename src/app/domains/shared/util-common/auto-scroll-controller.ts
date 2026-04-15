import { DestroyRef, inject } from '@angular/core';

export interface AutoScrollerOptions {
  getContainer: () => HTMLElement | null;
  shouldScroll?: () => boolean;
}

export function injectAutoScroller(options: AutoScrollerOptions) {
  const destroyRef = inject(DestroyRef);
  let mutationObserver: MutationObserver | null = null;

  const disconnect = (): void => {
    mutationObserver?.disconnect();
    mutationObserver = null;
  };

  const scrollToBottom = (): void => {
    requestAnimationFrame(() => {
      const container = options.getContainer();
      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  };

  const connect = (): void => {
    const container = options.getContainer();
    if (!container || mutationObserver) {
      return;
    }

    mutationObserver = new MutationObserver(() => {
      if (!options.shouldScroll?.() && options.shouldScroll) {
        return;
      }

      scrollToBottom();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  destroyRef.onDestroy(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    scrollToBottom,
  };
}
