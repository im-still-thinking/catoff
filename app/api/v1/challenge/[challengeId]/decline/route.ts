/* eslint-disable @typescript-eslint/no-explicit-any */

import { signChallenge, verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { SolanaEscrow } from "@/lib/solana/escrow";
import { PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { getSolanaConnection } from "@/lib/solana/connection";


let challenge: any

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    challenge = verifyChallenge(token);

    // Basic validation
    const result = await redisClient.hget(`${challenge.id}`, "created");
    if (!result || result !== token || challenge.status !== "created") {
      return NextResponse.json(
        { error: "Invalid challenge state" },
        { status: 400 }
      );
    }

    // Get escrow
    const connection = getSolanaConnection("finalized");
    const escrow = await SolanaEscrow.getEscrowForChallenge(challenge.id, connection);
    if (!escrow) {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    }

    // Check balance and withdraw
    const escrowAccount = await escrow.getEscrowAccount();
    const { transaction, closeAccount } = await escrow.withdrawFromEscrow(
      challenge.wagerAmount,
      new PublicKey(challenge.playerA.wallet)
    );

    try {
      // Attempt the transaction
      await sendAndConfirmTransaction(connection, transaction, [escrowAccount], {
        skipPreflight: true,
        commitment: "confirmed"
      });
    } catch (error) {
      // If transaction failed but account is gone, it means it actually succeeded
      const accountExists = await connection.getAccountInfo(escrowAccount.publicKey);
      if (accountExists) {
        throw error; // Real error, rethrow
      }
      // Otherwise continue - transaction succeeded despite the error
    }

    // Clean up and update status
    if (closeAccount) {
      await SolanaEscrow.cleanupEscrow(challenge.id);
    }

    // Update challenge status
    const declinedChallenge = {
      ...challenge,
      status: "declined" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { exp, ...challengeWithoutExp } = declinedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    await redisClient.hmset(`${challenge.id}`, "declined", newToken);
    await redisClient.expire(challenge.id, 24 * 60 * 60);

    return NextResponse.json({
      challenge: declinedChallenge,
      token: newToken
    });

  } catch (error) {
    console.error("Error declining challenge:", error);
    await redisClient.hdel(`${challenge.id}`, "declined");
    return NextResponse.json(
      { error: "Failed to decline challenge" },
      { status: 500 }
    );
  }
}