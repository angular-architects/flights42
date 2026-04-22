interface RxSubscription {
  unsubscribe(): void;
}

interface RxObservable<T> {
  subscribe(observer: {
    next?: (value: T) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }): RxSubscription;
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

export interface ObservableToSseStreamOptions<T> {
  /**
   * Build the SSE payload for each event emitted by the source observable.
   * Return `null` to skip an event.
   */
  serialize?: (event: T) => string | null;
  /**
   * Build the SSE payload emitted when the source observable errors.
   * Return `null` to skip sending an error payload.
   */
  serializeError?: (error: unknown) => string | null;
  /**
   * Invoked when the consumer cancels the stream (e.g. client disconnect).
   * Runs after the subscription has been torn down.
   */
  onCancel?: () => void;
}

const ENCODER = new TextEncoder();

function defaultSerialize(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function defaultSerializeError(err: unknown): string {
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
export function observableToSseStream<T>(
  source: RxObservable<T>,
  options: ObservableToSseStreamOptions<T> = {},
): ReadableStream<Uint8Array> {
  const serialize = options.serialize ?? defaultSerialize;
  const serializeError = options.serializeError ?? defaultSerializeError;

  let subscription: RxSubscription | undefined;
  let closed = false;

  const safeEnqueue = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    chunk: Uint8Array,
  ): void => {
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

  const safeClose = (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void => {
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

  const enqueuePayload = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    payload: string | null,
  ): void => {
    if (payload === null) {
      return;
    }
    safeEnqueue(controller, ENCODER.encode(payload));
  };

  return new ReadableStream<Uint8Array>({
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
