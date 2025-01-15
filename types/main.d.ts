interface Solana {
    isPhantom: boolean;
    publicKey: PublicKey;
    connect: (options?: { onlyIfTrusted: boolean }) => Promise<void>;
    disconnect: () => Promise<void>;
    signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
    isConnected: boolean;
    on: (event: 'connect' | 'disconnect', handler: () => void) => void;
    removeAllListeners: (event: 'connect' | 'disconnect') => void;
  }
  
  interface Window {
    solana?: Solana;
  }
  