import { inject, Injectable } from '@angular/core';
import { CopilotKit, injectAgentStore } from '@copilotkit/angular';

import { AgentModeService } from '../../../shared/util-common/agent-mode-service';
import { sendDeveloperMessage } from '../../../shared/util-copilotkit/agent-store-helper';
import { TICKETING_AGENT_ID } from '../agent-ids';
import { Plan, PlanStep } from './plan-model';

@Injectable({ providedIn: 'root' })
export class PlanHandoff {
  private readonly copilotKit = inject(CopilotKit);
  private readonly agentMode = inject(AgentModeService);
  private readonly executionStore = injectAgentStore(TICKETING_AGENT_ID);

  async execute(plan: Plan): Promise<void> {
    this.agentMode.setMode('execution');
    const message = buildExecutionMessage(plan.steps);
    await sendDeveloperMessage(this.copilotKit, this.executionStore, message);
  }
}

function buildExecutionMessage(steps: PlanStep[]): string {
  const lines = steps.map((step, index) => calcStepDescription(step, index));
  const plan = lines.join('\n');

  return `Execute the following plan now. Perform ALL ${steps.length} steps, in
          EXACTLY this order, one after another — do not reorder, skip, merge,
          add, or stop early. After each step's confirmation, immediately
          continue with the next step until every step is done:

            ${plan}`;
}

function calcStepDescription(step: PlanStep, index: number): string {
  const position = index + 1;
  let flight = '';
  if (step.flightId != null) {
    flight = `flight ${step.flightId}`;
  }
  const details = `${flight} — ${step.description}`;

  switch (step.action) {
    case 'book':
      return `${position}. Book ${details}`;
    case 'cancel':
      return `${position}. Cancel ${details}`;
    case 'other':
      return `${position}. Do ${details}`;
  }
}
