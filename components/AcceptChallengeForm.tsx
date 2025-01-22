/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useState } from 'react';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();
  const { publicKey, connect, connection, sendTransaction } = useWallet();


  // Add validation check function
  const validateChallenge = (): boolean => {
    setValidationError(null);

    // Check if player tags match
    if (playerTag.trim() === challenge.playerA.tag) {
      setValidationError("You cannot accept a challenge with the same player tag as the challenger");
      return false;
    }

    // Check if wallet addresses match
    if (publicKey?.toBase58() === challenge.playerA.wallet) {
      setValidationError("You cannot accept a challenge with the same wallet as the challenger");
      return false;
    }

    return true;
  };

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

    // Clean the tag by removing # if present at the start
    let cleanedTag = playerTag.trim();
    if (cleanedTag.startsWith('#')) {
      cleanedTag = cleanedTag.substring(1).trim();
      setPlayerTag(cleanedTag); // Update the state with cleaned tag
    }

    if (!validateChallenge()) {
      return;
    }

    // Make single API call with cleaned tag
    await fetchPlayerData(cleanedTag);
  };

  const getEscrow = async (): Promise<any> => {
    const response = await localAPIClient.get(`/challenge/escrow?challengeId=${challenge.id}`);

    if (response.status === 200) {
      const { challengeId } = response.data

      const escrow = await SolanaEscrow.getEscrowForChallenge(
        challengeId,
        connection,
      );

      if (!escrow) throw new Error("Failed to get escrow");

      return { escrow }
    }
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!challenge || !publicKey || selectedDeck.length !== 8) {
      alert("Complete all fields before accepting the challenge.");
      return;
    }

    // Validate before processing transaction
    if (!validateChallenge()) {
      return;
    }

    setIsProcessing(true);

    try {
      const { escrow } = await getEscrow()

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

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("challenge id", challenge.id)
    console.log("token", token)

    if (!challenge?.id || !token) {
      console.error("Missing required data for declining challenge");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await localAPIClient.post(`/challenge/${challenge.id}/decline`, {
        token: token,
      });

      if (response.status === 200) {
        router.push("/");
      } else {
        // Handle non-200 responses
        const errorMessage = response.data?.error || "Failed to decline the challenge.";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error declining challenge:", error);
      // Show error in UI instead of using alert
      setValidationError(error instanceof Error ? error.message : "Failed to decline the challenge. Please try again.");
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
      {validationError && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg">
          {validationError}
        </div>
      )}

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
              type="button"
              onClick={handleDecline}
              className="flex-1 border-2 border-white rounded-xl font-supercell bg-red-500 text-white p-2 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Decline Challenge"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}