import { NextRequest, NextResponse } from "next/server";
import { signChallenge, verifyChallenge } from "@/lib/jwt";

export async function POST(
  req: NextRequest,
) {
  try {
    const { token, playerTag, deck, publicKey } = await req.json();

    const challenge = verifyChallenge(token);

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
        deck: deck
      },
      status: "accepted" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const { exp, ...challengeWithoutExp } = updatedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    console.log("updated challenge", updatedChallenge)
    console.log(" new token", newToken)

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
