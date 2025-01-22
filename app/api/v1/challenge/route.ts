/* eslint-disable @typescript-eslint/no-explicit-any */
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";
import { ChallengeService } from "@/interfaces/services/challenge.services";

export async function POST(req: NextRequest) {
  const challengeService = new ChallengeService(redisClient);

  try {
    const {
      challengeId,
      playerTag,
      deck,
      wagerAmount,
      publicKey,
      escrowPubkey,
    } = await challengeService.validateChallengeCreationRequest(
      req,
    );

    const result = await challengeService.createChallenge({
      challengeId,
      playerTag,
      deck,
      wagerAmount,
      publicKey,
      escrowPubkey,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: "CHALLENGE_CREATION_FAILED",
        message: error.message,
      },
    }, { status: 500 });
  }
}
