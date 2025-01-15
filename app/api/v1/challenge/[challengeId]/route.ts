/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { verifyChallenge } from "@/lib/jwt";

export async function GET(
    req: any,
) {
    try {
        const token = req.headers.get('token');

        if (!token || typeof token !== "string") {
            return NextResponse.json({ error: "Token is required!" }, {
                status: 400,
            });
        }

        const challenge = verifyChallenge(token);
        return NextResponse.json({ challenge: challenge }, { status: 200 });
    } catch (error) {
        console.error("Error fetching challenge:", error);
        return NextResponse.json({ error: "Failed to fetch challenge" }, {
            status: 500,
        });
    }
}