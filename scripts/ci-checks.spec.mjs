import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));

import { execSync } from 'node:child_process';

import { runChecks } from './ci-checks.mjs';

const execSyncMock = vi.mocked(execSync);

function execFailure({ stdout = '', stderr = '' }) {
  return Object.assign(new Error('Command failed'), { stdout, stderr });
}

describe('runChecks', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('runs the three fast steps and succeeds when all pass', () => {
    execSyncMock.mockReturnValue('ok');

    expect(runChecks()).toEqual({ status: 'success' });
    expect(execSyncMock).toHaveBeenCalledTimes(3);
  });

  it('runs the fast steps plus the full-only steps in full mode', () => {
    execSyncMock.mockReturnValue('ok');

    expect(runChecks({ full: true })).toEqual({ status: 'success' });
    expect(execSyncMock).toHaveBeenCalledTimes(5);
  });

  it('returns an error result carrying the captured stdout in capture mode', () => {
    execSyncMock.mockImplementation(() => {
      throw execFailure({ stdout: 'error  Unexpected store dependency' });
    });

    const result = runChecks({ capture: true });

    expect(result.status).toBe('error');
    expect(result.message).toContain('npx ng lint flights');
    expect(result.message).toContain('Unexpected store dependency');
  });

  it('also captures stderr output', () => {
    execSyncMock.mockImplementation(() => {
      throw execFailure({ stderr: 'FAIL arch/access-rules.spec.ts' });
    });

    const result = runChecks({ capture: true });

    expect(result.status).toBe('error');
    expect(result.message).toMatch(/FAIL arch\/access-rules/);
  });

  it('stops at the first failing step', () => {
    execSyncMock.mockImplementationOnce(() => {
      throw execFailure({ stdout: 'boom' });
    });

    expect(runChecks({ capture: true }).status).toBe('error');
    expect(execSyncMock).toHaveBeenCalledTimes(1);
  });
});
