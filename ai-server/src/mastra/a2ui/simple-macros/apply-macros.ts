import type { z } from 'zod';

import type { A2uiComponent, Macro, MacroInput, MacroMap } from './macro.js';

export const MAX_MACRO_DEPTH = 16;

export interface ApplyMacrosConfig {
  recursive: boolean;
}

export interface MacroDataEntry {
  path: string;
  value: unknown;
}

export interface AppliedMacros {
  components: A2uiComponent[];
  data: MacroDataEntry[];
}

interface MacroInvocation {
  node: A2uiComponent;
  macro: Macro<z.ZodType, unknown>;
  input: MacroInput<z.ZodType>;
}

export async function applyMacros(
  components: A2uiComponent[],
  macros: MacroMap,
  config: ApplyMacrosConfig = { recursive: false },
): Promise<AppliedMacros> {
  const data: MacroDataEntry[] = [];
  let current = components;

  for (let wave = 0; ; wave += 1) {
    const nodes = current.filter((component) =>
      Object.hasOwn(macros, component.component),
    );
    if (nodes.length === 0) {
      break;
    }
    if (wave === MAX_MACRO_DEPTH) {
      const names = nodes.map((node) => node.component).join(', ');
      throw new Error(
        `Macro expansion exceeds depth ${MAX_MACRO_DEPTH}: ${names}`,
      );
    }

    const invocations = nodes.map((node) => {
      return toInvocation(node, macros, wave === 0);
    });
    const loaded = await Promise.all(
      invocations.map((invocation) => load(invocation)),
    );

    const expansions = new Map<A2uiComponent, A2uiComponent[]>();
    invocations.forEach((invocation, index) => {
      const rendered = invocation.macro.render(invocation.input);
      checkRoot(invocation.node, rendered);
      if (loaded[index] !== undefined) {
        data.push({ path: `/${invocation.node.id}`, value: loaded[index] });
      }
      expansions.set(invocation.node, rendered);
    });
    current = current.flatMap((component) => {
      return expansions.get(component) ?? [component];
    });

    if (!config.recursive) {
      break;
    }
  }

  return { components: current, data };
}

function toInvocation(
  node: A2uiComponent,
  macros: MacroMap,
  validated: boolean,
): MacroInvocation {
  const macro = macros[node.component];
  if (validated) {
    return { node, macro, input: node };
  }
  const parsed = macro.schema.parse(node) as Record<string, unknown>;
  return { node, macro, input: { ...parsed, id: node.id } };
}

function load(invocation: MacroInvocation): Promise<unknown> {
  if (!invocation.macro.load) {
    return Promise.resolve(undefined);
  }
  return invocation.macro.load(invocation.input);
}

function checkRoot(node: A2uiComponent, rendered: A2uiComponent[]): void {
  const roots = rendered.filter((component) => {
    return component.id === node.id;
  });
  if (roots.length !== 1) {
    throw new Error(
      `Macro ${node.component} must render exactly one component with id "${node.id}"`,
    );
  }
}
