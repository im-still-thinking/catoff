"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from "@/hooks/useWallet";
import { localAPIClient } from "@/adapters/xhr";
import DeckSelector from "@/components/DeckSelector";
import { SolanaEscrow } from '@/lib/solana/escrow';

const MAX_RETRIES = 3;
const CONFIRMATION_TIMEOUT = 30000;

export default function AcceptChallengeForm({ challenge, token }: AcceptChallengeFormProps) {
  const [playerTag, setPlayerTag] = useState("");
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { publicKey, connect, connection, sendTransaction } = useWallet();

  useEffect(() => {
    if (publicKey && playerTag && !playerData) {
      fetchPlayerData(playerTag.trim());
    }
  }, [publicKey, playerData, playerTag]);

  const waitForTransactionConfirmation = async (signature: string): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < CONFIRMATION_TIMEOUT) {
      const status = await connection.getSignatureStatus(signature);

      if (status?.value?.err) {
        console.error("Transaction failed:", status.value.err);
        return false;
      }

      if (status?.value?.confirmationStatus === "finalized") {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error("Transaction confirmation timeout");
  };

  const attemptTransaction = async (
    escrow: SolanaEscrow,
    amount: number
  ): Promise<string> => {
    const depositInstruction = await escrow.depositToEscrow(amount, publicKey!);
    const signature = await sendTransaction(depositInstruction);

    const isConfirmed = await waitForTransactionConfirmation(signature);
    if (!isConfirmed) {
      throw new Error("Transaction failed to confirm");
    }

    return signature;
  };

  const fetchPlayerData = async (tag: string) => {
    if (!tag) return;

    try {
      const response = await localAPIClient.get(`/proxy/crPlayerInfo/?tag=${encodeURIComponent(tag)}`);
      if (response.status !== 200) {
        throw new Error("Failed to fetch player data");
      }
      setPlayerData(response.data);
    } catch (error) {
      console.error("Error fetching player data:", error);
      alert("Invalid player tag or unable to fetch data. Please try again.");
    }
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerTag.trim()) {
      alert("Please enter a player tag");
      return;
    }
    await fetchPlayerData(playerTag.trim());
  };

  const handleAccept = async () => {
    if (!challenge || !publicKey || selectedDeck.length !== 8) {
      alert("Complete all fields before accepting the challenge.");
      return;
    }

    setIsProcessing(true);

    try {
      const escrow = await SolanaEscrow.getEscrowForChallenge(challenge.id, connection);
      if (!escrow) throw new Error(`Escrow for challenge ${challenge.id} not found`);

      let signature: string | null = null;
      let retries = 0;

      while (retries < MAX_RETRIES && !signature) {
        try {
          signature = await attemptTransaction(escrow, parseFloat(String(challenge.wagerAmount)));
          console.log(`Transaction confirmed with signature: ${signature}`);
        } catch (error) {
          console.error(`Transaction attempt ${retries + 1} failed:`, error);
          retries++;

          if (retries === MAX_RETRIES) {
            throw new Error(`Transaction failed after ${MAX_RETRIES} attempts`);
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const response = await localAPIClient.post(`/challenge/${challenge.id}/accept`, {
        playerTag: playerTag.trim(),
        deck: selectedDeck,
        publicKey: publicKey.toBase58(),
        token: token
      });

      if (response.status === 200) {
        const { challenge } = response.data;

        router.push(`/challenge/${challenge.id}/status?`);
      } else {
        throw new Error("Failed to accept the challenge.");
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert("An error occurred while accepting the challenge. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!challenge || !token) return;
    setIsProcessing(true);
    try {
      const response = await localAPIClient.post(`/challenge/${challenge.id}/decline`, {
        token: token,
      });
      
      if (response.status === 200) {
        router.push("/");
      } else {
        const errorData = await response.data;
        throw new Error(errorData.error || "Failed to decline the challenge.");
      }
    } catch (error) {
      console.error("Error declining challenge:", error);
      alert(error instanceof Error ? error.message : "Failed to decline the challenge. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!publicKey) {
    return (
      <button
        onClick={connect}
        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {!playerData ? (
        <form onSubmit={handleTagSubmit} className="space-y-4 mt-10 flex flex-col items-center justify-center">
          <div className="flex flex-row gap-4 items-center justify-center">
            <label className="text-2xl mb-2 text-white text-nowrap font-supercell mt-2">Player Tag:</label>
            <input
              type="text"
              value={playerTag}
              onChange={(e) => setPlayerTag(e.target.value)}
              placeholder="XXXXXX"
              className="w-full p-2 border outline-white bg-white/20 text-white text-supercell rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-fit px-10 py-2 pt-3 border-2 transform border-white rounded-xl text-base font-supercell bg-green-500 text-white ease-out duration-150 hover:scale-105 mx-auto"
          >
            Fetch Player Data
          </button>
        </form>
      ) : (
        <div className="space-y-4 pb-80">
          <div className="p-4 border-b-[1px] border-white/50 pb-10">
            <DeckSelector cards={playerData.cards} onSelect={setSelectedDeck} />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAccept}
              className="flex-1 border-2 border-white rounded-xl font-supercell bg-green-500 text-white p-2 hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={selectedDeck.length !== 8 || isProcessing}
            >
              {isProcessing ? "Processing..." : "Accept Challenge"}
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 border-2 border-white rounded-xl font-supercell bg-red-500 text-white p-2 hover:bg-red-600 transition-colors"
              disabled={isProcessing}
            >
              Decline Challenge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}