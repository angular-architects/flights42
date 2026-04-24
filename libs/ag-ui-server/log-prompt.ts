const DEBUG_FLAG = 'DEBUG_SYSTEM_PROMPT';

function isEnabled(): boolean {
  const value = process.env[DEBUG_FLAG];
  return value === '1' || value === 'true';
}

export function logSystemPromptIfEnabled(label: string, prompt: string): void {
  if (!isEnabled()) {
    return;
  }

  console.log(`\n===== SYSTEM PROMPT [${label}] =====\n`);
  console.log(prompt);
  console.log(`\n===== END SYSTEM PROMPT [${label}] =====\n`);
}
