/* eslint-disable @typescript-eslint/no-explicit-any */
export const maxDuration = 60;

import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { ChallengeService } from "@/interfaces/services/challenge.services";

export async function POST(req: NextRequest) {
  const challengeService = new ChallengeService(redisClient);

  try {
    const {
      challenge,
    } = await challengeService.validateChallengeDeclineRequest(
      req,
    );

    const result = await challengeService.declineChallenge({
      challenge,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: "CHALLENGE_DECLINE_FAILED",
        message: error.message,
      },
    }, { status: 500 });
  }
}
