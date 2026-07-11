import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { z } from 'zod';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { componentTool } from '../../../shared/ui-assistant/copilot/widget-tools/component-tool';
import { AgentModeService } from '../../../shared/util-common/agent-mode-service';
import { PlanStep } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

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

      @if (isEmpty()) {
        <p class="plan-empty">No steps yet.</p>
      } @else {
        <ol class="plan-steps">
          @for (step of steps(); track step.id) {
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
      }

      <div class="plan-actions">
        <button
          type="button"
          class="execute-btn"
          [disabled]="isEmpty()"
          (click)="execute()">
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

  readonly title = input('');
  readonly steps = input<PlanStep[]>([]);

  protected readonly isEmpty = computed(() => this.steps().length === 0);

  protected labelForAction(action: PlanStep['action']): string {
    if (action === 'book') {
      return 'Book';
    }
    if (action === 'cancel') {
      return 'Cancel';
    }
    return 'Step';
  }

  protected execute(): void {
    if (this.isEmpty()) {
      return;
    }
    this.agentMode.mode.set('execution');
    void this.chatRegistry.store?.sendMessage(this.buildExecutionMessage(), {
      hidden: true,
    });
  }

  private verbForAction(action: PlanStep['action']): string {
    if (action === 'book') {
      return 'Book';
    }
    if (action === 'cancel') {
      return 'Cancel';
    }
    return 'Do';
  }

  private buildExecutionMessage(): string {
    const lines = this.steps()
      .map((step, index) => {
        const verb = this.verbForAction(step.action);
        const flight = step.flightId != null ? ` flight ${step.flightId}` : '';
        return `${index + 1}. ${verb}${flight} — ${step.description}`;
      })
      .join('\n');

    return `Execute the following plan now. Perform EVERY step, in EXACTLY this order,
            one at a time — do not reorder, skip, merge, or add steps:

              ${lines}`;
  }
}

export const planWidget = componentTool({
  name: 'planWidget',
  description: `
    Renders the current co-plan. The plan itself is held in the client-side
    PlanStore and edited through the plan tools (setPlan, addPlanStep,
    removePlanStep, updatePlanStep, movePlanStep, swapPlanSteps, reversePlan,
    clearPlan).
    This widget takes NO arguments — the client snapshots the plan from that
    store at the moment the widget is rendered. Call it whenever the plan changes
    (the initial draft and after every edit) so the user sees the updated plan;
    each card freezes the plan as it was at that moment. The widget renders an
    "Execute" button.`,
  component: PlanWidget,
  schema: z.object({}),
  captureProps: () => {
    const store = inject(PlanStore);
    return {
      title: store.title(),
      steps: store.steps().map((step) => ({ ...step })),
    };
  },
});
