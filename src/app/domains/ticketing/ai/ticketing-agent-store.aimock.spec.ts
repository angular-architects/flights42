// aimock is an HTTP mock server, so this spec runs in Node (not the browser
// runner): `npm run test:aimock`. It still goes through the CopilotKit runtime
// and the Agent Store, exactly like the other seams.
import { randomUUID } from '@ag-ui/client';
import { type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AGUIMock, buildStateUpdate } from '@copilotkit/aimock/agui';
import {
  type AgentStore,
  CopilotKit,
  injectAgentStore,
  provideCopilotKit,
} from '@copilotkit/angular';

import { sendMessage } from '../../shared/util-copilotkit/agent-store-helper';
import { AppHttpAgent } from '../../shared/util-copilotkit/app-http-agent';

const TICKETING_AGENT_ID = 'ticketingAgent';
const REFINEMENT_AGENT_ID = 'travelRefinementAgent';

function setupStore(agentId: string, url: string): Signal<AgentStore> {
  const copilotKit = TestBed.inject(CopilotKit);

  const agent = new AppHttpAgent({ agentId, url, threadId: randomUUID() });

  copilotKit.updateRuntime({
    selfManagedAgents: {
      ...copilotKit.agents(),
      [agentId]: agent,
    },
  });

  return TestBed.runInInjectionContext(() => injectAgentStore(agentId));
}

describe('agent stores against the aimock AG-UI server', () => {
  let mock: AGUIMock;
  let url: string;

  beforeAll(async () => {
    mock = new AGUIMock();
    mock
      .onMessage(
        'Find flights from Paris to London',
        'Here are the flights I found.',
      )
      .onToolCall(
        'Add flight 3 to my basket',
        'toggleFlightSelection',
        '{"flightId":3,"selected":true}',
      )
      .onRun(
        'Plan a weekend in London',
        buildStateUpdate({
          summary: 'A weekend in London',
          flights: [],
          hotels: [],
        }),
      );
    url = await mock.start();
  });

  afterAll(async () => {
    await mock.stop();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });
  });

  it('decodes a reply streamed by the aimock AG-UI server', async () => {
    const store = setupStore(TICKETING_AGENT_ID, url);
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Find flights from Paris to London');

    await expect
      .poll(
        () =>
          store()
            .messages()
            .find((message) => message.role === 'assistant')?.content,
      )
      .toBe('Here are the flights I found.');
  });

  it('surfaces a tool call the agent decides to make', async () => {
    const store = setupStore(TICKETING_AGENT_ID, url);
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Add flight 3 to my basket');

    await expect
      .poll(() =>
        store()
          .messages()
          .flatMap((message) =>
            message.role === 'assistant' ? (message.toolCalls ?? []) : [],
          )
          .map((call) => call.function.name),
      )
      .toContain('toggleFlightSelection');
  });

  it('applies a server-pushed travel plan to the store state', async () => {
    const store = setupStore(REFINEMENT_AGENT_ID, url);
    const copilotKit = TestBed.inject(CopilotKit);

    await sendMessage(copilotKit, store, 'Plan a weekend in London');

    await expect
      .poll(() => store().state())
      .toEqual({
        summary: 'A weekend in London',
        flights: [],
        hotels: [],
      });
  });
});
