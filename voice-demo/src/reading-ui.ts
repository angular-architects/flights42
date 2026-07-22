import { readAloud, stopReading } from './reading';

export interface ReadingUiOptions {
  getLanguage: () => string;
  getVoice: () => SpeechSynthesisVoice | undefined;
  setStatus: (message: string) => void;
}

export function initReadingUi(options: ReadingUiOptions): void {
  const textArea = document.getElementById('text') as HTMLTextAreaElement;
  const speakBtn = document.getElementById('speak') as HTMLButtonElement;
  const stopBtn = document.getElementById('stop') as HTMLButtonElement;
  const rateInput = document.getElementById('rate') as HTMLInputElement;

  speakBtn.addEventListener('click', () => {
    const content = textArea.value.trim();
    if (!content) {
      options.setStatus('Nothing to read.');
      return;
    }

    readAloud({
      text: content,
      language: options.getLanguage(),
      voice: options.getVoice(),
      rate: Number(rateInput.value),
      onStart: () => {
        options.setStatus('Reading …');
      },
      onEnd: () => {
        options.setStatus('Done.');
      },
    });
  });

  stopBtn.addEventListener('click', () => {
    stopReading();
    options.setStatus('Playback stopped.');
  });
}
