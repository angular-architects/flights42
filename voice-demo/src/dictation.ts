const SpeechRecognitionCtor =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;

export const dictationSupported = Boolean(SpeechRecognitionCtor);

export interface DictationHandlers {
  onText: (text: string) => void;
  onError: (message: string) => void;
}

export class Dictation {
  private recognition: SpeechRecognition | undefined;
  private running = false;
  private committedText = '';

  constructor(private readonly handlers: DictationHandlers) {}

  get active(): boolean {
    return this.running;
  }

  start(language: string, initialText: string): void {
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    this.committedText = initialText ? initialText.trimEnd() + ' ' : '';

    recognition.addEventListener('result', (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      this.committedText += final;
      this.handlers.onText(this.committedText + interim);
    });

    recognition.addEventListener('error', (event) => {
      this.handlers.onError(event.error);
    });

    recognition.addEventListener('end', () => {
      if (this.running) {
        recognition.start();
      }
    });

    recognition.start();
    this.recognition = recognition;
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.recognition?.stop();
    this.recognition = undefined;
  }
}
