/**
 * Convenience wrapper around QuickJS.
 * See https://github.com/justjake/quickjs-emscripten
 */
import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
} from 'quickjs-emscripten';

export type HostFunctions = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => unknown | Promise<unknown>
>;

export interface SandboxOptions {
  functions?: HostFunctions;
  memoryLimitBytes?: number;
  stackLimitBytes?: number;
  timeoutMs?: number;
  hardTimeoutMs?: number;
}

const DEFAULTS = {
  memoryLimitBytes: 64 * 1024 * 1024,
  stackLimitBytes: 1024 * 1024,
  timeoutMs: 30_000,
  hardTimeoutMs: 45_000,
};

export class SandboxTimeoutError extends Error {
  constructor(ms: number) {
    super(`sandbox exceeded outer timeout of ${ms} ms`);
    this.name = 'SandboxTimeoutError';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toGuest(context: QuickJSContext, value: unknown): QuickJSHandle {
  if (value === undefined) {
    return context.undefined;
  }
  return context.unwrapResult(context.evalCode(`(${JSON.stringify(value)})`));
}

function registerFunction(
  context: QuickJSContext,
  runtime: QuickJSRuntime,
  name: string,
  fn: HostFunctions[string],
): void {
  const handle = context.newFunction(name, (...argHandles) => {
    const args = argHandles.map((argHandle) => context.dump(argHandle));

    let result: unknown;
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
      (error: unknown) => {
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

async function evalInSandbox(
  code: string,
  opts: Required<SandboxOptions>,
): Promise<void> {
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

export async function runSandbox(
  code: string,
  options: SandboxOptions = {},
): Promise<void> {
  const opts: Required<SandboxOptions> = {
    ...DEFAULTS,
    functions: {},
    ...options,
  };

  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
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
