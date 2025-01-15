import { NextRequest, NextResponse } from "next/server";
import { signChallenge, verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/db";
import { promisify } from "util";

const getAsync = promisify(redisClient.get).bind(redisClient);

export async function POST(
  req: NextRequest,
) {
  try {
    const { token, playerTag, deck, publicKey } = await req.json();

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

    await redisClient.set(challenge.id, newToken, 'EX', ttlSeconds);

    return NextResponse.json(
      {
        challenge: updatedChallenge,
        token: newToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error accepting challenge:", error);
    return NextResponse.json(
      {
        error: "Failed to accept challenge",
      },
      { status: 500 },
    );
  }
}
