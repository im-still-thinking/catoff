import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import { localAPIClient } from "@/adapters/xhr";

export class SolanaEscrow {
    private connection: Connection;
    private escrowAccount: Keypair;

    constructor(connection: Connection) {
        this.connection = connection;
        this.escrowAccount = new Keypair();
    }

    static async createEscrowForChallenge(
        challengeId: string,
        connection: Connection,
    ): Promise<SolanaEscrow> {
        const escrow = new SolanaEscrow(connection);

        await localAPIClient.post("/proxy/setRedis", {
            key: challengeId,
            value: {
                escrowPrivateKey: Buffer.from(escrow.escrowAccount.secretKey)
                    .toString(
                        "base64",
                    ),
            },
        });

        return escrow;
    }

    static async getEscrowForChallenge(
        challengeId: string,
        connection: Connection,
    ): Promise<SolanaEscrow | null> {
        const res = await localAPIClient.post("/proxy/getRedis", {
            key: challengeId,
            field: "escrowPrivateKey",
        });

        const secretKeyBase64 = res.data.value;
        if (!secretKeyBase64) {
            console.warn(
                `No escrow key found for challenge ID: ${challengeId}`,
            );
            return null;
        }

        const secretKey = Buffer.from(secretKeyBase64, "base64");

        if (secretKey.length !== 64) {
            throw new Error(
                `Invalid secret key size: ${secretKey.length}. Expected 64 bytes.`,
            );
        }

        const escrow = new SolanaEscrow(connection);
        escrow.escrowAccount = Keypair.fromSecretKey(secretKey);
        return escrow;
    }

    async initializeEscrow(publicKey: PublicKey): Promise<string> {
        const space = 0;

        const rentExemption = await this.connection
            .getMinimumBalanceForRentExemption(space);

        const transactionFee = 5000;
        const totalNeeded = rentExemption + transactionFee;

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: this.escrowAccount.publicKey,
                lamports: rentExemption,
                space: space,
                programId: SystemProgram.programId,
            }),
        );

        const { blockhash } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        console.debug("Total SOL needed:", totalNeeded / LAMPORTS_PER_SOL);
        console.debug("Rent exemption:", rentExemption / LAMPORTS_PER_SOL);
        console.debug("Transaction fee:", transactionFee / LAMPORTS_PER_SOL);

        transaction.partialSign(this.escrowAccount);

        return transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString("base64");
    }

    async depositToEscrow(
        amount: number,
        fromPubkey: PublicKey,
    ): Promise<Transaction> {
        const lamports = amount * LAMPORTS_PER_SOL;

        const transaction = new Transaction();

        transaction.add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey: this.escrowAccount.publicKey,
                lamports,
            }),
        );

        const { blockhash, lastValidBlockHeight } = await this.connection
            .getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = fromPubkey;

        return transaction;
    }

    async confirmDeposit(amount: number): Promise<boolean> {
        const startBalance = await this.getEscrowBalance();

        for (let i = 0; i < 30; i++) {
            const currentBalance = await this.getEscrowBalance();
            if (currentBalance >= startBalance + amount) {
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return false;
    }

    async withdrawFromEscrow(
        amount: number,
        toPubkey: PublicKey,
    ): Promise<{ transaction: Transaction; closeAccount: boolean }> {
        const currentBalance = await this.connection.getBalance(
            this.escrowAccount.publicKey,
        );
        const minRent = await this.connection.getMinimumBalanceForRentExemption(
            0,
        );
        const requestedLamports = amount * LAMPORTS_PER_SOL;
        const transactionFee = 5000;
        const availableBalance = currentBalance - transactionFee;

        if (availableBalance <= minRent) {
            throw new Error(
                `Insufficient funds in escrow. Available: ${availableBalance}, Required: ${requestedLamports}`,
            );
        }

        const closeAccount = (availableBalance - requestedLamports) <= minRent;
        const transaction = new Transaction();

        if (closeAccount) {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: this.escrowAccount.publicKey,
                    toPubkey,
                    lamports: availableBalance,
                }),
            );
        } else {
            if (requestedLamports > availableBalance - minRent) {
                throw new Error(
                    `Insufficient funds for withdrawal. Available: ${
                        availableBalance - minRent
                    }, Requested: ${requestedLamports}`,
                );
            }

            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: this.escrowAccount.publicKey,
                    toPubkey,
                    lamports: requestedLamports,
                }),
            );
        }

        const { blockhash, lastValidBlockHeight } = await this.connection
            .getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = this.escrowAccount.publicKey;

        return { transaction, closeAccount };
    }

    static async cleanupEscrow(challengeId: string): Promise<void> {
        await localAPIClient.post("/proxy/delRedis", {
            key: challengeId,
            field: "escrowPrivateKey",
        });
    }

    async getEscrowBalance(): Promise<number> {
        const balance = await this.connection.getBalance(
            this.escrowAccount.publicKey,
        );
        return balance / LAMPORTS_PER_SOL;
    }

    async getEscrowPubKey(): Promise<string> {
        return this.escrowAccount.publicKey.toBase58();
    }

    async getEscrowAccount(): Promise<Keypair> {
        return this.escrowAccount;
    }
}
