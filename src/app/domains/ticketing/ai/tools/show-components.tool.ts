import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  inject,
  input,
  runInInjectionContext,
  type Type,
  untracked,
} from '@angular/core';
import { type AngularToolCall, type ToolRenderer } from '@copilotkit/angular';
import {
  type AgUiActionRegisteredComponent,
  mcpAppsWidgetComponent,
} from '@internal/ag-ui-client';
import { z } from 'zod';

import { messageWidget } from '../../../shared/ui-assistant/widgets/message-widget';
import { createFrontendTool } from '../../../shared/util-copilotkit/tool-definition';
import { flightWidget } from '../../ui/flight-widget';
import { bookFlightActionCard } from '../widgets/book-flight-action-card';
import { cancelFlightActionCard } from '../widgets/cancel-flight-action-card';
import { planWidget } from '../widgets/plan-widget';

interface ResultComponentDefinition {
  kind?: 'result';
  name: string;
  description: string;
  component: Type<unknown>;
  schema: z.ZodTypeAny;
  clientOnly?: true;
  captureProps?: (props: Record<string, unknown>) => Record<string, unknown>;
}

type RegisteredComponentDefinition =
  | ResultComponentDefinition
  | AgUiActionRegisteredComponent<unknown, string>;

interface RenderedComponent {
  id: string;
  component: Type<unknown>;
  inputs: Record<string, unknown>;
}

interface ShowComponentsEntry {
  name: string;
  props: Record<string, unknown>;
}

export interface ShowComponentsArgs extends Record<string, unknown> {
  components: ShowComponentsEntry[];
}

type JsonSchema = Record<string, unknown>;

export const ticketingRegisteredComponents = [
  messageWidget,
  flightWidget,
  planWidget,
  mcpAppsWidgetComponent,
  bookFlightActionCard,
  cancelFlightActionCard,
] as const satisfies readonly RegisteredComponentDefinition[];

const resultComponents = ticketingRegisteredComponents.filter(
  isResultComponent,
) as ResultComponentDefinition[];

const showComponentsSchema = z.object({
  components: z
    .array(createComponentSchema(resultComponents))
    .min(1)
    .describe('Component configs with name discriminator and props.'),
}) as z.ZodType<ShowComponentsArgs>;

@Component({
  selector: 'app-show-components-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  template: `
    <div class="show-components-stack">
      @for (entry of renderedComponents(); track entry.id) {
        <ng-container
          *ngComponentOutlet="entry.component; inputs: entry.inputs" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .show-components-stack {
      display: grid;
      gap: 0.75rem;
    }
  `,
})
export class ShowComponentsRenderer implements ToolRenderer<ShowComponentsArgs> {
  private readonly environmentInjector = inject(EnvironmentInjector);

  readonly toolCall = input.required<AngularToolCall<ShowComponentsArgs>>();

  protected renderedComponents(): RenderedComponent[] {
    const args = this.readArgs();

    if (!args) {
      return [];
    }

    return args.components.flatMap((entry, index) => {
      const registeredComponent = resultComponents.find(
        (component) => component.name === entry.name,
      );

      if (!registeredComponent) {
        return [];
      }

      return [
        {
          id: `${entry.name}-${index}`,
          component: registeredComponent.component,
          inputs: this.captureInputs(registeredComponent, entry.props),
        },
      ];
    });
  }

  private readArgs(): ShowComponentsArgs | null {
    const toolCall = this.toolCall();

    if (toolCall.status === 'complete') {
      return parseShowComponentsResult(toolCall.result);
    }

    return showComponentsSchema.safeParse(toolCall.args).data ?? null;
  }

  private captureInputs(
    registeredComponent: ResultComponentDefinition,
    props: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!registeredComponent.captureProps) {
      return props;
    }

    return untracked(() =>
      runInInjectionContext(this.environmentInjector, () =>
        registeredComponent.captureProps!(props),
      ),
    );
  }
}

export const showComponentsTool = createFrontendTool({
  name: 'showComponents',
  description: createToolDescription(resultComponents),
  parameters: showComponentsSchema,
  component: ShowComponentsRenderer,
  followUp: false,
  handler: async (args) => args,
});

function parseShowComponentsResult(result: string): ShowComponentsArgs | null {
  try {
    return showComponentsSchema.parse(JSON.parse(result));
  } catch {
    return null;
  }
}

function createComponentSchema(
  registeredComponents: readonly ResultComponentDefinition[],
): z.ZodTypeAny {
  const publicComponents = registeredComponents.filter(
    (entry) => entry.clientOnly !== true,
  );

  if (publicComponents.length === 0) {
    throw new Error('showComponents requires at least one component');
  }

  const schemas = publicComponents.map((entry) =>
    z
      .object({
        name: z.literal(entry.name),
        props: entry.schema,
      })
      .describe(entry.description),
  );

  if (schemas.length === 1) {
    return schemas[0];
  }

  return z.discriminatedUnion(
    'name',
    schemas as unknown as [
      z.core.$ZodTypeDiscriminable,
      z.core.$ZodTypeDiscriminable,
      ...z.core.$ZodTypeDiscriminable[],
    ],
  );
}

function createToolDescription(
  registeredComponents: readonly ResultComponentDefinition[],
): string {
  const componentsDescription = registeredComponents
    .filter((entry) => entry.clientOnly !== true)
    .map((entry) => {
      const exampleCall = JSON.stringify(
        {
          components: [
            {
              name: entry.name,
              props: createExampleFromSchema(
                z.toJSONSchema(entry.schema) as unknown as JsonSchema,
              ),
            },
          ],
        },
        null,
        2,
      );

      return [
        `Component: ${entry.name}`,
        `Purpose: ${entry.description}`,
        `Example: ${exampleCall}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    'Render one or multiple flights UI components for the user.',
    'Call shape: { components: [{ name, props }] }',
    'Rules:',
    '- Never invent component names.',
    '- Never invent props.',
    '- Use only the registered components listed below.',
    '- Each entry in components must contain exactly name and props.',
    "- Follow each component's Purpose below for when and how to use it.",
    '',
    'Registered components:',
    componentsDescription,
  ].join('\n');
}

function createExampleFromSchema(schema: JsonSchema): unknown {
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
    return createExampleFromSchema(anyOf[0] as JsonSchema);
  }

  const oneOf = schema['oneOf'];
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    return createExampleFromSchema(oneOf[0] as JsonSchema);
  }

  const type = schema['type'];
  if (type === 'object') {
    const properties = schema['properties'];
    return Object.entries(
      properties && typeof properties === 'object' ? properties : {},
    ).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = createExampleFromSchema(value as JsonSchema);
      return result;
    }, {});
  }

  const items = schema['items'];
  if (type === 'array' && items) {
    return [createExampleFromSchema(items as JsonSchema)];
  }

  if (type === 'string') {
    if (schema['format'] === 'date-time') {
      return '2026-04-10T09:30:00.000Z';
    }

    return 'example';
  }

  const minimum = schema['minimum'];
  if (type === 'number') {
    return typeof minimum === 'number' ? minimum : 1;
  }

  if (type === 'integer') {
    return typeof minimum === 'number' ? minimum : 1;
  }

  if (type === 'boolean') {
    return true;
  }

  return null;
}

function isResultComponent(
  component: RegisteredComponentDefinition,
): component is ResultComponentDefinition {
  return component.kind !== 'action';
}
