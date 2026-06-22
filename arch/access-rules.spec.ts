import { filesOfProject } from 'tsarch';
import { describe, expect, it } from 'vitest';

import {
  anyFileExcept,
  formatDependency,
  isLocalAccess,
  toDependency,
} from './utils';

const TS_CONFIG = 'tsconfig.arch.json';

const STORE = String.raw`-store\.ts$`;
const CLIENT = String.raw`-client\.ts$`;
const SMART = String.raw`-(page|search|edit|detail|overview)\.ts$`;
const DUMB = String.raw`(-(card|pane)\.ts$|/ui(-[^/]+)?/)`;
const AI_LAYER = String.raw`/ai/`;
const COORDINATOR = String.raw`-coordinator\.ts$`;

describe('architecture: suffix-based access rules', () => {
  it('only stores may access data access (clients)', async () => {
    const rule = filesOfProject(TS_CONFIG)
      .matchingPattern(anyFileExcept(STORE, AI_LAYER))
      .shouldNot()
      .dependOnFiles()
      .matchingPattern(CLIENT);

    const violations = await rule.check();
    expect(violations.map(toDependency).map(formatDependency)).toEqual([]);
  });

  it('only smart components may access a store (locality and ai excepted)', async () => {
    // Coordinators are a dedicated service layer that may combine several stores.
    const rule = filesOfProject(TS_CONFIG)
      .matchingPattern(anyFileExcept(SMART, AI_LAYER, STORE, COORDINATOR))
      .shouldNot()
      .dependOnFiles()
      .matchingPattern(STORE);

    // Exception: when the store is co-located (same or child folder)
    const violations = (await rule.check())
      .map(toDependency)
      .filter(({ source, target }) => !isLocalAccess(source, target));

    expect(violations.map(formatDependency)).toEqual([]);
  });

  it('stores must not access other stores', async () => {
    // Combining several stores is the job of a coordinator, not of a store.
    const rule = filesOfProject(TS_CONFIG)
      .matchingPattern(STORE)
      .shouldNot()
      .dependOnFiles()
      .matchingPattern(STORE);

    const violations = await rule.check();
    expect(violations.map(toDependency).map(formatDependency)).toEqual([]);
  });

  it('dumb components must not access smart components', async () => {
    const rule = filesOfProject(TS_CONFIG)
      .matchingPattern(DUMB)
      .shouldNot()
      .dependOnFiles()
      .matchingPattern(SMART);

    const violations = await rule.check();
    expect(violations.map(toDependency).map(formatDependency)).toEqual([]);
  });
});
