type AuthResponse = {
    token: string;
    expiresIn: number;
};

type WalletAuthPayload = {
    publicKey: string;
    signature: string;
    message: string;
    timestamp: number;
};

type JWTPayload = {
    publicKey: string;
    type: "wallet";
    iat: number;
    exp: number;
};
