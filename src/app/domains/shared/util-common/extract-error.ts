export function extractError(error: unknown) {
  if (error && typeof error === 'object' && 'error' in error) {
    return error.error;
  }
  return error;
}
