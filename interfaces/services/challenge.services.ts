/* eslint-disable @typescript-eslint/no-explicit-any */

import { signChallenge, verifyChallenge } from "@/lib/jwt";
import {
  PublicKey,
  sendAndConfirmTransaction,
  TransactionExpiredBlockheightExceededError,
} from "@solana/web3.js";
import Redis from "ioredis";
import { getSolanaConnection } from "@/lib/solana/connection";
import { SolanaEscrow } from "@/lib/solana/escrow";
import { NextRequest } from "next/server";
import { clashRoyaleAPIClient } from "@/adapters/xhr";

let oldToken: string;

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
        `${params.challengeId}`,
        "created",
        token,
      );

      return {
        challengeId: params.challengeId,
        token,
        escrowPubkey: params.escrowPubkey,
      };
    } catch (error) {
      await this.redisClient.hdel(
        `${params.challengeId}`,
        "created",
      );
      throw error;
    }
  }

  async getChallenge(params: {
    challengeId: string;
    type: string;
  }) {
    try {
      const token = await this.redisClient.hget(
        `${params.challengeId}`,
        `type`,
      );
      const challenge = verifyChallenge(token as string);

      return {
        challenge: challenge,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async acceptChallenge(params: {
    playerTag: string;
    deck: Card[];
    publicKey: string;
    challenge: Challenge;
  }) {
    try {
      const connection = getSolanaConnection("finalized");
      const escrow = await SolanaEscrow.getEscrowForChallenge(
        params.challenge.id,
        connection,
      );

      if (!escrow) {
        throw new Error("Escrow not found");
      }

      const updatedChallenge = {
        ...params.challenge,
        playerB: {
          tag: params.playerTag,
          wallet: params.publicKey,
          deck: params.deck,
        },
        status: "accepted" as const,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const { exp, ...challengeWithoutExp } = updatedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
      const newToken = signChallenge(challengeWithoutExp);

      const ttlSeconds = 24 * 60 * 60;

      oldToken = await this.redisClient.hget(
        `${params.challenge.id}`,
        "created",
      ) as string;
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "created",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "accepted",
        newToken,
      );
      await this.redisClient.expire(params.challenge.id, ttlSeconds);

      return {
        challenge: updatedChallenge,
        token: newToken,
        escrowPubkey: await escrow.getEscrowPubKey(),
      };
    } catch (error) {
      console.error(error);
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "accepted",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "created",
        oldToken,
      );
      throw error;
    }
  }

  async declineChallenge(params: {
    challenge: Challenge;
  }) {
    try {
      const connection = getSolanaConnection("finalized");
      const escrow = await SolanaEscrow.getEscrowForChallenge(
        params.challenge.id,
        connection,
      );
      if (!escrow) {
        throw new Error("Escrow not found");
      }

      const escrowAccount = await escrow.getEscrowAccount();
      const { transaction, closeAccount } = await escrow.withdrawFromEscrow(
        params.challenge.wagerAmount,
        new PublicKey(params.challenge.playerA.wallet),
      );

      try {
        await sendAndConfirmTransaction(
          connection,
          transaction,
          [escrowAccount],
          {
            skipPreflight: true,
            commitment: "confirmed",
          },
        );
      } catch (error) {
        const accountExists = await connection.getAccountInfo(
          escrowAccount.publicKey,
        );
        if (accountExists) {
          throw error;
        }
      }

      if (closeAccount) {
        await SolanaEscrow.cleanupEscrow(params.challenge.id);
      }

      const declinedChallenge = {
        ...params.challenge,
        status: "declined" as const,
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      };

      const { exp, ...challengeWithoutExp } = declinedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
      const newToken = signChallenge(challengeWithoutExp);

      const ttlSeconds = 10 * 365 * 24 * 60 * 60;

      oldToken = await this.redisClient.hget(
        `${params.challenge.id}`,
        "created",
      ) as string;
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "created",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "declined",
        newToken,
      );
      await this.redisClient.expire(params.challenge.id, ttlSeconds);

      return {
        challenge: declinedChallenge,
        token: newToken,
        escrowPubkey: await escrow.getEscrowPubKey(),
      };
    } catch (error) {
      console.error(error);
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "declined",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "created",
        oldToken,
      );
      throw error;
    }
  }

  async resolveChallenge(params: {
    token: string;
    resolverWallet: string;
    challenge: Challenge;
  }) {
    try {
      let winner;

      const compareCards = (
        playerACards: Record<string, any>[],
        playerBCards: Record<string, any>[],
        fields: string[],
      ) => {
        const compareFields = (
          playerACard: Record<string, any>,
          playerBCard: Record<string, any>,
        ) => {
          return fields.every((field) =>
            playerACard[field] === playerBCard[field]
          );
        };

        return playerACards.every((playerACard) =>
          playerBCards.some((playerBCard) =>
            compareFields(playerACard, playerBCard)
          ) &&
          playerBCards.every((playerBCard) =>
            playerACards.some((playerACard) =>
              compareFields(playerACard, playerBCard)
            )
          )
        );
      };

      const response = await clashRoyaleAPIClient.get(
        `/players/%23${
          encodeURIComponent(params.challenge.playerA.tag!)
        }/battlelog`,
      );

      const latestFriendlyBattle = response.data.find((battle: any) => {
        return battle.type === "friendly" &&
          battle.gameMode.name === "Friendly" &&
          battle.deckSelection === "collection" &&
          battle.team[0].tag.substring(1) === params.challenge.playerA.tag &&
          compareCards(
            battle.team[0].cards,
            params.challenge.playerA.deck,
            ["name", "id"],
          ) &&
          battle.opponent[0].tag.substring(1) ===
            params.challenge.playerB?.tag &&
          compareCards(
            battle.opponent[0].cards,
            params.challenge.playerB?.deck as Card[],
            ["name", "id"],
          );
      });

      if (!latestFriendlyBattle) {
        throw Error("No valid battle found");
      }

      if (
        latestFriendlyBattle.team[0].crowns <
          latestFriendlyBattle.opponent[0].crowns
      ) {
        winner = params.challenge.playerB?.wallet;
      } else if (
        latestFriendlyBattle.team[0].crowns >
          latestFriendlyBattle.opponent[0].crowns
      ) {
        winner = params.challenge.playerA.wallet;
      } else {
        throw Error("Battle Tied");
      }

      const connection = getSolanaConnection("confirmed");
      const escrow = await SolanaEscrow.getEscrowForChallenge(
        params.challenge.id,
        connection,
      );
      if (!escrow) {
        throw new Error("Escrow not found");
      }

      const escrowAccount = await escrow.getEscrowAccount();

      // First check if account exists
      const accountInfo = await connection.getAccountInfo(
        escrowAccount.publicKey,
      );
      if (!accountInfo) {
        throw new Error("Escrow Account not found");
      }

      const { transaction, closeAccount } = await escrow.withdrawFromEscrow(
        2 * params.challenge.wagerAmount,
        new PublicKey(params.challenge.playerA.wallet),
      );

      // Get fresh blockhash
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;

      let signature: string;

      try {
        signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [escrowAccount],
          {
            skipPreflight: false,
            maxRetries: 3,
            commitment: "confirmed",
          },
        );
        console.log("Transaction successful:", signature);
      } catch (txError: any) {
        if (txError instanceof TransactionExpiredBlockheightExceededError) {
          // If we get a block height exceeded error, check if the transaction was actually successful
          try {
            // Wait for a short time to allow the transaction to settle
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Check if escrow account still exists
            const postTxAccountInfo = await connection.getAccountInfo(
              escrowAccount.publicKey,
            );

            if (!postTxAccountInfo) {
              // Account doesn't exist anymore, which means the transaction was successful
              console.log("Transaction succeeded despite timeout error");
            } else {
              // Account still exists, transaction actually failed
              throw txError;
            }
          } catch (confirmError) {
            console.error("Error checking transaction status:", confirmError);
            throw txError;
          }
        } else {
          // For other errors, check if the account was modified
          const postTxAccountInfo = await connection.getAccountInfo(
            escrowAccount.publicKey,
          );
          if (postTxAccountInfo) {
            console.error("Transaction failed:", txError);
            throw txError;
          }
        }
      }

      if (closeAccount) {
        await SolanaEscrow.cleanupEscrow(params.challenge.id);
      }

      const resolvedChallenge = {
        ...params.challenge,
        status: "resolved" as const,
        winner: winner,
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      };

      const { exp, ...challengeWithoutExp } = resolvedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
      const newToken = signChallenge(challengeWithoutExp);

      const ttlSeconds = 10 * 365 * 24 * 60 * 60;

      oldToken = await this.redisClient.hget(
        `${params.challenge.id}`,
        "accepted",
      ) as string;
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "accepted",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "resolved",
        newToken,
      );
      await this.redisClient.expire(params.challenge.id, ttlSeconds);

      return {
        challenge: resolvedChallenge,
        token: newToken,
      };
    } catch (error) {
      console.error(error);
      await this.redisClient.hdel(
        `${params.challenge.id}`,
        "resolved",
      );
      await this.redisClient.hmset(
        `${params.challenge.id}`,
        "accepted",
        oldToken,
      );
      throw error;
    }
  }

  async validateChallengeCreationRequest(
    req: Request,
  ): Promise<ChallengeRequestValidation> {
    let body: any;

    try {
      body = await req.json();
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error("Invalid request body");
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
      throw new Error("Missing required fields");
    }

    if (typeof playerTag !== "string" || playerTag.trim().length === 0) {
      throw new Error("Invalid player tag format");
    }

    if (!Array.isArray(deck) || deck.length !== 8) {
      throw new Error("Invalid deck");
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
      throw new Error("Invalid card data");
    }

    if (typeof wagerAmount !== "number" || wagerAmount < 0) {
      throw new Error("Invalid wager amount");
    }

    try {
      new PublicKey(publicKey);
    } catch {
      throw new Error("Invalid public key format");
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

  async validateChallengeGetRequest(
    req: NextRequest,
  ): Promise<ChallengeGetValidation> {
    let challengeId: any;

    try {
      challengeId = await req.nextUrl.pathname.split("/")[4];
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error("Invalid request body");
    }

    if (
      !challengeId
    ) {
      throw new Error("Missing required fields");
    }

    if (typeof challengeId !== "string") {
      throw new Error("Challenge ID is invalid");
    }

    return {
      challengeId,
    };
  }

  async validateChallengeAcceptRequest(
    req: Request,
  ): Promise<ChallengeAcceptValidation> {
    let body: any;

    try {
      body = await req.json();
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error("Invalid request body");
    }

    const {
      playerTag,
      deck,
      publicKey,
      token,
    } = body;

    if (
      !playerTag || !deck || !publicKey || !token
    ) {
      throw new Error("Missing required fields");
    }

    if (typeof playerTag !== "string" || playerTag.trim().length === 0) {
      throw new Error("Invalid player tag format");
    }

    if (!Array.isArray(deck) || deck.length !== 8) {
      throw new Error("Invalid deck");
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
      throw new Error("Invalid card data");
    }

    try {
      new PublicKey(publicKey);
    } catch {
      throw new Error("Invalid public key format");
    }

    const challenge = verifyChallenge(token);

    const result = await this.redisClient.hget(`${challenge.id}`, "created");

    if (!result) {
      throw new Error("No active challenge is found");
    }

    if (result !== token) {
      throw new Error("The token is invalid");
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      throw new Error("Challenge has expired");
    }

    if (challenge.status !== "created") {
      throw new Error("Challenge has already been accepted");
    }

    if (challenge.playerA.tag === playerTag) {
      throw new Error("Player B cannot use the same tag as Player A");
    }

    if (challenge.playerA.wallet === publicKey) {
      throw new Error(
        "Player B cannot use the same wallet address as Player A",
      );
    }

    return {
      playerTag: playerTag.trim(),
      deck,
      publicKey,
      challenge,
    };
  }

  async validateChallengeDeclineRequest(
    req: Request,
  ): Promise<ChallengeDeclineValidation> {
    let body: any;

    try {
      body = await req.json();
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error("Invalid request body");
    }

    const {
      token,
    } = body;

    if (
      !token
    ) {
      throw new Error("Missing required fields");
    }

    const challenge = verifyChallenge(token);

    const result = await this.redisClient.hget(`${challenge.id}`, "created");

    if (!result) {
      throw new Error("No active challenge is found");
    }

    if (result !== token) {
      throw new Error("The token is invalid");
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      throw new Error("Challenge has expired");
    }

    if (challenge.status !== "created") {
      throw new Error("Challenge has already been accepted");
    }

    return {
      challenge,
    };
  }

  async validateChallengeResolveRequest(
    req: Request,
  ): Promise<ChallengeResolveValidation> {
    let body: any;

    try {
      body = await req.json();
    } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error("Invalid request body");
    }

    const {
      token,
      resolverWallet,
    } = body;

    if (
      !token || !resolverWallet
    ) {
      throw new Error("Missing required fields");
    }

    try {
      new PublicKey(resolverWallet);
    } catch {
      throw new Error("Invalid public key format");
    }

    const challenge = verifyChallenge(token);

    const result = await this.redisClient.hget(`${challenge.id}`, "accepted");

    if (!result) {
      throw new Error("No active challenge is found");
    }

    if (result !== token) {
      throw new Error("The token is invalid");
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      throw new Error("Challenge has expired");
    }

    if (challenge.status !== "accepted") {
      throw new Error("Challenge has not been excited");
    }

    if (resolverWallet !== challenge.playerA.wallet) {
      throw new Error("Only the challenger can resolve this challenge");
    }

    return {
      token,
      resolverWallet,
      challenge,
    };
  }
}
