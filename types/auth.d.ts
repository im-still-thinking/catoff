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

type WalletContextType = {
    publicKey: PublicKey | null;
    connected: boolean;
    connect: () => Promise<void | PublicKey>;
    disconnect: () => Promise<void>;
    sendTransaction: (instruction: TransactionInstruction) => Promise<string>;
    isPhantomInstalled: boolean;
}

type WalletAuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  authenticateWallet: (publicKey: PublicKey) => Promise<void>;
  logout: () => void;
}

type WalletAuthProviderProps = {
    children: ReactNode;
}