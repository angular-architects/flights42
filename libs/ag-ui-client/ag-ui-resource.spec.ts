import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { z } from 'zod';

import { agUiResource } from './ag-ui-resource';
import { defineAgUiComponent } from './ag-ui-types';
import { createShowComponentsTool } from './tools/show-component.tool';

@Component({ template: '' })
class DummyWidget {
  readonly title = input.required<string>();
}

const dummyWidget = defineAgUiComponent({
  name: 'dummyWidget',
  description: 'Test widget',
  component: DummyWidget,
  schema: z.object({ title: z.string() }),
});

describe('agUiResource', () => {
  it('constructs without tools and without A2UI providers', () => {
    const chat = TestBed.runInInjectionContext(() =>
      agUiResource({ url: 'http://localhost/agent' }),
    );

    expect(chat.value()).toEqual([]);
    expect(chat.isLoading()).toBe(false);
    chat.dispose();
  });

  it('accepts components without an explicit showComponents tool', () => {
    const chat = TestBed.runInInjectionContext(() =>
      agUiResource({
        url: 'http://localhost/agent',
        components: [dummyWidget],
      }),
    );

    expect(chat.value()).toEqual([]);
    chat.dispose();
  });

  it('throws when components and a showComponents tool are combined', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        agUiResource({
          url: 'http://localhost/agent',
          tools: [createShowComponentsTool([dummyWidget])],
          components: [dummyWidget],
        }),
      ),
    ).toThrowError(/either via `components`/);
  });
});
