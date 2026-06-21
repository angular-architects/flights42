export function doNotEditWarning(target, source) {
  return `DO NOT EDIT ${target}.

This is a generated copy produced by \`npm run sync:agent-config\`
from ${source}. Any change here is overwritten on the next sync.
Edit ${source} instead.
`;
}
