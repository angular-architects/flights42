import { initDictationUi } from './dictation-ui';
import { initLookupUi } from './lookup-ui';
import { initReadingUi } from './reading-ui';

const statusLine = document.getElementById('status') as HTMLParagraphElement;

function setStatus(message: string): void {
  statusLine.textContent = message;
}

const lookup = initLookupUi();

initDictationUi({
  getLanguage: lookup.getLanguage,
  setStatus,
});

initReadingUi({
  getLanguage: lookup.getLanguage,
  getVoice: lookup.getVoice,
  setStatus,
});
