import { randomUUID } from '@ag-ui/client';
import { type Message } from '@ag-ui/core';
import { effect, inject, Injectable, Injector } from '@angular/core';
import { CopilotKit, injectAgentStore } from '@copilotkit/angular';

import { AgentModeService } from '../../../shared/util-common/agent-mode-service';
import { markMessagesSent } from '../../../shared/util-copilotkit/agent-middlewares';
import { sendDeveloperMessage } from '../../../shared/util-copilotkit/agent-store-helper';
import { TICKETING_AGENT_ID } from '../agent-ids';
import { PlanSnapshot, PlanStep } from './plan-schemas';

export const PLAN_WIDGET_TOOL_NAME = 'planWidget';

@Injectable({ providedIn: 'root' })
export class PlanHandoff {
  private readonly copilotKit = inject(CopilotKit);
  private readonly agentMode = inject(AgentModeService);
  private readonly injector = inject(Injector);
  private readonly executionStore = injectAgentStore(TICKETING_AGENT_ID);

  async execute(plan: PlanSnapshot): Promise<void> {
    const agent = this.executionStore().agent;
    const card = buildPlanCardMessages(plan);
    markMessagesSent(agent, card);
    agent.addMessages(card);
    await this.whenVisible(card[card.length - 1].id);
    this.agentMode.mode.set('execution');
    await sendDeveloperMessage(
      this.copilotKit,
      this.executionStore,
      buildExecutionMessage(plan.steps),
    );
  }

  private whenVisible(messageId: string): Promise<void> {
    return new Promise((resolve) => {
      const ref = effect(
        () => {
          const visible = this.executionStore()
            .messages()
            .some((message) => message.id === messageId);
          if (visible) {
            ref.destroy();
            resolve();
          }
        },
        { injector: this.injector },
      );
    });
  }
}

function buildPlanCardMessages(plan: PlanSnapshot): Message[] {
  const toolCallId = randomUUID();
  return [
    {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: toolCallId,
          type: 'function',
          function: {
            name: PLAN_WIDGET_TOOL_NAME,
            arguments: JSON.stringify(plan),
          },
        },
      ],
    },
    {
      id: randomUUID(),
      role: 'tool',
      toolCallId,
      content: JSON.stringify({ shown: true }),
    },
  ];
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
