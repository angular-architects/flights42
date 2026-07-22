import { byQuality, isNaturalVoice } from './voice-quality';

const languageNames = new Intl.DisplayNames([navigator.language], {
  type: 'language',
});

export function getVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices().filter(isNaturalVoice);
}

export function getLanguages(): string[] {
  return [
    ...new Set(
      getVoices().map((voice) => {
        return voice.lang;
      }),
    ),
  ].sort();
}

export function getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
  return getVoices()
    .filter((voice) => {
      return voice.lang === language;
    })
    .sort(byQuality);
}

export function describeLanguage(language: string): string {
  return `${languageNames.of(language) ?? language} (${language})`;
}

export function pickDefaultLanguage(languages: string[]): string {
  const exact = languages.find((language) => {
    return language === navigator.language;
  });
  const samePrefix = languages.find((language) => {
    return language.startsWith(navigator.language.split('-')[0]);
  });
  return exact || samePrefix || languages[0] || '';
}

export function onVoicesChanged(handler: () => void): void {
  speechSynthesis.addEventListener('voiceschanged', handler);
}
