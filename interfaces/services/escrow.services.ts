import { EscrowError } from "@/domain/errors/escrow.errors";
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

            console.debug("escrow pubkey", escrowPubkey)

            const serializedInitTx = await escrow.initializeEscrow(
                new PublicKey(params.publicKey),
            );

            return {serializedInitTx, challengeId, escrowPubkey};
        } catch (error) {
            await SolanaEscrow.cleanupEscrow(challengeId);
            throw error;
        }
    }

    async validateEscrowCreationRequest(
        req: Request,
    ): Promise<EscrowCreationRequestValidation> {
        let body: EscrowCreationRequestValidation;

        try {
            body = await req.json();
        } catch (error) { //eslint-disable-line @typescript-eslint/no-unused-vars
            throw new EscrowError(
                "INVALID_ESCROW_REQUEST_BODY",
                "Invalid request body",
                {
                    status: 422,
                },
            );
        }

        const { publicKey } = body;

        if (!publicKey) {
            throw new EscrowError(
                "REQUIRED_ESCROW_FIELD_MISSING",
                "Missing required fields",
                {
                    received: { publicKey },
                    status: 422,
                },
            );
        }


        try {
            new PublicKey(publicKey);
        } catch {
            throw new EscrowError(
                "ESCROW_USER_PUBLIC_KEY_INVALID",
                "Invalid public key format",
                {
                    status: 422,
                },
            );
        }

        return {
            publicKey,
        };
    }
}
