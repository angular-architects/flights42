import { writeFileSync } from 'node:fs';

import { cases, type TurnResult } from './cases';
import { setupTestBed, sum, type Turn } from './harness';

interface Outcome {
  failures: string[];
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  failedToolCalls: number;
  model?: string;
  tools: string[];
  trace?: Turn;
}

const runs = Number(process.env['EVAL_RUNS'] ?? 3);
const selected = cases.filter((evalCase) =>
  evalCase.name.includes(process.env['EVAL_CASE'] ?? ''),
);
const outcomes = new Map<string, Outcome[]>();

describe('flights42 eval', () => {
  for (const evalCase of selected) {
    it(
      evalCase.name,
      async () => {
        for (let i = 0; i < runs; i++) {
          setupTestBed();
          const results = await evalCase
            .run()
            .catch((error: unknown) => [
              { name: evalCase.name, failures: [String(error)] },
            ]);
          for (const result of results) {
            record(result);
          }
        }
      },
      4 * 60 * 60 * 1000,
    );
  }

  afterAll(() => {
    const report = [...outcomes.entries()].map(([name, list]) =>
      summarize(name, list),
    );
    const passed = sum(report.map((entry) => entry.passed));
    const total = sum(report.map((entry) => entry.total));
    process.stdout.write(
      `\n${report.map((entry) => entry.text).join('\n')}\n\nPassed ${passed}/${total} turns\n\n`,
    );

    const out = process.env['EVAL_OUT'];
    if (out) {
      writeFileSync(out, JSON.stringify(Object.fromEntries(outcomes), null, 2));
    }
  });
});

function record(result: TurnResult): void {
  const runsOfTurn = result.turn?.runs ?? [];
  const outcome: Outcome = {
    failures: result.failures,
    durationMs: result.turn?.durationMs ?? 0,
    inputTokens: sum(runsOfTurn.map((run) => run.inputTokens)),
    outputTokens: sum(runsOfTurn.map((run) => run.outputTokens)),
    failedToolCalls: sum(runsOfTurn.map((run) => run.failedToolCalls)),
    model: runsOfTurn.find((run) => run.model)?.model,
    tools: result.turn?.toolCalls.map((call) => call.name) ?? [],
    trace: result.turn,
  };
  outcomes.set(result.name, [...(outcomes.get(result.name) ?? []), outcome]);
}

function summarize(name: string, list: Outcome[]) {
  const passed = list.filter((outcome) => outcome.failures.length === 0).length;
  const average = (values: number[]) => sum(values) / values.length;
  const status =
    passed === list.length ? 'PASS' : passed === 0 ? 'FAIL' : 'PART';
  const seconds = list.map((outcome) => (outcome.durationMs / 1000).toFixed(1));
  const failures = [...new Set(list.flatMap((outcome) => outcome.failures))];
  const text = [
    `${status} ${passed}/${list.length}  ${name}`,
    `     ${seconds.join(' / ')} s, ` +
      `in ${Math.round(average(list.map((outcome) => outcome.inputTokens)))} tok, ` +
      `out ${Math.round(average(list.map((outcome) => outcome.outputTokens)))} tok, ` +
      `failed tool calls ${sum(list.map((outcome) => outcome.failedToolCalls))}`,
    ...failures.slice(0, 4).map((failure) => `     - ${failure}`),
  ].join('\n');
  return { text, passed, total: list.length };
}
