import { A2uiRendererService } from '@a2ui/angular/v0_9';
import { TestBed } from '@angular/core/testing';

import { A2uiSurfaceWidgetComponent } from '../widgets/a2ui-surface-widget';
import { A2uiActivityRenderer } from './a2ui-activity-renderer';

describe('A2uiActivityRenderer', () => {
  let renderer: A2uiActivityRenderer;
  let processMessages: ReturnType<typeof vi.fn>;
  let getSurface: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    processMessages = vi.fn();
    getSurface = vi.fn().mockReturnValue({});

    TestBed.configureTestingModule({
      providers: [
        A2uiActivityRenderer,
        {
          provide: A2uiRendererService,
          useValue: { processMessages, surfaceGroup: { getSurface } },
        },
      ],
    });

    renderer = TestBed.inject(A2uiActivityRenderer);
  });

  it('handles the a2ui-surface activity type', () => {
    expect(renderer.activityType).toBe('a2ui-surface');
  });

  it('processes the operations and returns a surface widget', () => {
    const operations = [{ createSurface: { surfaceId: 's1' } }];

    const widget = renderer.buildWidget({
      messageId: 'm1',
      content: { operations },
    });

    expect(processMessages).toHaveBeenCalledWith(operations);
    expect(widget).toEqual({
      kind: 'result',
      id: 'm1-a2ui-s1',
      name: 'a2ui_m1',
      component: A2uiSurfaceWidgetComponent,
      props: { surfaceId: 's1' },
    });
  });

  it('derives the surface id from update operations', () => {
    const widget = renderer.buildWidget({
      messageId: 'm1',
      content: { operations: [{ updateDataModel: { surfaceId: 's2' } }] },
    });

    expect(widget?.props).toEqual({ surfaceId: 's2' });
  });

  it('returns null for content without operations', () => {
    expect(renderer.buildWidget({ messageId: 'm1', content: {} })).toBeNull();
    expect(
      renderer.buildWidget({ messageId: 'm1', content: 'nope' }),
    ).toBeNull();
    expect(processMessages).not.toHaveBeenCalled();
  });

  it('returns null when the surface was not rendered', () => {
    getSurface.mockReturnValue(undefined);

    const widget = renderer.buildWidget({
      messageId: 'm1',
      content: { operations: [{ createSurface: { surfaceId: 's1' } }] },
    });

    expect(widget).toBeNull();
  });
});
