export const AG_UI_BRIDGE_KEY = 'agUiBridge';
export function attachBridge(requestContext, bridge) {
  const ctx = requestContext;
  ctx.set?.(AG_UI_BRIDGE_KEY, bridge);
}
export function getBridge(requestContext) {
  if (!requestContext) {
    return undefined;
  }
  const ctx = requestContext;
  const candidate = ctx.get?.(AG_UI_BRIDGE_KEY);
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.emit === 'function' &&
    typeof candidate.emitToolCall === 'function' &&
    typeof candidate.emitStateSnapshot === 'function' &&
    typeof candidate.setState === 'function'
  ) {
    return candidate;
  }
  return undefined;
}
/** Alias of {@link getBridge}. */
export const readBridge = getBridge;
/** @deprecated Use {@link attachBridge}. */
export const attachStepBridge = attachBridge;
/** @deprecated Use {@link getBridge}. */
export const readStepBridge = getBridge;
