import { verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
    req: NextRequest,
) {
    try {
        const url = new URL(req.url);
        const challengeId = req.nextUrl.pathname.split("/")[4];
        const type = url.searchParams.get('type');
        const token = await redisClient.hget(`${challengeId}`, `${type}`);

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token is Invalid!" }, {
                status: 400,
            });
        }

        const challenge = verifyChallenge(token);

        return NextResponse.json({ challenge: challenge, token: token }, {
            status: 200,
        });
    } catch (error) {
        console.error("Error fetching challenge:", error);
        return NextResponse.json({ error: "Failed to fetch challenge" }, {
            status: 500,
        });
    }
}
