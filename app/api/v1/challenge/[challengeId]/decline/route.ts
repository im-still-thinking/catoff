import { NextRequest, NextResponse } from "next/server";
import { signChallenge, verifyChallenge } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const challenge = verifyChallenge(token);

    if (challenge.status !== "created") {
      return NextResponse.json(
        {
          error: "Challenge cannot be declined in the current state",
        },
        { status: 400 }
      );
    }

    // Future ZK-SNARK integration point:
    // Generate proof that the decline operation is valid

    const declinedChallenge = {
      ...challenge,
      status: "declined" as const,
      expiresAt: new Date(),
    };

    const { exp, ...challengeWithoutExp } = declinedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    return NextResponse.json(
      {
        challenge: declinedChallenge,
        token: newToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error declining challenge:", error);
    return NextResponse.json(
      {
        error: "Failed to decline challenge",
      },
      { status: 500 }
    );
  }
}
