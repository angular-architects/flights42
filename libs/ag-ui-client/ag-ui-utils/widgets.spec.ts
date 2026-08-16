import {
  Component,
  inject,
  InjectionToken,
  Injector,
  input,
} from '@angular/core';
import { z } from 'zod';

import { type ActivityRenderer } from '../activity/activity-renderer';
import {
  type AgUiActionData,
  type AgUiChatMessage,
  type AgUiResultWidget,
  type AgUiToolCall,
  defineActionCard,
  defineAgUiComponent,
  type AgUiRegisteredComponent,
} from '../ag-ui-types';
import {
  appendWidgetsFromPendingToolResult,
  upsertActionWidgetForToolCall,
  upsertWidgetFromActivitySnapshot,
} from './widgets';

@Component({ template: '' })
class DummyWidget {
  readonly title = input.required<string>();
}

@Component({ template: '' })
class DummyActionCard {
  readonly actionData = input.required<AgUiActionData>();
}

const CAPTURE_TOKEN = new InjectionToken<string>('CAPTURE_TOKEN');

const dummyWidget = defineAgUiComponent({
  name: 'dummyWidget',
  description: 'Test widget',
  component: DummyWidget,
  schema: z.object({ title: z.string() }),
});

const capturingWidget = defineAgUiComponent({
  name: 'capturingWidget',
  description: 'Widget with captureProps hook',
  component: DummyWidget,
  schema: z.object({ title: z.string() }),
  captureProps: (props) => ({ ...props, captured: inject(CAPTURE_TOKEN) }),
});

const dummyActionCard = defineActionCard({
  toolName: 'bookFlight',
  component: DummyActionCard,
});

function componentMapOf(
  ...components: AgUiRegisteredComponent[]
): Map<string, AgUiRegisteredComponent> {
  return new Map(components.map((component) => [component.name, component]));
}

function assistantMessage(
  overrides: Partial<AgUiChatMessage> = {},
): AgUiChatMessage {
  return {
    id: 'm1',
    role: 'assistant',
    content: '',
    widgets: [],
    toolCalls: [],
    workflowSteps: [],
    ...overrides,
  };
}

function resultWidget(id: string, title = 'Hello'): AgUiResultWidget {
  return {
    kind: 'result',
    id,
    name: 'dummyWidget',
    component: DummyWidget,
    props: { title },
  };
}

function rendererMap(
  ...renderers: ActivityRenderer[]
): Map<string, ActivityRenderer> {
  return new Map(
    renderers.map((renderer) => [renderer.activityType, renderer]),
  );
}

