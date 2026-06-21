export function doNotEditWarning(target, source) {
  return `DO NOT EDIT ${target}.

This is a generated copy produced by \`npm run sync:agent-config\`
from ${source}. Any change here is overwritten on the next sync.
Edit ${source} instead.
`;
}

// Claude hook event name -> Cursor hook event name.
const CURSOR_EVENT = { Stop: 'stop' };
const CURSOR_LOOP_LIMIT = 3;

export function toCursorHooks(claudeHooks) {
  const cursorHooks = {};
  for (const [event, groups] of Object.entries(claudeHooks)) {
    const cursorEvent = CURSOR_EVENT[event];
    if (!cursorEvent) {
      throw new Error(`[sync] no Cursor mapping for hook event "${event}"`);
    }
    cursorHooks[cursorEvent] = groups.flatMap((group) => {
      return group.hooks.map((hook) => {
        return {
          command: hook.command.replaceAll('claude', 'cursor'),
          timeout: hook.timeout,
          loop_limit: CURSOR_LOOP_LIMIT,
        };
      });
    });
  }
  return cursorHooks;
}
