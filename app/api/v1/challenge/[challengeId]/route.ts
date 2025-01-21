/* eslint-disable @typescript-eslint/no-explicit-any */

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

        console.log("challengeid", challengeId)

        const result = await challengeService.getChallenge({
            challengeId,
            type: "created"
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
