import type { z } from 'zod';

export interface MacroNode {
  id: string;
  component: string;
}

export type A2uiComponent = MacroNode & Record<string, unknown>;

export type MacroInput<TSchema extends z.ZodType> = z.output<TSchema> & {
  id: string;
};

export interface Macro<TSchema extends z.ZodType, TData> {
  schema: TSchema;
  load?(node: MacroInput<TSchema>): Promise<TData>;
  render(node: MacroInput<TSchema>): A2uiComponent[];
}

export type MacroMap = Record<string, Macro<z.ZodType, unknown>>;

export function defineMacro<TSchema extends z.ZodType, TData = undefined>(
  macro: Macro<TSchema, TData>,
): Macro<TSchema, TData> {
  return macro;
}

export function toMacroCatalog(macros: MacroMap, catalogId: string) {
  const components: Record<string, unknown> = {};
  for (const name of Object.keys(macros)) {
    components[name] = macros[name].schema.toJSONSchema();
  }
  return { catalogId, components };
}
