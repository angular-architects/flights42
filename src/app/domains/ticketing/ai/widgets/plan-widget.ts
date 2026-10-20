import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import { createComponentTool } from '../../../shared/util-copilotkit/tool-definition';
import { PlanHandoff } from '../plan/plan-handoff';
import { Plan, PlanStepAction } from '../plan/plan-model';
import { PlanStore } from '../plan/plan-store';

const PLAN_WIDGET_TOOL_NAME = 'planWidget';

const planWidgetSchema = z.object({});

type PlanWidgetArgs = z.infer<typeof planWidgetSchema>;

@Component({
  selector: 'app-plan-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plan-card">
      <div class="plan-header">
        <span class="plan-badge">Plan</span>
        @if (planViewModel.title) {
          <h3 class="plan-title">{{ planViewModel.title }}</h3>
        }
      </div>

      @if (planViewModel.steps.length === 0) {
        <p class="plan-empty">No steps yet.</p>
      } @else {
        <ol class="plan-steps">
          @for (step of planViewModel.steps; track step.id) {
            <li class="plan-step">
              <span class="step-kind" [attr.data-kind]="step.action">
                {{ step.label }}
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
          [disabled]="planViewModel.steps.length === 0"
          (click)="execute()">
          Execute
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./plan-widget.css'],
})
export class PlanWidget implements ToolRenderer<PlanWidgetArgs> {
  private readonly store = inject(PlanStore);
  private readonly planHandoff = inject(PlanHandoff);

  // Required by the tool call renderer
  readonly toolCall = input.required<AngularToolCall<PlanWidgetArgs>>();

  private readonly planSnapshot: Plan = {
    title: this.store.title(),
    steps: this.store.steps().map((step) => ({ ...step })),
  };

  protected readonly planViewModel = {
    title: this.planSnapshot.title,
    steps: this.planSnapshot.steps.map((step) => ({
      ...step,
      label: labelForAction(step.action),
    })),
  };

  protected execute(): void {
    if (this.planSnapshot.steps.length === 0) {
      return;
    }

    // TODO: Hand the planSnapshot over for execution
    //       (void this.planHandoff.execute)
  }
}

function labelForAction(action: PlanStepAction): string {
  if (action === 'book') {
    return 'Book';
  }
  if (action === 'cancel') {
    return 'Cancel';
  }
  return 'Step';
}

export const planWidget = createComponentTool({
  name: PLAN_WIDGET_TOOL_NAME,
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
});
