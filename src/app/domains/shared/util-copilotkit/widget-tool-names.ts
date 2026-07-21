import { computed, inject, type Signal } from '@angular/core';
import { CopilotKit } from '@copilotkit/angular';

import { FallbackToolCard } from './fallback-tool-card';

/**
 * Names of the registered frontend tools that bring their own renderer, i.e.
 * the widgets. `initAgentStore` registers every tool without a component under
 * the `FallbackToolCard`, so a different component identifies a widget.
 */
export function injectWidgetToolNames(): Signal<ReadonlySet<string>> {
  const copilotKit = inject(CopilotKit);

  return computed(
    () =>
      new Set(
        copilotKit
          .clientToolCallRenderConfigs()
          .filter(
            (tool) => tool.component && tool.component !== FallbackToolCard,
          )
          .map((tool) => tool.name),
      ),
  );
}
