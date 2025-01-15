import { IChallengeRepository } from "@/domain/repositories/challenge.repository";
import { ChallengeError } from "@/domain/errors/challenge.errors";

export class GetChallengesUseCase {
    constructor(private challengeRepository: IChallengeRepository) {}

    async execute(challengeId?: string): Promise<ChallengeDTO[]> {
        try {
            const retrievedChallenges = await this.challengeRepository.get(
                challengeId,
            );
            return retrievedChallenges.map((retrievedChallenge) =>
                retrievedChallenge.toJSON()
            );
        } catch (error) {
            if (error instanceof ChallengeError) {
                throw error;
            }
            throw new Error("Failed to Fetch Challenges");
        }
    }
}
