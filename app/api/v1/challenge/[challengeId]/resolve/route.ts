/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { signChallenge, verifyChallenge } from "@/lib/jwt";
// import { clashRoyaleAPIClient } from "@/adapters/xhr";
import { redisClient } from "@/lib/db";
import { promisify } from "util";

const getAsync = promisify(redisClient.get).bind(redisClient);

// const compareCards = (
//   playerACards: Record<string, any>[],
//   playerBCards: Record<string, any>[],
//   fields: string[],
// ) => {
//   const compareFields = (
//     playerACard: Record<string, any>,
//     playerBCard: Record<string, any>,
//   ) => {
//     return fields.every((field) => playerACard[field] === playerBCard[field]);
//   };

//   return playerACards.every((playerACard) =>
//     playerBCards.some((playerBCard) =>
//       compareFields(playerACard, playerBCard)
//     ) &&
//     playerBCards.every((playerBCard) =>
//       playerACards.some((playerACard) =>
//         compareFields(playerACard, playerBCard)
//       )
//     )
//   );
// };


export async function POST(
  req: NextRequest,
) {
  try {
    // let winner
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

    if (challenge.status !== "accepted") {
      return NextResponse.json(
        {
          error: "Challenge is not in accepted state",
        },
        { status: 400 },
      );
    }

    // const response = await clashRoyaleAPIClient.get(
    //   `/players/%23${encodeURIComponent(challenge.playerA.tag!)}/battlelog`,
    // );

    // const latestFriendlyBattle = response.data.find((battle: any) => {
    //   return battle.type === "friendly" &&
    //     battle.gameMode.name === "Friendly" &&
    //     battle.deckSelection === "collection" &&
    //     battle.team[0].tag === challenge.playerA.tag &&
    //     compareCards(
    //       battle.team[0].cards,
    //       challenge.playerA.deck,
    //       ["name", "id", "level"],
    //     ) &&
    //     battle.opponent[0].tag === challenge.playerB?.tag &&
    //     compareCards(
    //       battle.opponent[0].cards,
    //       challenge.playerB?.deck as Card[],
    //       ["name", "id", "level"],
    //     );
    // });

    // if (!latestFriendlyBattle) {
    //   return NextResponse.json(
    //     {
    //       error: "No valid battle found",
    //     },
    //     { status: 404 },
    //   );
    // }

    // if (latestFriendlyBattle.team[0].crowns < latestFriendlyBattle.opponent[0].crowns) {
    //   winner = challenge.playerB?.wallet
    // }

    // else if (latestFriendlyBattle.team[0].crowns > latestFriendlyBattle.opponent[0].crowns) {
    //   winner = challenge.playerA.wallet
    // }

    // else {
    //   return NextResponse.json(
    //     {
    //       error: "Battle Tied",
    //     },
    //     { status: 500 },
    //   );
    // }


    // Here you would:
    // 1. Fetch battle results from Clash Royale API
    // 2. Determine winner
    // 3. Call smart contract to distribute funds

    // For prototype, let's just randomly pick a winner
    const winner = Math.random() > 0.5
      ? challenge.playerA.wallet
      : challenge.playerB?.wallet;

    const resolvedChallenge = {
      ...challenge,
      status: "resolved" as const,
      winner,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const { exp, ...challengeWithoutExp } = resolvedChallenge; // eslint-disable-line @typescript-eslint/no-unused-vars
    const newToken = signChallenge(challengeWithoutExp);

    const ttlSeconds = 24 * 60 * 60;

    await redisClient.set(challenge.id, newToken, "EX", ttlSeconds);

    return NextResponse.json(
      {
        challenge: resolvedChallenge,
        token: newToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error resolving challenge:", error);
    return NextResponse.json(
      {
        error: "Failed to resolve challenge",
      },
      { status: 500 },
    );
  }
}
