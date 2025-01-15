import { NextResponse } from "next/server";
import { clashRoyaleAPIClient } from "@/adapters/xhr";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const playerTag = url.searchParams.get("tag");

    try {
        await clashRoyaleAPIClient.get(
            `/players/%23${encodeURIComponent(playerTag!)}`,
        );

        return NextResponse.json(
            {
                "jsjs": "no battle log",
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
