import type { AbstractAgent, ActivityMessage } from '@ag-ui/client';
import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type Type,
} from '@angular/core';
import {
  type ActivityRenderer,
  CopilotKit,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

@Component({
  selector: 'app-copilot-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    @let view = rendered();
    @if (view) {
      <ng-container *ngComponentOutlet="view.component; inputs: view.inputs" />
    }
  `,
})
export class CopilotActivity {
  private readonly copilotKit = inject(CopilotKit);

  readonly message = input.required<ActivityMessage>();
  readonly agentId = input.required<string>();

  protected readonly rendered = computed(() =>
    toRenderActivity(
      this.message(),
      this.copilotKit.activityMessageRenderConfigs(),
      this.copilotKit.getAgent(this.agentId()),
    ),
  );
}

export interface RenderedActivity {
  component: Type<ActivityRenderer<unknown>>;
  inputs: {
    activityType: string;
    content: unknown;
    message: ActivityMessage;
    agent: AbstractAgent | undefined;
  };
}

export function toRenderActivity(
  message: ActivityMessage,
  configs: readonly RenderActivityMessageConfig[],
  agent: AbstractAgent | undefined,
): RenderedActivity | null {
  const config = configs.find(
    (candidate) => candidate.activityType === message.activityType,
  );

  if (!config) {
    return null;
  }

  const parsed = config.content.safeParse(message.content);
  if (!parsed.success) {
    console.warn(
      `Failed to parse content for activity '${message.activityType}':`,
      parsed.error,
    );
    return null;
  }

  return {
    component: config.component,
    inputs: {
      activityType: message.activityType,
      content: parsed.data,
      message,
      agent,
    },
  };
}
