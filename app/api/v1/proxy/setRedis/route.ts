import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";

export const POST = async (request: NextRequest) => {
    try {
        const { key, value } = await request.json();

        await redisClient.hmset(key, value);
        // await redisClient.expire(key, 24 * 60 * 60);

        return NextResponse.json(
            {
               message: "Redis set succesful"
            },
            { status: 200 },
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Redis set failed" },
            { status: 500 },
        );
    }
};
