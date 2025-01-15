import { NextResponse } from "next/server";
import { clashRoyaleAPIClient } from "@/adapters/xhr";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const playerTag = url.searchParams.get("tag");

    try {
        await clashRoyaleAPIClient.get(
            `/players/%23${encodeURIComponent(playerTag!)}/battlelog`,
        );

        return NextResponse.json(
            {
                "jsjs": "no battle log",
            },
            { status: 200 },
        );
    } catch (error) {
        console.error("Player Battle Log Error", error);
        return NextResponse.json(
            { error: "Player Battle Log Fetch Failed" },
            { status: 500 },
        );
    }
}
