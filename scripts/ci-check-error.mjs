export class CiCheckError extends Error {
  constructor(step, output) {
    super(`Check failed: ${step}\n\n${output}`);
    this.name = 'CiCheckError';
    this.step = step;
    this.output = output;
  }
}
