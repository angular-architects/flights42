import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import { z } from 'zod';

import {
  createFrontendTool,
  createRenderToolCall,
} from '../../../shared/util-copilotkit/tool-definition';
import { PLAN_WIDGET_TOOL_NAME, PlanHandoff } from '../plan/plan-handoff';
import {
  PlanCardArgs,
  planCardArgsSchema,
  PlanSnapshot,
  PlanStep,
} from '../plan/plan-schemas';
import { PlanStore } from '../plan/plan-store';

const planWidgetSchema = z.object({});

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

        @if (!handoff()) {
          <div class="plan-actions">
            <button
              type="button"
              class="execute-btn"
              [disabled]="snapshot.steps.length === 0"
              (click)="execute()">
              Execute
            </button>
          </div>
        }
      </div>
    }
  `,
  styleUrls: ['./plan-widget.css'],
})
export class PlanWidget implements ToolRenderer<PlanCardArgs> {
  private readonly store = inject(PlanStore);
  private readonly planHandoff = inject(PlanHandoff);

  readonly toolCall = input.required<AngularToolCall<PlanCardArgs>>();

  protected readonly handoff = computed(
    () => this.toolCall().args.steps !== undefined,
  );

  // The plan lives in a mutable store; each rendered card must freeze the plan
  // as it was the moment its tool call finished. Snapshot once (skipping the
  // in-progress phase) and keep returning that frozen copy.
  private frozen: PlanSnapshot | null = null;

  protected readonly plan = computed<PlanSnapshot | null>(() => {
    if (this.frozen) {
      return this.frozen;
    }
    const call = this.toolCall();
    if (call.status === 'in-progress') {
      return null;
    }
    this.frozen =
      call.args.steps !== undefined
        ? { title: call.args.title ?? '', steps: call.args.steps }
        : {
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
    const snapshot = this.plan();
    if (!snapshot || snapshot.steps.length === 0) {
      return;
    }
    void this.planHandoff.execute(snapshot);
  }
}

export const planWidget = createFrontendTool<PlanCardArgs>({
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
  handler: async () => ({ shown: true }),
});

export const planHandoffCard = createRenderToolCall({
  name: PLAN_WIDGET_TOOL_NAME,
  args: planCardArgsSchema,
  component: PlanWidget,
});
