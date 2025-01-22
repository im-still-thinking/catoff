/* eslint-disable @typescript-eslint/no-explicit-any */

import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { ChallengeService } from "@/interfaces/services/challenge.services";

export async function POST(
  req: NextRequest,
) {
  const challengeService = new ChallengeService(redisClient);

  try {
    const {
      playerTag,
      deck,
      publicKey,
      challenge,
    } = await challengeService.validateChallengeAcceptRequest(
      req,
    );

    const result = await challengeService.acceptChallenge({
      playerTag,
      deck,
      publicKey,
      challenge,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: "CHALLENGE_ACCEPTANCE_FAILED",
        message: error.message,
      },
    }, { status: 500 });
  }
}
