interface MinimalProcess {
  env: Record<string, string | undefined>;
  platform: string;
  argv: string[];
}

const scope = globalThis as typeof globalThis & { process?: MinimalProcess };

if (!scope.process) {
  scope.process = { env: {}, platform: 'browser', argv: [] };
}
