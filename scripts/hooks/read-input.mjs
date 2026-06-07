import process from 'node:process';

export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) {
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return {};
  }
}
