import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { secrets } from "@/lib/config";

interface AuthenticatedRequest extends NextRequest {
    user: JWTPayload;
}

type RouteHandler = (
    request: AuthenticatedRequest,
) => Promise<NextResponse> | NextResponse;

const JWT_SECRET = secrets.JWT_SECRET!;

export function authMiddleware(handler: RouteHandler) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "No token provided" },
                { status: 401 },
            );
        }

        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

            const authenticatedRequest = request as AuthenticatedRequest;
            authenticatedRequest.user = decoded;

            return handler(authenticatedRequest);
        } catch (error) {
            console.error("Token verification error:", error);
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 },
            );
        }
    };
}
