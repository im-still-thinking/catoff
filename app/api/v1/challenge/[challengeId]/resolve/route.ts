import { NextRequest, NextResponse } from 'next/server';
import { verifyChallenge, signChallenge } from '@/lib/jwt';
// import { localAPIClient } from '@/adapters/xhr';

export async function POST(
  req: NextRequest
) {

  try {
    const { token } = await req.json();
    const challenge = verifyChallenge(token);

    if (challenge.status !== 'accepted') {
      return NextResponse.json(
        {
          error: "Challenge is not in accepted state",
        },
        { status: 400 },
      );
    }

    // Here you would:
    // 1. Fetch battle results from Clash Royale API
    // 2. Determine winner
    // 3. Call smart contract to distribute funds

    // For prototype, let's just randomly pick a winner
    const winner = Math.random() > 0.5 ? challenge.playerA.wallet : challenge.playerB?.wallet;

    const resolvedChallenge = {
      ...challenge,
      status: 'resolved' as const,
      winner,
      expiresAt: new Date()
    };

    const { exp, ...challengeWithoutExp } = resolvedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    return NextResponse.json(
      {
        challenge: resolvedChallenge,
        token: newToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error resolving challenge:', error);
    return NextResponse.json(
      {
        error: "Failed to resolve challenge",
      },
      { status: 500 },
    );
  }
}