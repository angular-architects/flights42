import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

import { execSync } from 'node:child_process';

import { CiCheckError } from './ci-check-error.mjs';
import { runChecks } from './ci-checks.mjs';

const execSyncMock = vi.mocked(execSync);

function execFailure({ stdout = '', stderr = '' }) {
  return Object.assign(new Error('Command failed'), { stdout, stderr });
}

describe('runChecks', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('runs the three fast steps and does not throw when all pass', () => {
    execSyncMock.mockReturnValue('ok');

    expect(() => runChecks()).not.toThrow();
    expect(execSyncMock).toHaveBeenCalledTimes(3);
  });

  it('runs the fast steps plus the full-only steps in full mode', () => {
    execSyncMock.mockReturnValue('ok');

    runChecks({ full: true });

    expect(execSyncMock).toHaveBeenCalledTimes(5);
  });

  it('throws a CiCheckError carrying the captured stdout in capture mode', () => {
    execSyncMock.mockImplementation(() => {
      throw execFailure({ stdout: 'error  Unexpected store dependency' });
    });

    try {
      runChecks({ capture: true });
      expect.unreachable('runChecks should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CiCheckError);
      expect(error.step).toBe('npx ng lint flights');
      expect(error.output).toContain('Unexpected store dependency');
    }
  });

  it('also captures stderr output', () => {
    execSyncMock.mockImplementation(() => {
      throw execFailure({ stderr: 'FAIL arch/access-rules.spec.ts' });
    });

    expect(() => runChecks({ capture: true })).toThrowError(
      /FAIL arch\/access-rules/,
    );
  });

  it('stops at the first failing step', () => {
    execSyncMock.mockImplementationOnce(() => {
      throw execFailure({ stdout: 'boom' });
    });

    expect(() => runChecks({ capture: true })).toThrow();
    expect(execSyncMock).toHaveBeenCalledTimes(1);
  });
});
