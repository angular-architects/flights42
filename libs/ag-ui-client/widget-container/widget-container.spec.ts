import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type AgUiActionData, type AgUiWidgetInstance } from '../ag-ui-types';
import { WidgetContainerComponent } from './widget-container';

@Component({ template: '<p>{{ title() }}</p>' })
class DummyWidget {
  readonly title = input.required<string>();
}

@Component({ template: '<p>{{ actionData().toolName }}</p>' })
class DummyActionCard {
  readonly actionData = input.required<AgUiActionData>();
}

function render(widget: AgUiWidgetInstance): HTMLElement {
  const fixture = TestBed.createComponent(WidgetContainerComponent);
  fixture.componentRef.setInput('widget', widget);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('WidgetContainerComponent', () => {
  it('renders result widgets with their props as inputs', () => {
    const element = render({
      kind: 'result',
      id: 'w1',
      name: 'dummyWidget',
      component: DummyWidget,
      props: { title: 'Hello Widget' },
    });

    expect(element.textContent).toContain('Hello Widget');
  });

  it('renders action widgets with the actionData input', () => {
    const element = render({
      kind: 'action',
      id: 'w1',
      name: 'bookFlight',
      component: DummyActionCard,
      toolCallId: 'tc1',
      data: {
        toolCallId: 'tc1',
        toolName: 'bookFlight',
        status: 'pending',
        input: {},
      },
    });

    expect(element.textContent).toContain('bookFlight');
  });
});
