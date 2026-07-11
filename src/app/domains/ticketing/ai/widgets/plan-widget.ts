import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { ChatRegistry } from '../../../shared/ui-assistant/chat-registry';
import { AgentModeService } from '../../../shared/util-common/agent-mode-service';
import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanStep } from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

const planWidgetSchema = z.object({});

type PlanWidgetArgs = z.infer<typeof planWidgetSchema>;

interface PlanSnapshot {
  title: string;
  steps: PlanStep[];
}

@Component({
  selector: 'app-plan-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let snapshot = plan();
    @if (snapshot) {
      <div class="plan-card">
        <div class="plan-header">
          <span class="plan-badge">Plan</span>
          @if (snapshot.title) {
            <h3 class="plan-title">{{ snapshot.title }}</h3>
          }
        </div>

        @if (snapshot.steps.length === 0) {
          <p class="plan-empty">No steps yet.</p>
        } @else {
          <ol class="plan-steps">
            @for (step of snapshot.steps; track step.id) {
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
            [disabled]="snapshot.steps.length === 0"
            (click)="execute()">
            Execute
          </button>
        </div>
      </div>
    }
  `,
  styleUrls: ['./plan-widget.css'],
})
export class PlanWidget implements ToolRenderer<PlanWidgetArgs> {
  private readonly chatRegistry = inject(ChatRegistry);
  private readonly agentMode = inject(AgentModeService);
  private readonly store = inject(PlanStore);

  readonly toolCall = input.required<AngularToolCall<PlanWidgetArgs>>();

  // The plan lives in a mutable store; each rendered card must freeze the plan
  // as it was the moment its tool call finished. Snapshot once (skipping the
  // in-progress phase) and keep returning that frozen copy.
  private frozen: PlanSnapshot | null = null;

  protected readonly plan = computed<PlanSnapshot | null>(() => {
    if (this.frozen) {
      return this.frozen;
    }
    if (this.toolCall().status === 'in-progress') {
      return null;
    }
    this.frozen = {
      title: this.store.title(),
      steps: this.store.steps().map((step) => ({ ...step })),
    };
    return this.frozen;
  });

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
    const steps = this.plan()?.steps ?? [];
    if (steps.length === 0) {
      return;
    }
    this.agentMode.mode.set('execution');
    void this.chatRegistry.store?.sendMessage(
      this.buildExecutionMessage(steps),
      { hidden: true },
    );
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

  private buildExecutionMessage(steps: PlanStep[]): string {
    const lines = steps
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

export const planWidget = createFrontendTool({
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
  parameters: planWidgetSchema,
  component: PlanWidget,
  followUp: false,
  handler: async () => ({ shown: true }),
});
