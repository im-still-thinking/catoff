"use client"

import { createContext, ReactNode, useEffect, useState } from 'react';
import { Connection, PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { secrets } from '@/lib/config';

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void | PublicKey>;
  disconnect: () => Promise<void>;
  sendTransaction: (instruction: TransactionInstruction) => Promise<string>;
  isPhantomInstalled: boolean;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const connection = new Connection(secrets.SOLANA_RPC_URL!, 'confirmed');

  useEffect(() => {
    const checkPhantomAndAutoConnect = async () => {
      if (typeof window === 'undefined') return;

      const solana = window.solana;
      setIsPhantomInstalled(!!solana?.isPhantom);

      if (solana?.isPhantom) {
        const shouldAutoConnect = localStorage.getItem('phantomAutoConnect') === 'true';

        if (shouldAutoConnect) {
          try {
            await solana.connect();
          } catch (error) {
            console.error('Auto-connect error:', error);
            localStorage.removeItem('phantomAutoConnect');
          }
        }

        solana.on('connect', () => {
          console.log('Setting publicKey in WalletProvider:', solana.publicKey?.toBase58());
          setConnected(true);
          setPublicKey(solana.publicKey);
          localStorage.setItem('phantomAutoConnect', 'true');
        });

        solana.on('disconnect', () => {
          console.log('Disconnected');
          setConnected(false);
          setPublicKey(null);
          localStorage.removeItem('phantomAutoConnect');
        });

        if (solana.isConnected) {
          setConnected(true);
          setPublicKey(solana.publicKey);
        }
      }
    };

    checkPhantomAndAutoConnect();

    return () => {
      if (typeof window !== 'undefined' && window.solana) {
        window.solana.removeAllListeners('connect');
        window.solana.removeAllListeners('disconnect');
      }
    };
  }, []);

  async function connect() {
    if (typeof window === 'undefined') return;
    try {
      const solana = window.solana;
      if (solana) {
        await solana.connect();
        console.log('Wallet connected, publicKey:', solana.publicKey?.toBase58());
        setConnected(true);
        setPublicKey(solana.publicKey);
        return solana.publicKey;
      } else {
        throw new Error('Phantom wallet is not installed');
      }
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }
  async function disconnect() {
    if (typeof window === 'undefined') return;
    try {
      const solana = window.solana;
      if (solana) {
        await solana.disconnect();
      }
      setConnected(false);
      setPublicKey(null);
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  async function sendTransaction(instruction: TransactionInstruction) {
    if (typeof window === 'undefined') throw new Error('Window is undefined');
    try {
      const solana = window.solana;
      if (!solana || !publicKey) throw new Error('Wallet not connected');

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }



  return (
    <WalletContext.Provider
      value={{
        publicKey,
        connected,
        connect,
        disconnect,
        sendTransaction,
        isPhantomInstalled,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}


