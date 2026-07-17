import type { AbstractAgent } from '@ag-ui/client';
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

interface ActivityMessageLike {
  id: string;
  role: 'activity';
  activityType: string;
  content: Record<string, unknown>;
}

interface ActivityRender {
  component: Type<ActivityRenderer<unknown>>;
  inputs: {
    activityType: string;
    content: unknown;
    message: ActivityMessageLike;
    agent: AbstractAgent | undefined;
  };
}

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

  readonly message = input.required<ActivityMessageLike>();
  readonly agentId = input.required<string>();

  protected readonly rendered = computed(() =>
    resolveActivityRender(
      this.copilotKit.activityMessageRenderConfigs(),
      this.message(),
      this.agentId(),
      this.copilotKit.getAgent(this.agentId()),
    ),
  );
}

export function resolveActivityRender(
  configs: RenderActivityMessageConfig[],
  message: ActivityMessageLike,
  agentId: string,
  agent: AbstractAgent | undefined,
): ActivityRender | null {
  const config = pickActivityConfig(configs, message.activityType, agentId);

  if (!config) {
    return null;
  }

  const parsed = config.content.safeParse(message.content);
  if (!parsed.success) {
    console.warn(
      `Failed to parse content for activity message '${message.activityType}':`,
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

export function pickActivityConfig(
  configs: RenderActivityMessageConfig[],
  activityType: string,
  agentId: string,
): RenderActivityMessageConfig | undefined {
  const matches = configs.filter(
    (candidate) => candidate.activityType === activityType,
  );

  return (
    matches.find((candidate) => candidate.agentId === agentId) ??
    matches.find((candidate) => candidate.agentId === undefined) ??
    configs.find((candidate) => candidate.activityType === '*')
  );
}
