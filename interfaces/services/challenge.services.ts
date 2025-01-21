/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChallengeValidationError } from "@/domain/errors/challenge.errors";
import { signChallenge } from "@/lib/jwt";
import { PublicKey } from "@solana/web3.js";
import Redis from "ioredis";

export class ChallengeService {
  private redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  async createChallenge(params: {
    playerTag: string;
    deck: Card[];
    wagerAmount: number;
    publicKey: string;
    challengeId: string;
    escrowPubkey: string;
  }) {
    try {
      const challenge: Challenge = {
        id: params.challengeId,
        playerA: {
          tag: params.playerTag,
          wallet: params.publicKey,
          deck: params.deck,
        },
        wagerAmount: params.wagerAmount,
        status: "created",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        escrowPubkey: params.escrowPubkey,
      };

      const token = signChallenge(challenge);
      await this.redisClient.hmset(
        params.challengeId,
        { "challengeToken": token },
      );

      return {
        challengeId: params.challengeId,
        token,
        escrowPubkey: params.escrowPubkey,
      };
    } catch (error) {
      await this.redisClient.hdel(params.challengeId, "challengeToken");
      throw error;
    }
  }

  // async getChallenge()

  async validateRequest(req: Request): Promise<ChallengeRequestValidation> {
    let body: any;

    try {
      body = await req.json();
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new ChallengeValidationError("Invalid request body");
    }

    const {
      challengeId,
      playerTag,
      deck,
      wagerAmount,
      publicKey,
      escrowPubkey,
    } = body;

    if (
      !playerTag || !deck || wagerAmount === undefined || !publicKey ||
      !challengeId || !escrowPubkey
    ) {
      throw new ChallengeValidationError("Missing required fields", {
        received: { playerTag, deck, wagerAmount, publicKey },
      });
    }

    if (typeof playerTag !== "string" || playerTag.trim().length === 0) {
      throw new ChallengeValidationError("Invalid player tag format");
    }

    if (!Array.isArray(deck) || deck.length !== 8) {
      throw new ChallengeValidationError("Invalid deck", {
        details: "Deck must contain exactly 8 cards",
      });
    }

    const isValidCard = (card: any): card is Card => {
      return (
        card.id &&
        card.name &&
        card.iconUrls?.medium &&
        typeof card.level === "number" &&
        typeof card.maxLevel === "number" &&
        typeof card.elixirCost === "number" &&
        typeof card.count === "number"
      );
    };

    if (!deck.every(isValidCard)) {
      throw new ChallengeValidationError("Invalid card data", {
        details: "One or more cards are missing required properties",
      });
    }

    if (typeof wagerAmount !== "number" || wagerAmount < 0) {
      throw new ChallengeValidationError("Invalid wager amount", {
        details: "Wager amount must be a positive number",
      });
    }

    try {
      new PublicKey(publicKey);
    } catch {
      throw new ChallengeValidationError("Invalid public key format");
    }

    return {
      challengeId,
      playerTag: playerTag.trim(),
      deck,
      wagerAmount,
      publicKey,
      escrowPubkey,
    };
  }
}
