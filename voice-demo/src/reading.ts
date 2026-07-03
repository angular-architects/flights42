export interface ReadOptions {
  text: string;
  language: string;
  voice?: SpeechSynthesisVoice;
  rate: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function readAloud(options: ReadOptions): void {
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(options.text);
  utterance.lang = options.language;

  if (options.voice) {
    utterance.voice = options.voice;
  }
  utterance.rate = options.rate;

  if (options.onStart) {
    utterance.addEventListener('start', options.onStart);
  }
  if (options.onEnd) {
    utterance.addEventListener('end', options.onEnd);
  }

  window.speechSynthesis.speak(utterance);
}

export function stopReading(): void {
  window.speechSynthesis.cancel();
}
