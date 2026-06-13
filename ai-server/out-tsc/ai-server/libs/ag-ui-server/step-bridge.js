export const AG_UI_BRIDGE_KEY = 'agUiBridge';
export function attachBridge(requestContext, bridge) {
  const ctx = requestContext;
  ctx.set?.(AG_UI_BRIDGE_KEY, bridge);
}
export function readBridge(requestContext) {
  if (!requestContext) {
    return undefined;
  }
  const ctx = requestContext;
  const candidate = ctx.get?.(AG_UI_BRIDGE_KEY);
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.emit === 'function' &&
    typeof candidate.emitToolCall === 'function'
  ) {
    return candidate;
  }
  return undefined;
}
/** @deprecated Use {@link attachBridge}. */
export const attachStepBridge = attachBridge;
/** @deprecated Use {@link readBridge}. */
export const readStepBridge = readBridge;
