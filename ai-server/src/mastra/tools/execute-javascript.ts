import { createTool } from '@mastra/core/tools';
import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSHandle,
} from 'quickjs-emscripten';
import { z } from 'zod';

import { fetchFlights, type FlightRecord } from './search-flights.js';

const dataItemSchema = z.object({
  name: z.string(),
  value: z.number(),
});

const dataItemsSchema = z.array(dataItemSchema);

export interface ExecuteJavaScriptResult {
  data: z.infer<typeof dataItemsSchema>;
  code: string;
  title: string;
}

const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const STACK_LIMIT_BYTES = 1 * 1024 * 1024;
// Wall-clock budget enforced by the QuickJS interrupt handler. The handler
// is only checked between opcodes, so this only catches CPU-bound infinite
// loops once execution resumes after a host await.
const WALL_CLOCK_TIMEOUT_MS = 30_000;
// Outer hard timeout: if a host async (e.g. `fetchFlights`) ever wedges or
// the runtime gets stuck, the tool must still fail in bounded time instead
// of hanging the agent step forever.
const OUTER_TIMEOUT_MS = 45_000;

class SandboxTimeoutError extends Error {
  constructor(ms: number) {
    super(`sandbox exceeded outer timeout of ${ms} ms`);
    this.name = 'SandboxTimeoutError';
  }
}

class SubmitResultMissingError extends Error {
  constructor() {
    super(
      'Snippet finished without calling submitResult([{ name, value }, ...]).',
    );
    this.name = 'SubmitResultMissingError';
  }
}

/**
 * Builds a guest-side `Flight[]` directly via the QuickJS handle API. The
 * caller is responsible for disposing the returned array handle.
 */
function marshalFlights(
  context: QuickJSContext,
  flights: readonly FlightRecord[],
): QuickJSHandle {
  const arrayHandle = context.newArray();

  flights.forEach((flight, index) => {
    const objHandle = context.newObject();

    setNumberProp(context, objHandle, 'id', flight.id);
    setStringProp(context, objHandle, 'from', flight.from);
    setStringProp(context, objHandle, 'to', flight.to);
    setStringProp(context, objHandle, 'date', flight.date);
    setNumberProp(context, objHandle, 'delay', flight.delay);

    context.setProp(arrayHandle, String(index), objHandle);
    objHandle.dispose();
  });

  return arrayHandle;
}

function setStringProp(
  context: QuickJSContext,
  target: QuickJSHandle,
  key: string,
  value: string,
): void {
  const handle = context.newString(value);
  context.setProp(target, key, handle);
  handle.dispose();
}

function setNumberProp(
  context: QuickJSContext,
  target: QuickJSHandle,
  key: string,
  value: number,
): void {
  const handle = context.newNumber(value);
  context.setProp(target, key, handle);
  handle.dispose();
}

/**
 * Runs the LLM-generated `code` inside a fresh hardened QuickJS sandbox
 * **as an ES module**. Two host functions are exposed:
 *
 *   - `await loadFlights(from, to): Promise<Flight[]>`  — input
 *   - `submitResult(items: { name, value }[]): void`     — output
 *
 * Modules support top-level `await` natively, so the snippet does not
 * need to be wrapped in an IIFE. The script returns its result by
 * calling `submitResult(...)` exactly once. A missing call is reported
 * as a clear error instead of producing an undefined chart.
 *
 * No other host APIs are exposed (no `console`, no `fetch`, no `process`,
 * no `require`, no network beyond `loadFlights`). `import` and `export`
 * are blocked: the runtime's module loader rejects every specifier.
 *
 * Implementation note: `loadFlights` is bridged with the documented
 * deferred-promise pattern (sync host function returns a freshly created
 * QuickJS Promise that we resolve from the host once `fetchFlights`
 * settles, then drive the runtime forward via `executePendingJobs`).
 */
