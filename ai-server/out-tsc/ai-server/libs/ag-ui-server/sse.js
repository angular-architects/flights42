export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};
const ENCODER = new TextEncoder();
function defaultSerialize(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}
function defaultSerializeError(err) {
  return defaultSerialize({
    type: 'RUN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    code: 'run_error',
  });
}
/**
 * Convert an RxJS-style observable into a Web-Streams `ReadableStream<Uint8Array>`
 * ready to be returned as the body of an SSE response.
 *
 * Safely handles client disconnects: the underlying subscription is unsubscribed
 * and enqueue/close calls are guarded against `ERR_INVALID_STATE`.
 */
export function observableToSseStream(source, options = {}) {
  const serialize = options.serialize ?? defaultSerialize;
  const serializeError = options.serializeError ?? defaultSerializeError;
  let subscription;
  let closed = false;
  const safeEnqueue = (controller, chunk) => {
    if (closed) {
      return;
    }
    try {
      controller.enqueue(chunk);
    } catch {
      closed = true;
      subscription?.unsubscribe();
    }
  };
  const safeClose = (controller) => {
    if (closed) {
      return;
    }
    closed = true;
    try {
      controller.close();
    } catch {
      // Controller already closed by the runtime (e.g. client disconnect).
    }
  };
  const enqueuePayload = (controller, payload) => {
    if (payload === null) {
      return;
    }
    safeEnqueue(controller, ENCODER.encode(payload));
  };
  return new ReadableStream({
    start(controller) {
      // Initial comment line keeps proxies/clients from buffering.
      safeEnqueue(controller, ENCODER.encode(':\n\n'));
      subscription = source.subscribe({
        next(event) {
          enqueuePayload(controller, serialize(event));
        },
        error(err) {
          enqueuePayload(controller, serializeError(err));
          safeClose(controller);
        },
        complete() {
          safeClose(controller);
        },
      });
    },
    cancel() {
      closed = true;
      subscription?.unsubscribe();
      options.onCancel?.();
    },
  });
}
