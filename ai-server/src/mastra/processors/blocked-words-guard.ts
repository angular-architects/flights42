import type { InputProcessor, ProcessInputArgs } from '@mastra/core/processors';

function loadBlockedWords(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(['competitor', 'lawsuit', 'sue']), 300);
  });
}

export const blockedWordsGuard: InputProcessor = {
  id: 'blocked-words-guard',
  async processInput({ messages, abort }: ProcessInputArgs) {
    const blockedWords = await loadBlockedWords();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const text = (lastUser?.content.parts ?? [])
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join(' ')
      .toLowerCase();
    for (const word of blockedWords) {
      if (text.includes(word)) {
        abort('This request contains a term we do not talk about here.');
      }
    }
    return messages;
  },
};
