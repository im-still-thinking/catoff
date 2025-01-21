import { Commitment, Connection, ConnectionConfig } from "@solana/web3.js";
import { secrets } from "@/lib/config";

export class SolanaConnectionManager {
    private static instance: SolanaConnectionManager;
    private connection: Connection | null = null;
    private lastInitTime: number = 0;
    private readonly REFRESH_INTERVAL = 1000 * 60 * 60;

    private constructor() {}

    public static getInstance(): SolanaConnectionManager {
        if (!SolanaConnectionManager.instance) {
            SolanaConnectionManager.instance = new SolanaConnectionManager();
        }
        return SolanaConnectionManager.instance;
    }

    public getConnection(commitment: Commitment = "confirmed"): Connection {
        const currentTime = Date.now();
        if (
            !this.connection ||
            currentTime - this.lastInitTime > this.REFRESH_INTERVAL
        ) {
            const config: ConnectionConfig = {
                commitment,
                wsEndpoint: undefined, // Disable WebSocket connection
                disableRetryOnRateLimit: false,
                confirmTransactionInitialTimeout: 60000,
            };

            // Add rate limiting and retry configuration
            const rpcUrl = new URL(secrets.SOLANA_RPC_URL!);
            rpcUrl.searchParams.set("retry-after", "2000");
            rpcUrl.searchParams.set("max-retries", "5");

            this.connection = new Connection(rpcUrl.toString(), config);
            this.lastInitTime = currentTime;
        }
        return this.connection;
    }

    public reset(): void {
        this.connection = null;
        this.lastInitTime = 0;
    }
}

export const getSolanaConnection = (
    commitment: Commitment = "confirmed",
): Connection => {
    return SolanaConnectionManager.getInstance().getConnection(commitment);
};
