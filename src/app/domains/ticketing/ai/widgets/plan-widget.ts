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

const planSchema = z.object({
  title: z
    .string()
    .describe('Short title for the plan, e.g. "Rebook Paris trip".')
    .optional(),
  steps: z
    .array(planStepSchema)
    .min(1)
    .describe('Ordered list of steps; the order reflects execution order.'),
});

type PlanProps = z.infer<typeof planSchema>;

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
              @if (step.flightId !== undefined && step.flightId !== null) {
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
  styles: `
    :host {
      display: block;
    }

    .plan-card {
      margin: 0;
      background-color: #f6f8fc;
      border: 1px solid #dde5f2;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .plan-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .plan-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e4ebf8;
      color: #2f3d5a;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .plan-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1c2540;
    }

    .plan-steps {
      margin: 0 0 12px;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.875rem;
      line-height: 1.35;
    }

    .plan-step {
      color: #2f3d5a;
    }

    .step-kind {
      display: inline-block;
      padding: 1px 6px;
      margin-right: 6px;
      border-radius: 6px;
      background: #dde5f2;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #2f3d5a;
    }

    .step-kind[data-kind='book'] {
      background: #d6ecd9;
      color: #265a2d;
    }

    .step-kind[data-kind='cancel'] {
      background: #f4d5d5;
      color: #8a2020;
    }

    .plan-actions {
      display: flex;
      justify-content: flex-end;
    }

    .execute-btn {
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: var(--color-primary, #4c5ef5);
      color: #fff;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .execute-btn:hover {
      filter: brightness(0.95);
    }
  `,
})
export class PlanWidget {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);

  readonly title = input<string | undefined>(undefined);
  readonly steps = input.required<PlanProps['steps']>();

  protected labelForAction(
    action: PlanProps['steps'][number]['action'],
  ): string {
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
  schema: planSchema,
});
