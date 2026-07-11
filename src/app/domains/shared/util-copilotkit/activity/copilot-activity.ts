import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CopilotKit } from '@copilotkit/angular';

interface ActivityMessageLike {
  id: string;
  role: 'activity';
  activityType: string;
  content: Record<string, unknown>;
}

/**
 * Headless host for a single AG-UI activity message. Looks up the matching
 * `RenderActivityMessageConfig` registered on CopilotKit (globally or for this
 * agent), validates the content, and renders the configured component. This is
 * the piece `<copilot-chat>` would provide internally; the custom flights shell
 * renders activity messages itself.
 */
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

  protected readonly rendered = computed(() => {
    const message = this.message();
    const config = this.copilotKit
      .activityMessageRenderConfigs()
      .find(
        (candidate) =>
          candidate.activityType === message.activityType &&
          (candidate.agentId === undefined ||
            candidate.agentId === this.agentId()),
      );

    if (!config) {
      return null;
    }

    const parsed = config.content.safeParse(message.content);
    if (!parsed.success) {
      return null;
    }

    return {
      component: config.component,
      inputs: {
        activityType: message.activityType,
        content: parsed.data,
        message,
        agent: this.copilotKit.getAgent(this.agentId()),
      },
    };
  });
}