describe('upsertWidgetFromActivitySnapshot', () => {
  const testRenderer: ActivityRenderer = {
    activityType: 'test-activity',
    buildWidget: ({ messageId, content }) =>
      content === 'skip'
        ? null
        : resultWidget(`${messageId}-test`, String(content)),
  };

  it('ignores snapshots without a registered renderer', () => {
    const messages = [assistantMessage()];

    const result = upsertWidgetFromActivitySnapshot(
      messages,
      'm1',
      'unknown-activity',
      {},
      rendererMap(testRenderer),
    );

    expect(result).toBe(messages);
  });

  it('ignores snapshots the renderer rejects', () => {
    const messages = [assistantMessage()];

    const result = upsertWidgetFromActivitySnapshot(
      messages,
      'm1',
      'test-activity',
      'skip',
      rendererMap(testRenderer),
    );

    expect(result).toBe(messages);
  });

  it('creates a synthetic assistant message for unknown message ids', () => {
    const result = upsertWidgetFromActivitySnapshot(
      [],
      'm9',
      'test-activity',
      'Hello',
      rendererMap(testRenderer),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m9');
    expect(result[0].role).toBe('assistant');
    expect(result[0].widgets).toEqual([resultWidget('m9-test')]);
  });

  it('appends the widget to an existing assistant message', () => {
    const messages = [assistantMessage()];

    const result = upsertWidgetFromActivitySnapshot(
      messages,
      'm1',
      'test-activity',
      'Hello',
      rendererMap(testRenderer),
    );

    expect(result[0].widgets).toEqual([resultWidget('m1-test')]);
  });

  it('replaces a widget with the same id in place', () => {
    const otherWidget = resultWidget('other');
    const messages = [
      assistantMessage({
        widgets: [resultWidget('m1-test', 'old'), otherWidget],
      }),
    ];

    const result = upsertWidgetFromActivitySnapshot(
      messages,
      'm1',
      'test-activity',
      'new',
      rendererMap(testRenderer),
    );

    expect(result[0].widgets).toEqual([
      resultWidget('m1-test', 'new'),
      otherWidget,
    ]);
  });

  it('leaves non-assistant messages untouched', () => {
    const messages = [assistantMessage({ role: 'user' })];

    const result = upsertWidgetFromActivitySnapshot(
      messages,
      'm1',
      'test-activity',
      'Hello',
      rendererMap(testRenderer),
    );

    expect(result).toBe(messages);
  });
});

describe('appendWidgetsFromPendingToolResult (showComponents)', () => {
  const pendingCall = { toolCallId: 'tc1', toolCallName: 'showComponents' };
  const injector = Injector.create({
    providers: [{ provide: CAPTURE_TOKEN, useValue: 'captured-value' }],
  });

  function messagesWithToolCall(): AgUiChatMessage[] {
    return [
      assistantMessage({
        toolCalls: [
          { id: 'tc1', name: 'showComponents', args: {}, status: 'complete' },
        ],
      }),
    ];
  }

  it('maps showComponents entries to widgets of registered components', () => {
    const content = JSON.stringify({
      components: [{ name: 'dummyWidget', props: { title: 'Hi' } }],
    });

    const result = appendWidgetsFromPendingToolResult(
      messagesWithToolCall(),
      pendingCall,
      content,
      componentMapOf(dummyWidget),
      'run1',
      injector,
    );

    expect(result[0].widgets).toEqual([
      {
        id: 'run1:tc1-0',
        name: 'dummyWidget',
        component: DummyWidget,
        props: { title: 'Hi' },
      },
    ]);
  });

  it('drops unknown component names and action cards', () => {
    const content = JSON.stringify({
      components: [
        { name: 'nope', props: {} },
        { name: 'bookFlight', props: {} },
      ],
    });

    const result = appendWidgetsFromPendingToolResult(
      messagesWithToolCall(),
      pendingCall,
      content,
      componentMapOf(dummyWidget, dummyActionCard),
      'run1',
      injector,
    );

    expect(result[0].widgets).toEqual([]);
  });

  it('ignores malformed tool results', () => {
    const messages = messagesWithToolCall();

    const result = appendWidgetsFromPendingToolResult(
      messages,
      pendingCall,
      'not json',
      componentMapOf(dummyWidget),
      'run1',
      injector,
    );

    expect(result).toBe(messages);
  });

  it('runs captureProps in the given injection context', () => {
    const content = JSON.stringify({
      components: [{ name: 'capturingWidget', props: { title: 'Hi' } }],
    });

    const result = appendWidgetsFromPendingToolResult(
      messagesWithToolCall(),
      pendingCall,
      content,
      componentMapOf(capturingWidget),
      'run1',
      injector,
    );

    expect(result[0].widgets[0].kind ?? 'result').toBe('result');
    expect((result[0].widgets[0] as AgUiResultWidget).props).toEqual({
      title: 'Hi',
      captured: 'captured-value',
    });
  });
});

describe('upsertActionWidgetForToolCall', () => {
  function toolCall(status: AgUiToolCall['status']): AgUiToolCall {
    return { id: 'tc1', name: 'bookFlight', args: {}, status };
  }

  it('adds an action widget for a tool with a registered action card', () => {
    const messages = [assistantMessage({ toolCalls: [toolCall('pending')] })];

    const result = upsertActionWidgetForToolCall(
      messages,
      toolCall('pending'),
      componentMapOf(dummyActionCard),
      'run1',
    );

    const widget = result[0].widgets[0];
    expect(widget.kind).toBe('action');
    expect(widget.id).toBe('run1:tc1-action');
    expect(widget.component).toBe(DummyActionCard);
  });

  it('replaces the widget when the tool call advances', () => {
    const componentMap = componentMapOf(dummyActionCard);
    const messages = [assistantMessage({ toolCalls: [toolCall('pending')] })];

    const pending = upsertActionWidgetForToolCall(
      messages,
      toolCall('pending'),
      componentMap,
      'run1',
    );
    const complete = upsertActionWidgetForToolCall(
      pending,
      toolCall('complete'),
      componentMap,
      'run1',
    );

    expect(complete[0].widgets).toHaveLength(1);
    expect(
      (complete[0].widgets[0] as { data: AgUiActionData }).data.status,
    ).toBe('complete');
  });

  it('removes the action widget when no action card is registered', () => {
    const componentMap = componentMapOf(dummyActionCard);
    const messages = [assistantMessage({ toolCalls: [toolCall('pending')] })];
    const withWidget = upsertActionWidgetForToolCall(
      messages,
      toolCall('pending'),
      componentMap,
      'run1',
    );

    const result = upsertActionWidgetForToolCall(
      withWidget,
      toolCall('pending'),
      componentMapOf(),
      'run1',
    );

    expect(result[0].widgets).toEqual([]);
  });
});
