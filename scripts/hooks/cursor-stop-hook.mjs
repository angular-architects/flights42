import { runStopHook } from './run-stop-hook.mjs';

runStopHook({
  skip: (input) => input.status === 'aborted',
  success: () => ({ exitCode: 0, stdout: '{}' }),
  fail: (_input, message) => ({
    exitCode: 0,
    stdout: JSON.stringify({ followup_message: message }),
  }),
});
