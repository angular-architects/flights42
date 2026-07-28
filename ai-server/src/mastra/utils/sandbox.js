/**
 * Convenience wrapper around QuickJS.
 * See https://github.com/justjake/quickjs-emscripten
 */
import { getQuickJS } from 'quickjs-emscripten';
const DEFAULTS = {
  memoryLimitBytes: 64 * 1024 * 1024,
  stackLimitBytes: 1024 * 1024,
  timeoutMs: 30_000,
  hardTimeoutMs: 45_000,
};
export class SandboxTimeoutError extends Error {
  constructor(ms) {
    super(`sandbox exceeded outer timeout of ${ms} ms`);
    this.name = 'SandboxTimeoutError';
  }
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function toGuest(context, value) {
  if (value === undefined) {
    return context.undefined;
  }
  return context.unwrapResult(context.evalCode(`(${JSON.stringify(value)})`));
}
function registerFunction(context, runtime, name, fn) {
  const handle = context.newFunction(name, (...argHandles) => {
    const args = argHandles.map((argHandle) => context.dump(argHandle));
    let result;
    try {
      result = fn(...args);
    } catch (error) {
      return { error: context.newError(errorMessage(error)) };
    }
    if (!(result instanceof Promise)) {
      return toGuest(context, result);
    }
    const deferred = context.newPromise();
    result.then(
      (value) => {
        const valueHandle = toGuest(context, value);
        deferred.resolve(valueHandle);
        valueHandle.dispose();
        deferred.dispose();
        runtime.executePendingJobs();
      },
      (error) => {
        const errorHandle = context.newError(errorMessage(error));
        deferred.reject(errorHandle);
        errorHandle.dispose();
        deferred.dispose();
        runtime.executePendingJobs();
      },
    );
    return deferred.handle;
  });
  context.setProp(context.global, name, handle);
  handle.dispose();
}
async function evalInSandbox(code, opts) {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(opts.memoryLimitBytes);
  runtime.setMaxStackSize(opts.stackLimitBytes);
  runtime.setModuleLoader((moduleName) => ({
    error: new Error(
      `import is not allowed in the sandbox (requested "${moduleName}")`,
    ),
  }));
  const start = Date.now();
  runtime.setInterruptHandler(() => Date.now() - start > opts.timeoutMs);
  const context = runtime.newContext();
  try {
    for (const [name, fn] of Object.entries(opts.functions)) {
      registerFunction(context, runtime, name, fn);
    }
    const evalHandle = context.unwrapResult(
      context.evalCode(code, 'sandbox.mjs', { type: 'module' }),
    );
    runtime.executePendingJobs();
    try {
      const settled = await context.resolvePromise(evalHandle);
      runtime.executePendingJobs();
      context.unwrapResult(settled).dispose();
    } finally {
      evalHandle.dispose();
    }
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
export async function runSandbox(code, options = {}) {
  const opts = {
    ...DEFAULTS,
    functions: {},
    ...options,
  };
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new SandboxTimeoutError(opts.hardTimeoutMs));
    }, opts.hardTimeoutMs);
  });
  try {
    await Promise.race([evalInSandbox(code, opts), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
