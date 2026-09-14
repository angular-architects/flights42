import { inject, Injectable } from '@angular/core';
import { CopilotKit, injectAgentStore } from '@copilotkit/angular';

import { AgentModeService } from '../../../shared/util-common/agent-mode-service';
import { sendDeveloperMessage } from '../../../shared/util-copilotkit/agent-store-helper';
import { TICKETING_AGENT_ID } from '../agent-ids';
import { PlanSnapshot, PlanStep } from './plan-schemas';

@Injectable({ providedIn: 'root' })
export class PlanHandoff {
  private readonly copilotKit = inject(CopilotKit);
  private readonly agentMode = inject(AgentModeService);
  private readonly executionStore = injectAgentStore(TICKETING_AGENT_ID);

  async execute(plan: PlanSnapshot): Promise<void> {
    this.agentMode.mode.set('execution');
    await sendDeveloperMessage(
      this.copilotKit,
      this.executionStore,
      buildExecutionMessage(plan.steps),
    );
  }
}

function verbForAction(action: PlanStep['action']): string {
  if (action === 'book') {
    return 'Book';
  }
  if (action === 'cancel') {
    return 'Cancel';
  }
  return 'Do';
}

function buildExecutionMessage(steps: PlanStep[]): string {
  const lines = steps
    .map((step, index) => {
      const verb = verbForAction(step.action);
      const flight = step.flightId != null ? ` flight ${step.flightId}` : '';
      return `${index + 1}. ${verb}${flight} — ${step.description}`;
    })
    .join('\n');

  return `Execute the following plan now. Perform ALL ${steps.length} steps, in
          EXACTLY this order, one after another — do not reorder, skip, merge,
          add, or stop early. After each step's confirmation, immediately
          continue with the next step until every step is done:

            ${lines}`;
}
