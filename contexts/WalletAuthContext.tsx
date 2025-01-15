"use client"

import { createContext, ReactNode, useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { localAPIClient } from '@/adapters/xhr';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

interface WalletAuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  authenticateWallet: (publicKey: PublicKey) => Promise<void>;
  logout: () => void;
}

export const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

interface WalletAuthProviderProps {
  children: ReactNode;
}

export function WalletAuthProvider({ children }: WalletAuthProviderProps) {
  const { connected } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('walletAuthToken');
    console.log('Stored token:', storedToken);
    console.log('Connected:', connected);

    if (storedToken && connected) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('walletAuthToken');
        }
      } catch (error) {
        console.error(error);
        localStorage.removeItem('walletAuthToken');
      }
    }
  }, [connected]);

  const authenticateWallet = async (publicKey: PublicKey) => {
    if (!publicKey || !window.solana) {
      console.error('Wallet not connected');
      throw new Error('Wallet not connected');
    }

    const storedToken = localStorage.getItem('walletAuthToken');
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const now = Date.now();

        // Optional: Add a grace period for token expiration
        const gracePeriod = 60 * 60 * 1000; // 1 hour
        if (payload.exp * 1000 + gracePeriod > now) {
          console.log('Valid token exists, skipping re-authentication.');
          setToken(storedToken);
          setIsAuthenticated(true);
          return;
        } else {
          console.log('Token expired, removing from storage.');
          localStorage.removeItem('walletAuthToken');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        localStorage.removeItem('walletAuthToken');
      }
    }

    console.log('Authenticating with publicKey:', publicKey.toBase58());
    try {
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with our app: ${timestamp}`;
      const encodedMessage = new TextEncoder().encode(message);

      const { signature } = await window.solana.signMessage(encodedMessage, 'utf8');
      console.log('Signature received:', bs58.encode(signature));

      const signatureBase58 = bs58.encode(signature);
      const response = await localAPIClient.post<AuthResponse>('/auth/wallet', {
        publicKey: publicKey.toBase58(),
        signature: signatureBase58,
        message,
        timestamp,
      });

      const auth = response.data;
      localStorage.setItem('walletAuthToken', auth.token);
      setToken(auth.token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  };


  const logout = () => {
    localStorage.removeItem('walletAuthToken');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <WalletAuthContext.Provider
      value={{
        token,
        isAuthenticated,
        authenticateWallet,
        logout,
      }}
    >
      {children}
    </WalletAuthContext.Provider>
  );
}