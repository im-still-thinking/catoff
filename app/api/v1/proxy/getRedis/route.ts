import { NextRequest, NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";

export const POST = async (request: NextRequest) => {
    try {
        const { key, field } = await request.json();

        const value = await redisClient.hget(key, field);

        return NextResponse.json(
            {
               message: "Redis get succesful",
               value: value
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
