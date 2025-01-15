import { NextResponse } from "next/server";
import { clashRoyaleAPIClient } from "@/adapters/xhr";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const playerTag = url.searchParams.get("tag");

    try {
        const response = await clashRoyaleAPIClient.get(
            `/players/%23${encodeURIComponent(playerTag!)}`,
        );

        return NextResponse.json(
            {
                tag: response.data?.tag,
                name: response.data?.name,
                clan: response.data?.clan,
                trophies: response.data?.trophies,
                arena: response.data?.arena,
                badges: response.data?.badges,
                achievements: response.data?.achievements,
                cards: response.data?.cards,
                currentDeckSupportCards: response.data?.currentDeckSupportCards,
                currentFavouriteCard: response.data?.currentFavouriteCard,
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Player Fetch Error", error);
        return NextResponse.json(
            { error: "Player Information Fetch Failed" },
            { status: 500 },
        );
    }
}
