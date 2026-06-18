import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { defineAgUiComponent } from '@internal/ag-ui-client';
import { z } from 'zod';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
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
        @if (store.title()) {
          <h3 class="plan-title">{{ store.title() }}</h3>
        }
      </div>

      @if (store.isEmpty()) {
        <p class="plan-empty">No steps yet.</p>
      } @else {
        <ol class="plan-steps">
          @for (step of store.steps(); track step.id) {
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
          [disabled]="store.isEmpty()"
          (click)="execute()">
          Execute
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./plan-widget.css'],
})
export class PlanWidget {
  protected readonly store = inject(PlanStore);
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);

  protected labelForAction(action: PlanStep['action']): string {
    if (action === 'book') return 'Book';
    if (action === 'cancel') return 'Cancel';
    return 'Step';
  }

  protected execute(): void {
    if (this.store.isEmpty()) return;
    this.agentMode.mode.set('execution');
    this.chatRegistry.chat?.sendMessage({
      role: 'user',
      content: this.buildExecutionMessage(),
      hidden: true,
    });
  }

  private buildExecutionMessage(): string {
    const lines = this.store.steps().map((step, index) => {
      const verb =
        step.action === 'book'
          ? 'Book'
          : step.action === 'cancel'
            ? 'Cancel'
            : 'Do';
      const flight = step.flightId != null ? ` flight ${step.flightId}` : '';
      return `${index + 1}. ${verb}${flight} — ${step.description}`;
    });

    return [
      'Execute the following plan now. Perform EVERY step, in EXACTLY this',
      'order, one at a time — do not reorder, skip, merge, or add steps:',
      '',
      ...lines,
    ].join('\n');
  }
}

export const planWidget = defineAgUiComponent({
  name: 'planWidget',
  description: [
    'Renders the current co-plan. The plan itself is held in the client-side',
    'PlanStore and edited through the plan tools (setPlan, addPlanStep,',
    'removePlanStep, updatePlanStep, movePlanStep, swapPlanSteps, clearPlan).',
    'This widget always shows the live plan from that store, so you do NOT pass',
    'the steps here. Append this widget once to anchor the plan in the chat;',
    'after that, edits update the rendered card automatically — do not show it',
    'again on every change. The widget renders an "Execute" button.',
  ].join('\n'),
  component: PlanWidget,
  schema: z.object({}),
});
