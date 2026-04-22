import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  type BuiltComponent,
  defineServerWidget,
} from '../../../../libs/ag-ui-server/index.js';

const questionSchema = z.object({
  id: z
    .string()
    .describe(
      'Stable short identifier for the question (e.g. "from", "to", "date"). Used as the key under which the answer is returned.',
    ),
  question: z.string().describe('Question text shown to the user as label.'),
});

export const questionWidget = defineServerWidget({
  name: 'questionWidget',
  description: [
    'Renders a form with one text field per question.',
    'Each question has a stable `id` (used as the answer key) and a `question` text shown as label.',
    'When the user submits, a `submitAnswer` action is triggered. The user message that follows will be a JSON object with `{"type":"a2ui_form_response", "context": { "questions": { <id>: { id, question, answer } } } }`.',
    'Use this widget to collect missing information from the user before continuing (e.g. departure/destination city before calling findFlights).',
  ].join('\n'),
  schema: z.object({
    questions: z
      .array(questionSchema)
      .min(1)
      .describe('List of questions to ask the user.'),
  }),
  build: ({ questions }): BuiltComponent => {
    const instanceId = randomUUID().slice(0, 8);
    const prefix = `question-${instanceId}`;
    const cardId = `${prefix}-card`;
    const columnId = `${prefix}-column`;
    const dataPath = `/forms/${instanceId}`;

    const columnChildren: string[] = [];
    const components: BuiltComponent['components'] = [];

    for (const question of questions) {
      const fieldId = `${prefix}-field-${question.id}`;
      columnChildren.push(fieldId);

      components.push({
        id: fieldId,
        component: 'TextField',
        value: { path: `${dataPath}/questions/${question.id}/answer` },
        label: { path: `${dataPath}/questions/${question.id}/question` },
      });
    }

    const submitBtnId = `${prefix}-submit-btn`;
    const submitLabelId = `${prefix}-submit-label`;
    columnChildren.push(submitBtnId);

    components.push({
      id: submitLabelId,
      component: 'Text',
      text: { path: `${dataPath}/submitLabel` },
      variant: 'body',
    });
    components.push({
      id: submitBtnId,
      component: 'Button',
      child: submitLabelId,
      action: {
        event: {
          name: 'submitAnswer',
          context: {
            questions: { path: `${dataPath}/questions` },
          },
        },
      },
    });

    return {
      rootId: cardId,
      components: [
        {
          id: cardId,
          component: 'Card',
          child: columnId,
        },
        {
          id: columnId,
          component: 'Column',
          children: columnChildren,
        },
        ...components,
      ],
      dataModelUpdate: {
        path: dataPath,
        value: {
          submitLabel: 'Submit',
          questions: Object.fromEntries(
            questions.map((question) => [
              question.id,
              {
                id: question.id,
                question: question.question,
                answer: '',
              },
            ]),
          ),
        },
      },
    };
  },
});
