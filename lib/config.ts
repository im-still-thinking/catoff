export const secrets = {
    REDIS_URI: process.env.REDIS_URI,
    REDIS_PORT: Number(process.env.REDIS_PORT),
    REDIS_USERNAME: process.env.REDIS_USERNAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    CLASH_ROYALE_API: process.env.CLASH_ROYALE_API,
    SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    JWT_SECRET: process.env.JWT_SECRET
}