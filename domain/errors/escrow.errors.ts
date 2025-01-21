/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseError } from "../../interfaces/shared/base.errors.shared";

export class EscrowError extends BaseError {
    constructor(
        code: string,
        message: string,
        details?: any,
    ) {
        super("EscrowError", code, message, details);
    }
}

export class EscrowTransactionError extends EscrowError {
    constructor(
        code: string,
        message: string,
        details?: any,
    ) {
        super(code, message, details);
        this.name = "EscrowTransactionError";
    }

    static fromError(error: any): EscrowTransactionError {
        if (error.message?.includes("block height exceeded")) {
            return new EscrowTransactionError(
                "BLOCKHASH_EXPIRED",
                "Transaction expired due to blockhash expiration",
                error,
            );
        }

        if (error.message?.includes("insufficient funds")) {
            return new EscrowTransactionError(
                "INSUFFICIENT_FUNDS",
                "Insufficient funds to complete transaction",
                error,
            );
        }

        return new EscrowTransactionError(
            "UNKNOWN_ERROR",
            "An unknown error occurred during the transaction",
            error,
        );
    }
}

export class EscrowValidationError extends EscrowError {
    constructor(
        message: string,
        details?: any,
    ) {
        super("VALIDATION_ERROR", message, details);
        this.name = "EscrowValidationError";
    }
}
