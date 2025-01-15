/* eslint-disable @typescript-eslint/no-explicit-any */

import { clashRoyaleAPIClient } from "@/adapters/xhr";
import { signChallenge, verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const getAsync = promisify(redisClient.get).bind(redisClient);

const compareCards = (
  playerACards: Record<string, any>[],
  playerBCards: Record<string, any>[],
  fields: string[],
) => {
  const compareFields = (
    playerACard: Record<string, any>,
    playerBCard: Record<string, any>,
  ) => {
    return fields.every((field) => playerACard[field] === playerBCard[field]);
  };

  return playerACards.every((playerACard) =>
    playerBCards.some((playerBCard) =>
      compareFields(playerACard, playerBCard)
    ) &&
    playerBCards.every((playerBCard) =>
      playerACards.some((playerACard) =>
        compareFields(playerACard, playerBCard)
      )
    )
  );
};

// const compareCards = (
//   first_array_of_cards: Record<string, any>[],
//   second_array_of_cards: Record<string, any>[],
// ) => {
//   return (
//     first_array_of_cards.length === second_array_of_cards.length &&
//     first_array_of_cards.every((element_1: Record<string, any>) =>
//       second_array_of_cards.some(
//         (element_2: Record<string, any>) =>
//           element_1.name === element_2.name &&
//           element_1.id === element_2.id &&
//           element_1.level === element_2.level,
//       )
//     )
//   );
// };

export async function POST(
  req: NextRequest,
) {
  try {
    let winner;
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

    const response = await clashRoyaleAPIClient.get(
      `/players/%23${encodeURIComponent(challenge.playerA.tag!)}/battlelog`,
    );

    const latestFriendlyBattle = response.data.find((battle: any) => {
      // console.log("type", battle.type)
      // console.log("mode", battle.gameMode.name)
      // console.log("deck", battle.deckSelection)
      // console.log("playerASupposedtag", battle.team[0].tag.substring(1))
      // console.log("playerAtag", challenge.playerA.tag )
      console.log("playerACardsCompare",compareCards(
        battle.team[0].cards,
        challenge.playerA.deck,
        ["name", "id"]
      ))
      // console.log("playerBSupposedtag", battle.opponent[0].tag.substring(1))
      // console.log("playerBtag", challenge.playerB?.tag )
      console.log("playerBCardsCompare",compareCards(
        battle.opponent[0].cards,
        challenge.playerB?.deck as Card[],
        ["name", "id"]
      ))

      // console.log("selected deck A", challenge.playerA.deck)
      // console.log("fought deck A", battle.team[0].cards)
      // console.log("selected deck B", challenge.playerB?.deck)
      // console.log("fought deck B", battle.opponent[0].cards)

      return battle.type === "friendly" &&
        battle.gameMode.name === "Friendly" &&
        battle.deckSelection === "collection" &&
        battle.team[0].tag.substring(1) === challenge.playerA.tag &&
        compareCards(
          battle.team[0].cards,
          challenge.playerA.deck,
          ["name", "id"]
        ) &&
        battle.opponent[0].tag.substring(1) === challenge.playerB?.tag &&
        compareCards(
          battle.opponent[0].cards,
          challenge.playerB?.deck as Card[],
          ["name", "id"]
        );
    });

    if (!latestFriendlyBattle) {
      return NextResponse.json(
        {
          error: "No valid battle found",
        },
        { status: 404 },
      );
    }

    if (
      latestFriendlyBattle.team[0].crowns <
        latestFriendlyBattle.opponent[0].crowns
    ) {
      winner = challenge.playerB?.wallet;
    } else if (
      latestFriendlyBattle.team[0].crowns >
        latestFriendlyBattle.opponent[0].crowns
    ) {
      winner = challenge.playerA.wallet;
    } else {
      return NextResponse.json(
        {
          error: "Battle Tied",
        },
        { status: 500 },
      );
    }

    // Here you would:
    // 1. Fetch battle results from Clash Royale API
    // 2. Determine winner
    // 3. Call smart contract to distribute funds

    // For prototype, let's just randomly pick a winner
    // const winner = Math.random() > 0.5
    //   ? challenge.playerA.wallet
    //   : challenge.playerB?.wallet;

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
