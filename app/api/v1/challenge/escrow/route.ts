/* eslint-disable @typescript-eslint/no-explicit-any */

import { EscrowService } from "@/interfaces/services/escrow.services";
import { NextRequest, NextResponse } from "next/server";
import { getSolanaConnection } from "@/lib/solana/connection";
import { EscrowError } from "@/domain/errors/escrow.errors";

export async function POST(req: NextRequest) {
    const connection = getSolanaConnection("finalized");
    const escrowService = new EscrowService(connection);

    try {
        const { publicKey } = await escrowService
            .validateEscrowCreationRequest(
                req,
            );

        const { serializedInitTx, challengeId, escrowPubkey } =
            await escrowService
                .createEscrow({
                    publicKey,
                });

        return NextResponse.json({
            serializedInitTx,
            challengeId,
            escrowPubkey,
        }, { status: 201 });
    } catch (error: any) {
        if (error instanceof EscrowError) {
            return NextResponse.json({
                error: {
                    code: error.code,
                    message: error.message,
                },
            }, { status: error.details.status });
        }

        return NextResponse.json({
            error: {
                code: "ESCROW_CREATION_FAILED",
                message: error.message,
            },
        }, { status: 500 });
    }
}
