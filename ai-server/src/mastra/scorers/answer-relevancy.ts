import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

import { model } from '../config.js';

/**
 * LLM-as-a-judge scorer that rates how well the ticketing agent's answer
 * addresses the user's question. It does not change the agent's behavior; the
 * score and reason show up in Mastra Studio's observability traces.
 *
 * The ticketing agent answers via the `showComponents` tool, so the actual
 * answer text lives inside the (serialized) tool-call arguments. We therefore
 * hand the judge the full JSON of both sides and let it locate the answer.
 */
export const answerRelevancyScorer = createScorer({
  id: 'answer-relevancy',
  name: 'Answer Relevancy',
  description:
    "Judges how well the agent's answer addresses the user's request.",
  type: 'agent',
  judge: {
    model,
    instructions: [
      'You are a strict evaluator for a flight ticketing assistant.',
      'The assistant answers by calling the "showComponents" tool; its',
      'natural-language reply is inside a "messageWidget" component\'s "text" prop.',
      'Judge how relevant and helpful the answer is for the user request.',
    ].join('\n'),
  },
})
  .analyze({
    description: 'Assess how well the answer matches the user request.',
    outputSchema: z.object({
      relevant: z
        .boolean()
        .describe('Whether the answer addresses the user request.'),
      relevancyScore: z
        .number()
        .min(0)
        .max(1)
        .describe('How relevant the answer is, from 0 (off) to 1 (perfect).'),
      explanation: z.string().describe('Short justification for the score.'),
    }),
    createPrompt: ({ run }) => `
Evaluate the relevancy of the assistant's answer.

User request (messages):
${JSON.stringify(run.input?.inputMessages ?? [], null, 2)}

Assistant response (messages, answer is inside showComponents -> messageWidget.text):
${JSON.stringify(run.output ?? [], null, 2)}

Return relevant (boolean), relevancyScore (0-1) and a short explanation.
`,
  })
  .generateScore(({ results }) => results.analyzeStepResult.relevancyScore)
  .generateReason(({ results, score }) => {
    const { relevant, explanation } = results.analyzeStepResult;
    return `Score: ${score} (${relevant ? 'relevant' : 'not relevant'}). ${explanation}`;
  });
