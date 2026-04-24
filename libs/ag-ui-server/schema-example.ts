export type JsonSchema = Record<string, unknown>;

export function createExampleFromJsonSchema(schema: JsonSchema): unknown {
  const examples = schema['examples'];
  if (Array.isArray(examples) && examples[0]) {
    return examples[0];
  }

  const defaultValue = schema['default'];
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  if ('const' in schema) {
    return schema['const'];
  }

  const enumValues = schema['enum'];
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues[0];
  }

  const anyOf = schema['anyOf'];
  if (Array.isArray(anyOf) && anyOf.length > 0) {
    return createExampleFromJsonSchema(anyOf[0] as JsonSchema);
  }

  const oneOf = schema['oneOf'];
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    return createExampleFromJsonSchema(oneOf[0] as JsonSchema);
  }

  const type = schema['type'];
  if (type === 'object') {
    const properties = schema['properties'];
    return Object.entries(
      properties && typeof properties === 'object' ? properties : {},
    ).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = createExampleFromJsonSchema(value as JsonSchema);
      return result;
    }, {});
  }

  const items = schema['items'];
  if (type === 'array' && items) {
    return [createExampleFromJsonSchema(items as JsonSchema)];
  }

  if (type === 'string') {
    if (schema['format'] === 'date-time') {
      return '2026-04-10T09:30:00.000Z';
    }

    return 'example';
  }

  const minimum = schema['minimum'];
  if (type === 'number' || type === 'integer') {
    if (typeof minimum === 'number') {
      return minimum;
    }

    return 1;
  }

  if (type === 'boolean') {
    return true;
  }

  return null;
}

export function renderComponentEntry(
  name: string,
  description: string,
  jsonSchema: JsonSchema,
): string {
  const example = JSON.stringify(
    createExampleFromJsonSchema(jsonSchema),
    null,
    2,
  );

  return [
    `Component: ${name}`,
    `Purpose: ${description}`,
    `Example Props: ${example}`,
  ].join('\n');
}
