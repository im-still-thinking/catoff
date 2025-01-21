/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { createContext, ReactNode, useEffect, useState } from 'react';
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction, Transaction } from '@solana/web3.js';
import { secrets } from '@/lib/config';


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


  async function sendTransaction(transaction: Transaction | TransactionInstruction) {
    if (typeof window === "undefined") throw new Error("Window is undefined");
  
    try {
      const solana = window.solana;
      if (!solana || !publicKey) throw new Error("Wallet not connected");
  
      if (transaction instanceof TransactionInstruction) {
        // Handle instruction case
        const blockhash = await connection.getLatestBlockhash().then((res: any) => res.blockhash);
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [transaction],
        }).compileToV0Message();
        const transactionV0 = new VersionedTransaction(messageV0);
        const { signature } = await solana.signAndSendTransaction(transactionV0);
        return signature;
      } else {
        // Handle complete transaction case
        const { signature } = await solana.signAndSendTransaction(transaction);
        return signature;
      }
    } catch (error) {
      console.error("Transaction error:", error);
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
        connection,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}


