// macOS / Chrome ship a set of "novelty" voices (robotic, whispering, singing …)
// that sound spooky for normal reading. We hide them and rank the natural /
// online voices first.

const NOVELTY_VOICES = new Set([
  'Albert',
  'Bad News',
  'Bahh',
  'Bells',
  'Boing',
  'Bubbles',
  'Cellos',
  'Deranged',
  'Good News',
  'Hysterical',
  'Jester',
  'Junior',
  'Organ',
  'Pipe Organ',
  'Princess',
  'Ralph',
  'Superstar',
  'Trinoids',
  'Whisper',
  'Wobble',
  'Zarvox',
]);

const NATURAL_HINT = /google|natural|neural|premium|enhanced|siri/i;

function baseName(voice: SpeechSynthesisVoice): string {
  return voice.name.split('(')[0].trim();
}

export function isNaturalVoice(voice: SpeechSynthesisVoice): boolean {
  return !NOVELTY_VOICES.has(baseName(voice));
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (NATURAL_HINT.test(voice.name)) {
    score += 2;
  }
  if (!voice.localService) {
    score += 1;
  }
  return score;
}

export function byQuality(
  a: SpeechSynthesisVoice,
  b: SpeechSynthesisVoice,
): number {
  return voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name);
}
