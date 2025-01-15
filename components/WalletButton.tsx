"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export default function WalletButton() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const { authenticateWallet } = useWalletAuth();
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    setIsPhantomInstalled(
      typeof window !== 'undefined' && !!window.solana?.isPhantom
    );
  }, []);

  const handleConnect = async () => {
    try {
      const walletPublicKey = await connect();
      if (!walletPublicKey) {
        throw new Error('Failed to retrieve wallet public key');
      }
      setIsAuthenticating(true);
      await authenticateWallet(walletPublicKey);
    } catch (error) {
      console.error('Connection/authentication error:', error);
      disconnect();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (!isPhantomInstalled) {
    return (
      <a
        href="https://phantom.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-purple-500 text-white rounded"
      >
        Install Phantom
      </a>
    );
  }

  if (isAuthenticating) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-purple-300 text-white rounded cursor-wait"
      >
        Authenticating...
      </button>
    );
  }

  return (
    <button
      onClick={connected ? handleDisconnect : handleConnect}
      className="px-4 py-2 bg-purple-500 text-white rounded"
    >
      {connected
        ? `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`
        : 'Connect Phantom'
      }
    </button>
  );
}