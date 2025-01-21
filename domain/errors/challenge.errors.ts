/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseError } from "../../interfaces/shared/base.errors.shared";

export class ChallengeError extends BaseError {
  constructor(
    code: string,
    message: string,
    details?: any,
  ) {
    super("ChallengeError", code, message, details);
  }
}

export class ChallengeTransactionError extends ChallengeError {
  constructor(
    code: string,
    message: string,
    details?: any,
  ) {
    super(code, message, details);
    this.name = "ChallengeTransactionError";
  }

  static fromError(error: any): ChallengeTransactionError {
    if (error.message?.includes("timeout")) {
      return new ChallengeTransactionError(
        "TRANSACTION_TIMEOUT",
        "Transaction timed out while processing challenge",
        error,
      );
    }

    return new ChallengeTransactionError(
      "UNKNOWN_ERROR",
      "An unknown error occurred during the transaction",
      error,
    );
  }
}

export class ChallengeValidationError extends ChallengeError {
  constructor(
    message: string,
    details?: any,
  ) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ChallengeValidationError";
  }
}
