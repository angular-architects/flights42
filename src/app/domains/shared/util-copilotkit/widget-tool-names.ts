import { computed, inject, type Signal } from '@angular/core';
import { CopilotKit } from '@copilotkit/angular';

/**
 * Names of the registered frontend tools that bring their own renderer, i.e.
 * the widgets. Tools without a component fall back to CopilotKit's built-in
 * default tool renderer (`defaultToolRendering`), so a present component
 * identifies a widget.
 */
export function injectWidgetToolNames(): Signal<ReadonlySet<string>> {
  const copilotKit = inject(CopilotKit);

  return computed(
    () =>
      new Set(
        copilotKit
          .clientToolCallRenderConfigs()
          .filter((tool) => tool.component !== undefined)
          .map((tool) => tool.name),
      ),
  );
}
