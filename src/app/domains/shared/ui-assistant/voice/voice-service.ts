import { computed, Injectable, signal } from '@angular/core';

import { stripMarkdown } from './strip-markdown';
import { byQuality, isNaturalVoice } from './voice-quality';

const SpeechRecognitionCtor =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;

const DEFAULT_LANGUAGE = 'en-US';
const SILENCE_MS = 1500;
const LANGUAGE_STORAGE_KEY = 'voice.language';

export interface DictationOptions {
  onText: (text: string) => void;
  onSilence?: () => void;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  readonly dictationSupported = Boolean(SpeechRecognitionCtor);
  readonly dictating = signal(false);
  readonly readingEnabled = signal(true);

  private readonly storedLanguage = this.loadStoredLanguage();
  readonly language = signal(this.storedLanguage ?? DEFAULT_LANGUAGE);

  private readonly voices = signal<SpeechSynthesisVoice[]>(this.loadVoices());
  private userPickedLanguage = this.storedLanguage !== null;
  private recognition: SpeechRecognition | undefined;
  private silenceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly spokenMessages = new Set<string>();

  private readonly languageNames = new Intl.DisplayNames([navigator.language], {
    type: 'language',
  });

  readonly languages = computed(() => {
    return [
      ...new Set(
        this.voices().map((voice) => {
          return voice.lang;
        }),
      ),
    ].sort();
  });

  constructor() {
    this.ensureLanguage();
    speechSynthesis.addEventListener('voiceschanged', () => {
      this.voices.set(this.loadVoices());
      this.ensureLanguage();
    });
  }

  setLanguage(language: string): void {
    this.userPickedLanguage = true;
    this.language.set(language);
    this.storeLanguage(language);
  }

  private loadStoredLanguage(): string | null {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private storeLanguage(language: string): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore storage errors (private mode / disabled storage)
    }
  }

  describeLanguage(language: string): string {
    return `${this.languageNames.of(language) ?? language} (${language})`;
  }

  startDictation(initialText: string, options: DictationOptions): void {
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = this.language();
    recognition.continuous = true;
    recognition.interimResults = true;

    let committed = initialText ? initialText.trimEnd() + ' ' : '';

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
      committed += final;
      options.onText(committed + interim);
      this.scheduleSilence(options.onSilence);
    });

    recognition.addEventListener('end', () => {
      if (this.dictating()) {
        recognition.start();
      }
    });

    recognition.addEventListener('error', () => {
      this.stopDictation();
    });

    recognition.start();
    this.recognition = recognition;
    this.dictating.set(true);
  }

  stopDictation(): void {
    this.dictating.set(false);
    clearTimeout(this.silenceTimer);
    this.silenceTimer = undefined;
    this.recognition?.stop();
    this.recognition = undefined;
  }

  // Treat a pause with no new speech as "done speaking".
  private scheduleSilence(onSilence: (() => void) | undefined): void {
    if (!onSilence) {
      return;
    }
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.dictating()) {
        onSilence();
      }
    }, SILENCE_MS);
  }

  toggleReading(): void {
    const next = !this.readingEnabled();
    this.readingEnabled.set(next);
    if (!next) {
      this.cancelReading();
    }
  }

  // Reads a message-widget's markdown aloud exactly once per widget instance,
  // keyed by its stable id so re-created widgets don't repeat.
  readMessage(widgetId: string | null, markdown: string): void {
    const key = widgetId ?? markdown.trim();
    if (!markdown.trim() || !this.readingEnabled()) {
      return;
    }
    if (this.spokenMessages.has(key)) {
      return;
    }
    this.spokenMessages.add(key);
    this.speak(stripMarkdown(markdown));
  }

  speak(text: string): void {
    const content = text.trim();
    if (!content || !this.readingEnabled()) {
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = this.language();
    const voice = this.pickVoice();
    if (voice) {
      utterance.voice = voice;
    }
    speechSynthesis.speak(utterance);
  }

  cancelReading(): void {
    speechSynthesis.cancel();
  }

  private loadVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices().filter(isNaturalVoice);
  }

  // Always the first proper voice for the selected language.
  private pickVoice(): SpeechSynthesisVoice | undefined {
    const language = this.language();
    const prefix = language.split('-')[0];
    return this.voices()
      .filter((voice) => {
        return voice.lang === language || voice.lang.startsWith(prefix);
      })
      .sort(byQuality)[0];
  }

  // Default to English; only snap to another language when English is missing
  // and the user has not chosen one yet.
  private ensureLanguage(): void {
    if (this.userPickedLanguage) {
      return;
    }
    const languages = this.languages();
    if (languages.length === 0 || languages.includes(this.language())) {
      return;
    }
    const english = languages.find((language) => {
      return language.startsWith('en');
    });
    this.language.set(english ?? languages[0]);
  }
}
