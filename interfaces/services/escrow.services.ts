import { SolanaEscrow } from "@/lib/solana/escrow";
import { Connection, PublicKey } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

export class EscrowService {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    async createEscrow(params: {
        publicKey: string;
    }): Promise<EscrowCreationResponseValidation> {
        const challengeId = uuidv4();

        try {
            const escrow = await SolanaEscrow.createEscrowForChallenge(
                challengeId,
                this.connection,
            );

            const escrowPubkey = await escrow.getEscrowPubKey();

            const serializedInitTx = await escrow.initializeEscrow(
                new PublicKey(params.publicKey),
            );

            return { serializedInitTx, challengeId, escrowPubkey };
        } catch (error) {
            await SolanaEscrow.cleanupEscrow(challengeId);
            throw error;
        }
    }

    // async getEscrow(params: {
    //     challengeId: string;
    // }) {
    //     try {
    //         const escrow = await SolanaEscrow.getEscrowForChallenge(
    //             params.challengeId,
    //             this.connection,
    //         );

    //         if (!escrow) {
    //             throw new Error(
    //                 `Escrow for challenge ${params.challengeId} not found`,
    //             );
    //         }

    //         return { escrow };
    //     } catch (error) {
    //         throw error;
    //     }
    // }

    async validateEscrowCreationRequest(
        req: Request,
    ): Promise<EscrowCreationRequestValidation> {
        let body: EscrowCreationRequestValidation;

        try {
            body = await req.json();
        } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
            throw new Error("Invalid Escrow Request Body");
        }

        const { publicKey } = body;

        if (!publicKey) {
            throw new Error(
                "Required Escrow Fields Missing",
            );
        }

        try {
            new PublicKey(publicKey);
        } catch {
            throw new Error(
                "Escrow User Public Key Invalid",
            );
        }

        return {
            publicKey,
        };
    }

    async validateEscrowGetRequest(
        req: Request,
    ): Promise<EscrowCreationGetValidation> {
        let challengeId: string;

        try {
            const url = new URL(req.url);
            challengeId = url.searchParams.get("challengeId") as string;
        } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
            throw new Error("Invalid Escrow Request Body");
        }

        if (!challengeId) {
            throw new Error(
                "Required Escrow Fields Missing",
            );
        }

        if (typeof challengeId !== "string") {
            throw new Error("Invalid challengeId format");
        }
        
        return { challengeId };
    }
}
