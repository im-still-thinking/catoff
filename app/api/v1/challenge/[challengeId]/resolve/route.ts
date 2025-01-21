/* eslint-disable @typescript-eslint/no-explicit-any */

import { signChallenge, verifyChallenge } from "@/lib/jwt";

import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { SolanaEscrow } from "@/lib/solana/escrow";
import {
  PublicKey,
  sendAndConfirmTransaction,
  TransactionExpiredBlockheightExceededError,
} from "@solana/web3.js";
import { getSolanaConnection } from "@/lib/solana/connection";
import { clashRoyaleAPIClient } from "@/adapters/xhr";

const compareCards = (
  playerACards: Record<string, any>[],
  playerBCards: Record<string, any>[],
  fields: string[],
) => {
  const compareFields = (
    playerACard: Record<string, any>,
    playerBCard: Record<string, any>,
  ) => {
    return fields.every((field) => playerACard[field] === playerBCard[field]);
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

let challenge: any;

export async function POST(req: NextRequest) {
  try {
    let winner;
    const { token, resolverWallet } = await req.json();
    challenge = verifyChallenge(token);

    // Basic validation
    const result = await redisClient.hget(`${challenge.id}`, "accepted");
    if (!result || result !== token || challenge.status !== "accepted") {
      return NextResponse.json(
        { error: "Invalid challenge state" },
        { status: 400 },
      );
    }

    // Validate that the resolver is player A
    if (resolverWallet !== challenge.playerA.wallet) {
      return NextResponse.json(
        { error: "Only the challenger can resolve this challenge" },
        { status: 403 },
      );
    }

    const response = await clashRoyaleAPIClient.get(
      `/players/%23${encodeURIComponent(challenge.playerA.tag!)}/battlelog`,
    );

    const latestFriendlyBattle = response.data.find((battle: any) => {

      return battle.type === "friendly" &&
        battle.gameMode.name === "Friendly" &&
        battle.deckSelection === "collection" &&
        battle.team[0].tag.substring(1) === challenge.playerA.tag &&
        compareCards(
          battle.team[0].cards,
          challenge.playerA.deck,
          ["name", "id"],
        ) &&
        battle.opponent[0].tag.substring(1) === challenge.playerB?.tag &&
        compareCards(
          battle.opponent[0].cards,
          challenge.playerB?.deck as Card[],
          ["name", "id"],
        );
    });

    if (!latestFriendlyBattle) {
      return NextResponse.json(
        {
          error: "No valid battle found",
        },
        { status: 404 },
      );
    }

    if (
      latestFriendlyBattle.team[0].crowns <
        latestFriendlyBattle.opponent[0].crowns
    ) {
      winner = challenge.playerB?.wallet;
    } else if (
      latestFriendlyBattle.team[0].crowns >
        latestFriendlyBattle.opponent[0].crowns
    ) {
      winner = challenge.playerA.wallet;
    } else {
      return NextResponse.json(
        {
          error: "Battle Tied",
        },
        { status: 500 },
      );
    }

    // Rest of the existing code remains the same...
    const connection = getSolanaConnection("confirmed");
    const escrow = await SolanaEscrow.getEscrowForChallenge(
      challenge.id,
      connection,
    );
    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    const escrowAccount = await escrow.getEscrowAccount();

    // First check if account exists
    const accountInfo = await connection.getAccountInfo(
      escrowAccount.publicKey,
    );
    if (!accountInfo) {
      return NextResponse.json(
        { error: "Escrow account not found" },
        { status: 404 },
      );
    }

    const { transaction, closeAccount } = await escrow.withdrawFromEscrow(
      2 * challenge.wagerAmount,
      new PublicKey(challenge.playerA.wallet),
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
      await SolanaEscrow.cleanupEscrow(challenge.id);
    }

    const resolvedChallenge = {
      ...challenge,
      status: "resolved" as const,
      winner: winner,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { exp, ...challengeWithoutExp } = resolvedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    await redisClient.hmset(
      `${challenge.id}`,
      "resolved",
      newToken,
    );
    await redisClient.expire(challenge.id, 24 * 60 * 60);

    return NextResponse.json({
      challenge: resolvedChallenge,
      token: newToken,
    });
  } catch (error) {
    console.error("Error resolving challenge:", error);
    await redisClient.hdel(`${challenge.id}`, "resolved");
    return NextResponse.json(
      { error: "Failed to resolve challenge" },
      { status: 500 },
    );
  }
}
