/* eslint-disable @typescript-eslint/no-explicit-any */

import { signChallenge, verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { SolanaEscrow } from "@/lib/solana/escrow";
import { getSolanaConnection } from "@/lib/solana/connection";

const getAsync = promisify(redisClient.hget).bind(redisClient);

let challenge: any

export async function POST(
  req: NextRequest,
) {
  try {
    const { token, playerTag, deck, publicKey } = await req.json();

    challenge = verifyChallenge(token);

    const result = await getAsync(`${challenge.id}:challengeToken`, "created");

    if (!result) {
      return NextResponse.json(
        {
          error: "No active challenge is found",
        },
        { status: 404 },
      );
    }

    if (result !== token) {
      return NextResponse.json(
        {
          error: "Invalid Token",
        },
        { status: 403 },
      );
    }

    if (new Date() > new Date(challenge.expiresAt)) {
      return NextResponse.json(
        {
          error: "Challenge has expired",
        },
        { status: 400 },
      );
    }

    if (challenge.status !== "created") {
      return NextResponse.json(
        {
          error: "Challenge has already been accepted",
        },
        { status: 400 },
      );
    }

    if (challenge.playerA.tag === playerTag) {
      return NextResponse.json(
        {
          error: "Player B cannot use the same tag as Player A",
        },
        { status: 400 },
      );
    }

    if (challenge.playerA.wallet === publicKey) {
      return NextResponse.json(
        {
          error: "Player B cannot use the same wallet address as Player A",
        },
        { status: 400 },
      );
    }

    const connection = getSolanaConnection("finalized");
    const escrow = await SolanaEscrow.getEscrowForChallenge(
      challenge.id,
      connection,
    );

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow not found" },
        { status: 404 },
      );
    }

    const updatedChallenge = {
      ...challenge,
      playerB: {
        tag: playerTag,
        wallet: publicKey,
        deck: deck,
      },
      status: "accepted" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { exp, ...challengeWithoutExp } = updatedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    const ttlSeconds = 24 * 60 * 60;

    await redisClient.hmset(`${challenge.id}:challengeToken`, "accepted", newToken);
    await redisClient.expire(challenge.id, ttlSeconds);

    return NextResponse.json(
      {
        challenge: updatedChallenge,
        token: newToken,
        escrowPubkey: await escrow.getEscrowPubKey(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error accepting challenge:", error);
    await redisClient.hdel(`${challenge.id}:challengeToken`, "accepted");
    return NextResponse.json(
      {
        error: "Failed to accept challenge",
      },
      { status: 500 },
    );
  }
}