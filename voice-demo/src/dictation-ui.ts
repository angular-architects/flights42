import { Dictation, dictationSupported } from './dictation';

export interface DictationUiOptions {
  getLanguage: () => string;
  setStatus: (message: string) => void;
}

export function initDictationUi(options: DictationUiOptions): void {
  const textArea = document.getElementById('text') as HTMLTextAreaElement;
  const dictateBtn = document.getElementById('dictate') as HTMLButtonElement;

  const dictation = new Dictation({
    onText: (text) => {
      textArea.value = text;
    },
    onError: (message) => {
      options.setStatus(`Speech recognition error: ${message}`);
    },
  });

  if (!dictationSupported) {
    dictateBtn.disabled = true;
    options.setStatus('Speech recognition is not supported by this browser.');
  }

  dictateBtn.addEventListener('click', () => {
    if (dictation.active) {
      dictation.stop();
      dictateBtn.setAttribute('aria-pressed', 'false');
      dictateBtn.textContent = '🎙️ Start dictation';
      options.setStatus('Dictation stopped.');
    } else {
      const language = options.getLanguage();
      dictation.start(language, textArea.value);
      dictateBtn.setAttribute('aria-pressed', 'true');
      dictateBtn.textContent = '🎙️ Stop dictation';
      options.setStatus(`Listening in ${language} – speak now …`);
    }
  });
}
