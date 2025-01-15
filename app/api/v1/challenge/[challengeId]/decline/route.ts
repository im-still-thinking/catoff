import { NextRequest, NextResponse } from "next/server";
import { signChallenge, verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/db";
import { promisify } from "util";

const getAsync = promisify(redisClient.get).bind(redisClient);

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const challenge = verifyChallenge(token);

    const result = await getAsync(challenge.id);

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

    if (challenge.status !== "created") {
      return NextResponse.json(
        {
          error: "Challenge cannot be declined in the current state",
        },
        { status: 400 },
      );
    }

    // Future ZK-SNARK integration point:
    // Generate proof that the decline operation is valid

    const declinedChallenge = {
      ...challenge,
      status: "declined" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { exp, ...challengeWithoutExp } = declinedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    const ttlSeconds = 24 * 60 * 60;

    await redisClient.set(challenge.id, newToken, 'EX', ttlSeconds);

    return NextResponse.json(
      {
        challenge: declinedChallenge,
        token: newToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error declining challenge:", error);
    return NextResponse.json(
      {
        error: "Failed to decline challenge",
      },
      { status: 500 },
    );
  }
}
