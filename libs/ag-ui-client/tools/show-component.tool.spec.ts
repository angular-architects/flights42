import { Component, input } from '@angular/core';
import { z } from 'zod';

import {
  type AgUiActionData,
  defineActionCard,
  defineAgUiComponent,
} from '../ag-ui-types';
import { createShowComponentsTool } from './show-component.tool';

@Component({ template: '' })
class DummyWidget {
  readonly title = input.required<string>();
}

@Component({ template: '' })
class DummyActionCard {
  readonly actionData = input.required<AgUiActionData>();
}

const publicWidget = defineAgUiComponent({
  name: 'publicWidget',
  description: 'A public widget',
  component: DummyWidget,
  schema: z.object({ title: z.string() }),
});

const clientOnlyWidget = defineAgUiComponent({
  name: 'clientOnlyWidget',
  description: 'A client-only widget',
  component: DummyWidget,
  clientOnly: true,
  schema: z.object({ title: z.string() }),
});

const actionCard = defineActionCard({
  toolName: 'bookFlight',
  component: DummyActionCard,
});

describe('createShowComponentsTool', () => {
  it('creates the showComponents pseudo-tool', () => {
    const tool = createShowComponentsTool([publicWidget]);

    expect(tool.name).toBe('showComponents');
    expect(tool.followUpAfterExecution).toBe(false);
    expect(tool.registeredComponents).toEqual([publicWidget]);
  });

  it('echoes its arguments so widgets can be built from the tool result', () => {
    const tool = createShowComponentsTool([publicWidget]);
    const args = {
      components: [{ name: 'publicWidget' as const, props: { title: 'Hi' } }],
    };

    expect(tool.execute(args)).toEqual(args);
  });

  it('accepts calls for registered public components', () => {
    const tool = createShowComponentsTool([publicWidget, clientOnlyWidget]);

    expect(() =>
      tool.parse?.({
        components: [{ name: 'publicWidget', props: { title: 'Hi' } }],
      }),
    ).not.toThrow();
  });

  it('rejects unknown and client-only component names', () => {
    const tool = createShowComponentsTool([publicWidget, clientOnlyWidget]);

    expect(() =>
      tool.parse?.({ components: [{ name: 'nope', props: {} }] }),
    ).toThrow();
    expect(() =>
      tool.parse?.({
        components: [{ name: 'clientOnlyWidget', props: { title: 'Hi' } }],
      }),
    ).toThrow();
  });

  it('keeps client-only components and action cards renderable but undocumented', () => {
    const tool = createShowComponentsTool([
      publicWidget,
      clientOnlyWidget,
      actionCard,
    ]);

    expect(tool.registeredComponents).toEqual([
      publicWidget,
      clientOnlyWidget,
      actionCard,
    ]);
    expect(tool.description).not.toContain('clientOnlyWidget');
    expect(tool.description).not.toContain('bookFlight');
  });

  it('documents each public component with purpose and example', () => {
    const tool = createShowComponentsTool([publicWidget]);

    expect(tool.description).toContain('Component: publicWidget');
    expect(tool.description).toContain('Purpose: A public widget');
    expect(tool.description).toContain('"title": "example"');
  });

  it('throws when no public component is given', () => {
    expect(() => createShowComponentsTool([clientOnlyWidget])).toThrow();
  });
});
