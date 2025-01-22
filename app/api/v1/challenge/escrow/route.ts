/* eslint-disable @typescript-eslint/no-explicit-any */

import { EscrowService } from "@/interfaces/services/escrow.services";
import { NextRequest, NextResponse } from "next/server";
import { getSolanaConnection } from "@/lib/solana/connection";


export async function GET(req: NextRequest) {
    const connection = getSolanaConnection("finalized");
    const escrowService = new EscrowService(connection);

    try {
        const { challengeId } = await escrowService
            .validateEscrowGetRequest(
                req,
            );

        // const { escrow } = await escrowService
        //     .getEscrow({
        //         challengeId,
        //     });

        return NextResponse.json({
            challengeId
        }, { status: 200 });
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({
            error: {
                code: "ESCROW_GET_FAILED",
            },
        }, { status: 500 });
    }
}

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
        return NextResponse.json({
            error: {
                code: "ESCROW_CREATION_FAILED",
                message: error.message,
            },
        }, { status: 500 });
    }
}
