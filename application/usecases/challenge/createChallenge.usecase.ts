import { IChallengeRepository } from "@/domain/repositories/challenge.repository";
import { Challenge } from "@/domain/entities/challenge.entity";
import { ChallengeError } from "@/domain/errors/challenge.errors";

export class CreateChallengeUseCase {
    constructor(private challengeRepository: IChallengeRepository) {}

    async execute(challenge: CreateChallengeDTO): Promise<ChallengeDTO> {
        try {
            const tempChallengeObject = Challenge.create({
                playerA: challenge.playerA,
                playerB: challenge.playerB,
                wagerAmount: challenge.wagerAmount,
                status: challenge.status,
                winner: challenge.winner,
                proofData: challenge.proofData,
            });

            const createdChallenge = await this.challengeRepository.create(
                tempChallengeObject,
            );

            return createdChallenge.toJSON();
        } catch (error) {
            if (error instanceof ChallengeError) {
                throw error;
            }
            throw new Error("Failed to Create Challenge");
        }
    }
}