async function runInSandboxInner(code: string): Promise<unknown> {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(STACK_LIMIT_BYTES);

  // Block any `import` statement — the snippet must be self-contained and
  // can only reach the host via the two exposed functions.
  runtime.setModuleLoader((moduleName) => ({
    error: new Error(
      `import is not allowed in the sandbox (requested "${moduleName}")`,
    ),
  }));

  const start = Date.now();
  runtime.setInterruptHandler(() => Date.now() - start > WALL_CLOCK_TIMEOUT_MS);

  const context = runtime.newContext();

  let captured: unknown = undefined;
  let submitResultCalled = false;

  try {
    const loadFlightsHandle = context.newFunction(
      'loadFlights',
      (fromHandle, toHandle) => {
        const from = context.getString(fromHandle);
        const to = context.getString(toHandle);
        const deferred = context.newPromise();

        fetchFlights(from, to).then(
          (flights) => {
            const arrayHandle = marshalFlights(context, flights);
            deferred.resolve(arrayHandle);
            arrayHandle.dispose();
            deferred.dispose();
            runtime.executePendingJobs();
          },
          (error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error);
            const errorHandle = context.newError(message);
            deferred.reject(errorHandle);
            errorHandle.dispose();
            deferred.dispose();
            runtime.executePendingJobs();
          },
        );

        return deferred.handle;
      },
    );
    context.setProp(context.global, 'loadFlights', loadFlightsHandle);
    loadFlightsHandle.dispose();

    const submitResultHandle = context.newFunction(
      'submitResult',
      (valueHandle) => {
        captured = context.dump(valueHandle);
        submitResultCalled = true;
      },
    );
    context.setProp(context.global, 'submitResult', submitResultHandle);
    submitResultHandle.dispose();

    // `type: 'module'` enables top-level `await` and runs the snippet in
    // strict mode. Module evaluation may return a Promise (when the
    // module body uses top-level await), which we drive to completion
    // via the standard executePendingJobs + resolvePromise dance.
    const evalResult = context.evalCode(code, 'sandbox.mjs', {
      type: 'module',
    });
    const evalHandle = context.unwrapResult(evalResult);

    runtime.executePendingJobs();

    try {
      const settled = await context.resolvePromise(evalHandle);
      runtime.executePendingJobs();
      const moduleHandle = context.unwrapResult(settled);
      moduleHandle.dispose();
    } finally {
      evalHandle.dispose();
    }

    if (!submitResultCalled) {
      throw new SubmitResultMissingError();
    }

    return captured;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}

async function runInSandbox(code: string): Promise<unknown> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new SandboxTimeoutError(OUTER_TIMEOUT_MS));
    }, OUTER_TIMEOUT_MS);
  });

  try {
    return await Promise.race([runInSandboxInner(code), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const executeJavaScriptTool = createTool({
  id: 'executeJavaScript',
  description: [
    'Runs a snippet of JavaScript inside a hardened QuickJS sandbox to aggregate flight data into chart-ready `{ name, value }` pairs.',
    '',
    'The snippet is executed AS AN ES MODULE, so top-level `await` is supported. There is NO wrapping function — write straight-line statements; do NOT use `return`.',
    '',
    'TWO host functions are exposed:',
    '',
    '  `await loadFlights(from: string, to: string): Promise<Flight[]>`',
    '  `submitResult(items: { name: string, value: number }[]): void`',
    '',
    'where `from`/`to` are city names with the first letter uppercase (e.g. "Graz", "Hamburg") and each `Flight` has the shape `{ id: number, from: string, to: string, date: string, delay: number }` (date is ISO, delay is minutes).',
    '',
    'Workflow inside the snippet:',
    '  1. Call `await loadFlights(from, to)` once for every connection the request needs.',
    '  2. Aggregate the loaded arrays into the chart-ready `{ name, value }[]` shape.',
    '  3. Call `submitResult(items)` EXACTLY ONCE with that array. The sandbox treats this as the final result.',
    '',
    'The sandbox has NO other host APIs: no `fetch`, no `import`, no `require`, no `process`, no `console`, no network beyond `loadFlights`. `import`/`export` statements are rejected. It is killed after 30 s wall-clock time and is hard-capped at 64 MB memory and 1 MB stack.',
    '',
    'The tool returns `{ data, code, title }`; the caller is expected to forward `data` and `title` to the client `renderChart` tool.',
  ].join('\n'),
  inputSchema: z.object({
    code: z
      .string()
      .describe(
        'Module body. Use `await loadFlights(from, to)` to load flights for each connection, aggregate into `{ name, value }[]`, then call `submitResult(items)` exactly once.',
      ),
    title: z.string().describe('Human-readable chart title.'),
  }),
  outputSchema: z.object({
    data: dataItemsSchema,
    code: z.string(),
    title: z.string(),
  }),
  execute: async ({ code, title }) => {
    let raw: unknown;
    try {
      raw = await runInSandbox(code);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('executeJavaScript: sandbox failure', {
        message,
        stack: error instanceof Error ? error.stack : undefined,
        code,
      });
      throw new Error(`executeJavaScript: sandbox failure — ${message}`);
    }

    const parsed = dataItemsSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('executeJavaScript: invalid submitResult value', {
        raw,
        zodError: parsed.error.message,
        code,
      });
      throw new Error(
        `executeJavaScript: submitResult value does not match { name: string, value: number }[]. ${parsed.error.message}`,
      );
    }

    return { data: parsed.data, code, title };
  },
});
