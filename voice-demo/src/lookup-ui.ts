import {
  describeLanguage,
  getLanguages,
  getVoicesForLanguage,
  onVoicesChanged,
  pickDefaultLanguage,
} from './lookup';

export interface LookupUi {
  getLanguage: () => string;
  getVoice: () => SpeechSynthesisVoice | undefined;
}

// The selected language drives both dictation and reading. The voice list is
// filtered to voices that match the selected language.

export function initLookupUi(): LookupUi {
  const languageSelect = document.getElementById(
    'languages',
  ) as HTMLSelectElement;
  const voiceSelect = document.getElementById('voices') as HTMLSelectElement;

  function populateLanguages(): void {
    const previous = languageSelect.value;
    const languages = getLanguages();

    languageSelect.innerHTML = '';
    for (const language of languages) {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = describeLanguage(language);
      languageSelect.append(option);
    }

    languageSelect.value = previous || pickDefaultLanguage(languages);
    populateVoices();
  }

  function populateVoices(): void {
    const previous = voiceSelect.value;
    const voices = getVoicesForLanguage(languageSelect.value);

    voiceSelect.innerHTML = '';
    for (const voice of voices) {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = voice.default
        ? `${voice.name} – default`
        : voice.name;
      voiceSelect.append(option);
    }

    const stillAvailable = voices.some((voice) => {
      return voice.name === previous;
    });
    voiceSelect.value = stillAvailable ? previous : voices[0]?.name || '';
    voiceSelect.disabled = voices.length === 0;
  }

  populateLanguages();
  onVoicesChanged(populateLanguages);
  languageSelect.addEventListener('change', populateVoices);

  return {
    getLanguage: () => {
      return languageSelect.value;
    },
    getVoice: () => {
      return getVoicesForLanguage(languageSelect.value).find((candidate) => {
        return candidate.name === voiceSelect.value;
      });
    },
  };
}
