import { verifyChallenge } from "@/lib/jwt";
import { redisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const getAsync = promisify(redisClient.get).bind(redisClient);

export async function GET(
    req: NextRequest,
) {
    try {
        const token = req.headers.get("token");

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token is required!" }, {
                status: 400,
            });
        }

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

        return NextResponse.json({ challenge: challenge }, { status: 200 });
    } catch (error) {
        console.error("Error fetching challenge:", error);
        return NextResponse.json({ error: "Failed to fetch challenge" }, {
            status: 500,
        });
    }
}