/* eslint-disable @typescript-eslint/no-explicit-any */

export const maxDuration = 60;
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { ChallengeService } from "@/interfaces/services/challenge.services";

export async function GET(
  req: NextRequest,
) {
  const challengeService = new ChallengeService(redisClient);

  try {
    const {
      challengeId,
    } = await challengeService.validateChallengeGetRequest(
      req,
    );

    const result = await challengeService.getChallenge({
      challengeId,
      type: "accepted",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: {
        code: "CHALLENGE_GET_FAILED",
        message: error.message,
      },
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const challengeService = new ChallengeService(redisClient);

  try {
    const {
      token,
      resolverWallet,
      challenge,
    } = await challengeService.validateChallengeResolveRequest(
      req,
    );

    const result = await challengeService.resolveChallenge({
      token,
      resolverWallet,
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
