import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { signChallenge } from "@/lib/jwt";

interface CreateChallengeRequest {
  playerTag: string;
  deck: Card[];
  wagerAmount: number;
  publicKey: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playerTag, deck, wagerAmount, publicKey } = body as CreateChallengeRequest;

    if (!playerTag || !deck || !wagerAmount || !publicKey) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          received: { playerTag, deck, wagerAmount, publicKey }
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(deck) || deck.length !== 8) {
      return NextResponse.json(
        {
          error: "Invalid deck",
          details: "Deck must contain exactly 8 cards"
        },
        { status: 400 }
      );
    }

    const isValidCard = (card: Card) => {
      return (
        card.id &&
        card.name &&
        card.iconUrls?.medium &&
        typeof card.level === 'number' &&
        typeof card.maxLevel === 'number' &&
        typeof card.elixirCost === 'number' &&
        typeof card.count === 'number'
      );
    };

    if (!deck.every(isValidCard)) {
      return NextResponse.json(
        {
          error: "Invalid card data",
          details: "One or more cards are missing required properties"
        },
        { status: 400 }
      );
    }

    const challenge: Challenge = {
      id: uuidv4(),
      playerA: {
        tag: playerTag,
        wallet: publicKey,
        deck: deck,
      },
      wagerAmount,
      status: "created",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const token = signChallenge(challenge);

    return NextResponse.json(
      { 
        challengeId: challenge.id, 
        token: token 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}