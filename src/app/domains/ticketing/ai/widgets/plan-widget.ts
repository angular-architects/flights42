import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { defineAgUiComponent } from '@internal/ag-ui-client';
import { z } from 'zod';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { AgentModeService } from '../../../shared/util-common/agent-mode-service';

const planStepSchema = z.object({
  action: z
    .enum(['book', 'cancel', 'other'])
    .describe('Kind of step. Use "other" for non-booking steps.'),
  flightId: z
    .number()
    .optional()
    .describe('Flight id this step refers to (if applicable).'),
  description: z.string().describe('Human-readable description of the step.'),
});

type PlanStep = z.infer<typeof planStepSchema>;

@Component({
  selector: 'app-plan-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plan-card">
      <div class="plan-header">
        <span class="plan-badge">Plan</span>
        @if (title()) {
          <h3 class="plan-title">{{ title() }}</h3>
        }
      </div>

      <ol class="plan-steps">
        @for (step of steps(); track $index) {
          <li class="plan-step">
            <span class="step-kind" [attr.data-kind]="step.action">
              {{ labelForAction(step.action) }}
              @if (step.flightId) {
                #{{ step.flightId }}
              }
            </span>
            <span class="step-desc">{{ step.description }}</span>
          </li>
        }
      </ol>

      <div class="plan-actions">
        <button type="button" class="execute-btn" (click)="execute()">
          Execute
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./plan-widget.css'],
})
export class PlanWidget {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);

  readonly title = input<string | undefined>(undefined);
  readonly steps = input.required<PlanStep[]>();

  protected labelForAction(action: PlanStep['action']): string {
    if (action === 'book') return 'Book';
    if (action === 'cancel') return 'Cancel';
    return 'Step';
  }

  protected execute(): void {
    this.agentMode.mode.set('execution');
    this.chatRegistry.chat?.sendMessage({
      role: 'user',
      content: 'Please execute the plan we just agreed on, in the order shown.',
    });
  }
}

export const planWidget = defineAgUiComponent({
  name: 'planWidget',
  description: [
    'Structured plan card. Use this whenever the planning agent presents a',
    'plan (e.g. rebooking, multi-step booking/cancellation).',
    'Each step has an action ("book" | "cancel" | "other"), an optional',
    'flightId and a description. The array order IS the execution order.',
    'The widget renders an "Execute" button; no extra confirmation step needed.',
  ].join('\n'),
  component: PlanWidget,
  schema: z.object({
    title: z
      .string()
      .optional()
      .describe('Short title for the plan, e.g. "Rebook Paris trip".'),
    steps: z
      .array(planStepSchema)
      .min(1)
      .describe('Ordered list of steps; the order reflects execution order.'),
  }),
});
