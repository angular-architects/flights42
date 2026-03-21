import {
  AgUiClientToolDefinition,
  AgUiWidget,
} from '../../../shared/ui-agent/ag-ui-types';

const flightSchema = {
  type: 'object',
  properties: {
    id: { type: 'number', description: 'The flight id' },
    from: { type: 'string', description: 'Departure city' },
    to: { type: 'string', description: 'Arrival city' },
    date: { type: 'string', description: 'Departure date in ISO format' },
    delay: { type: 'number', description: 'Delay in minutes' },
  },
  required: ['id', 'from', 'to', 'date', 'delay'],
  additionalProperties: false,
};

export function createShowComponentTool(): AgUiClientToolDefinition {
  return {
    name: 'showComponent',
    description:
      'Render a UI component for the user. Use this for messageWidget and flightWidget output.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          enum: ['messageWidget', 'flightWidget'],
          description: 'Name of the component to render.',
        },
        props: {
          type: 'object',
          description: 'Inputs for the selected component.',
        },
      },
      required: ['name', 'props'],
      additionalProperties: false,
      allOf: [
        {
          if: {
            properties: {
              name: { const: 'messageWidget' },
            },
            required: ['name'],
          },
          then: {
            properties: {
              props: {
                type: 'object',
                properties: {
                  data: {
                    type: 'string',
                    description:
                      'Plain text or markdown to display to the user.',
                  },
                },
                required: ['data'],
                additionalProperties: false,
              },
            },
          },
        },
        {
          if: {
            properties: {
              name: { const: 'flightWidget' },
            },
            required: ['name'],
          },
          then: {
            properties: {
              props: {
                type: 'object',
                properties: {
                  flight: flightSchema,
                  status: {
                    type: 'string',
                    enum: ['booked', 'other'],
                    description: 'Status of the flight',
                  },
                },
                required: ['flight', 'status'],
                additionalProperties: false,
              },
            },
          },
        },
      ],
    },
    execute: (args) => args as AgUiWidget,
  };
}
