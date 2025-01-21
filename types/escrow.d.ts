/* eslint-disable @typescript-eslint/no-explicit-any */

type EscrowCreationRequestValidation = {
    publicKey: string;
};

type EscrowCreationGetValidation = {
    challengeId: string;
};

type EscrowCreationResponseValidation = {
    challengeId: string;
    serializedInitTx: string;
    escrowPubkey: string;
};

type EscrowTransactionLog = {
    timestamp: string;
    escrowAddress: string;
    transactionHash: string;
    status: "pending" | "confirmed" | "failed";
    blockHeight?: number;
    slot?: number;
    error?: string;
    message?: string;
};

type EscrowTransactionResult = {
    success: boolean;
    signature: string;
    logs: TransactionLog[];
    error?: {
        code: string;
        message: string;
        details?: any;
    };
};
