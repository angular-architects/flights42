import { runStopHook } from './run-stop-hook.mjs';

runStopHook({
  success: () => ({ exitCode: 0 }),
  fail: (_input, message) => ({ exitCode: 2, stderr: message }),
});
