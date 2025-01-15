import { IChallengeRepository } from '@/domain/repositories/challenge.repository';
import { ChallengeError } from '@/domain/errors/challenge.errors';

export class DeleteChallengeUseCase {
    constructor(private challengeRepository: IChallengeRepository) {}
  
    async execute(challengeId: string): Promise<ChallengeDTO> {
      try {
        const deletdChallenge = await this.challengeRepository.delete(
          challengeId
        );
        return deletdChallenge.toJSON();
      } catch (error) {
        if (error instanceof ChallengeError) {
          throw error;
        }
        throw new Error(`Failed to delete blog ${challengeId}`);
      }
    }
  }