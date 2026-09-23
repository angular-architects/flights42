import { projectFiles } from 'archunit';
import { describe, expect, it } from 'vitest';

import { isLocalDependency, violationsOf } from './utils';

const TS_CONFIG = 'tsconfig.arch.json';

// All application files. Regular expressions are matched against the path.
const APP = '**/src/app/**';

const STORE = /-store\.ts$/;
const CLIENT = /-client\.ts$/;
const SMART = /-(page|search|edit|detail|overview)\.ts$/;
const DUMB = /(-(card|pane)\.ts$|\/ui(-[^/]+)?\/)/;
const AI_LAYER = /\/ai\//;
const COORDINATOR = /-coordinator\.ts$/;

// A rule whose pattern matches no file fails instead of passing silently.
describe('architecture: suffix-based access rules', () => {
  it('only stores may access data access (clients)', async () => {
    const rule = projectFiles(TS_CONFIG)
      .inPath(APP, { except: [STORE, AI_LAYER] })
      .shouldNot()
      .dependOnFiles()
      .withName(CLIENT);

    expect(await violationsOf(rule)).toEqual([]);
  });

  it('only smart components may access a store (locality and ai excepted)', async () => {
    // Coordinators are a dedicated service layer that may combine several stores.
    const rule = projectFiles(TS_CONFIG)
      .inPath(APP, { except: [SMART, AI_LAYER, COORDINATOR] })
      .shouldNot()
      .dependOnFiles()
      .withName(STORE);

    // Exception: when the store is co-located (same or child folder)
    expect(await violationsOf(rule, isLocalDependency)).toEqual([]);
  });

  it('stores must not access other stores', async () => {
    // Combining several stores is the job of a coordinator, not of a store.
    const rule = projectFiles(TS_CONFIG)
      .withName(STORE)
      .shouldNot()
      .dependOnFiles()
      .withName(STORE);

    expect(await violationsOf(rule)).toEqual([]);
  });

  it('dumb components must not access smart components', async () => {
    const rule = projectFiles(TS_CONFIG)
      .inPath(DUMB)
      .shouldNot()
      .dependOnFiles()
      .withName(SMART);

    expect(await violationsOf(rule)).toEqual([]);
  });
});
