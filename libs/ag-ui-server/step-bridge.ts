/**
 * Per-request bridge for surfacing workflow internals (step boundaries and
 * tool calls performed *inside* steps) to the AG-UI adapter, bypassing
 * Mastra's tool-stream pipe — which has been observed to not propagate
 * workflow internals reliably when a workflow is invoked as an agent tool.
 *
 * The bridge is stored on the per-request `RequestContext` under a known
 * key. Workflow steps read it (if present) and push events:
 *
 *   - `emit({ stepName, kind: 'started' | 'finished' })` for step boundaries.
 *   - `emitToolCall({ toolName, args, result })` for tool calls performed
 *     inside a step (e.g. a direct service call we want to expose to the UI
 *     as a regular AG-UI tool call).
 *
 * The adapter consumes these events and translates them into AG-UI
 * `STEP_*` / `TOOL_CALL_*` events on the SSE wire.
 *
 * Because the bridge lives on `RequestContext`, it is naturally per-request
 * and does not leak across concurrent users.
 */
import type { RequestContext } from '@mastra/core/request-context';

export const AG_UI_BRIDGE_KEY = 'agUiBridge';

export type AgUiStepEventKind = 'started' | 'finished';

export interface AgUiStepEvent {
  stepName: string;
  kind: AgUiStepEventKind;
  details?: Record<string, unknown>;
}

export interface AgUiToolCallEvent {
  /** Optional. If absent, the adapter generates a fresh id. */
  toolCallId?: string;
  /** Display name of the tool (will appear in the UI tool-call list). */
  toolName: string;
  /** Optional arguments passed to the tool. Serialized to JSON for the UI. */
  args?: unknown;
  /** Optional result. If provided, a TOOL_CALL_RESULT event is emitted too. */
  result?: unknown;
  /**
   * Optional: the workflow step this call was made from. Surfaced on the wire
   * as an extra field on TOOL_CALL_START so the client can group tool calls
   * under their parent step (necessary because parallel steps make
   * timing-based correlation unreliable).
   */
  stepName?: string;
}

export interface AgUiBridge {
  emit(event: AgUiStepEvent): void;
  emitToolCall(event: AgUiToolCallEvent): void;
  emitStateSnapshot(state: unknown): void;
  // Shared per-run working state. Lives on the bridge (a single object shared
  // across tool calls) because Mastra hands each tool a COPY of the
  // RequestContext, so RequestContext writes do not propagate between tools.
  getState(): unknown;
  setState(state: unknown): void;
}

/** @deprecated Use {@link AgUiBridge} instead. Kept for source compatibility. */
export type AgUiStepBridge = AgUiBridge;

interface BridgeAwareRequestContext {
  set?(key: string, value: unknown): void;
  get?(key: string): unknown;
}

export function attachBridge(
  requestContext: RequestContext,
  bridge: AgUiBridge,
): void {
  const ctx = requestContext as unknown as BridgeAwareRequestContext;
  ctx.set?.(AG_UI_BRIDGE_KEY, bridge);
}

export function getBridge(
  requestContext: RequestContext | undefined,
): AgUiBridge | undefined {
  if (!requestContext) {
    return undefined;
  }
  const ctx = requestContext as unknown as BridgeAwareRequestContext;
  const candidate = ctx.get?.(AG_UI_BRIDGE_KEY);
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { emit?: unknown }).emit === 'function' &&
    typeof (candidate as { emitToolCall?: unknown }).emitToolCall ===
      'function' &&
    typeof (candidate as { emitStateSnapshot?: unknown }).emitStateSnapshot ===
      'function' &&
    typeof (candidate as { setState?: unknown }).setState === 'function'
  ) {
    return candidate as AgUiBridge;
  }
  return undefined;
}

/** Alias of {@link getBridge}. */
export const readBridge = getBridge;

/** @deprecated Use {@link attachBridge}. */
export const attachStepBridge = attachBridge;

/** @deprecated Use {@link getBridge}. */
export const readStepBridge = getBridge;
