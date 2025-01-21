/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";
import { ChallengeService } from "@/interfaces/services/challenge.services";
import { ChallengeValidationError } from "@/domain/errors/challenge.errors";

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
    } = await challengeService.validateRequest(
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
    if (error instanceof ChallengeValidationError) {
      return NextResponse.json({
        error: {
          code: error.code,
          message: error.message,
        },
      }, { status: error.details.status });
    }

    return NextResponse.json({
      error: {
        code: "CHALLENGE_CREATION_FAILED",
        message: error.message,
      },
    }, { status: 500 });
  }
}
