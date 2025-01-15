export class ChallengeError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ChallengeError';
    }
}