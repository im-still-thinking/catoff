/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { localAPIClient } from "@/adapters/xhr";
import DeckSelector from "@/components/DeckSelector";
import { useWallet } from "@/hooks/useWallet";
import { SolanaEscrow } from "@/lib/solana/escrow";
import { Transaction } from "@solana/web3.js";
import { useState } from "react";

const MAX_RETRIES = 3;
const CONFIRMATION_TIMEOUT = 30000;

export default function CreateChallenge() {
  const [playerTag, setPlayerTag] = useState("");
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [wagerAmount, setWagerAmount] = useState("0");
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { publicKey, connect, connection, sendTransaction } = useWallet();

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
    if (playerTag.trim().indexOf('#') === 0) {
      setPlayerTag(playerTag.substring(1).trim())
      await fetchPlayerData(playerTag.substring(1).trim());
    }
    await fetchPlayerData(playerTag.trim());
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

  const createEscrow = async (): Promise<any> => {
    try {
      const response = await localAPIClient.post("/challenge/escrow", {
        publicKey: publicKey.toBase58()
      });

      if (response.status === 201) {
        const { serializedInitTx, challengeId, escrowPubkey } = response.data

        const initTransaction = Transaction.from(Buffer.from(serializedInitTx, "base64"));

        let retries = 0
        let signature: string | null = null;

        while (retries < MAX_RETRIES && !signature) {
          try {
            signature = await sendTransaction(initTransaction);

            const latestBlockhash = await connection.getLatestBlockhash();
            const confirmation = await connection.confirmTransaction(
              {
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
              },
              "confirmed"
            );

            if (confirmation.value.err) {
              throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }
          } catch (error: any) {
            if (error.message?.includes("block height exceeded")) {
              console.warn("Blockhash expired. Refreshing...");
              const latestBlockhash = await connection.getLatestBlockhash();
              initTransaction.recentBlockhash = latestBlockhash.blockhash;
            }

            retries++;
            if (retries === MAX_RETRIES) {
              throw new Error(`Transaction failed after multiple attempts`);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (!signature) throw new Error("Failed to sign escrow creation transaction");

        return { challengeId, escrowPubkey }
      }
    }
    catch (error) {
      console.error(error)
    }
  }

  const setWager = async (
    challengeId: string,
  ): Promise<any> => {

    const escrow = await SolanaEscrow.getEscrowForChallenge(challengeId, connection);
    if (!escrow) throw new Error(`Escrow for challenge ${challengeId} not found`);

    let signature: string | null = null;
    let retries = 0;

    while (retries < MAX_RETRIES && !signature) {
      try {
        const depositInstruction = await escrow.depositToEscrow(parseFloat(wagerAmount), publicKey!);
        signature = await sendTransaction(depositInstruction);

        const isConfirmed = await waitForTransactionConfirmation(signature);

        if (!isConfirmed) {
          throw new Error("Transaction failed to confirm");
        }
      } catch (error) {
        console.error(`Deposit attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries === MAX_RETRIES) {
          throw new Error(`Deposit failed after ${MAX_RETRIES} attempts`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!signature) throw new Error("Failed to sign wager set transaction");

    console.debug("Wager transaction signature", signature)
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !connection || !sendTransaction) {
      alert("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);

    try {
      const { challengeId, escrowPubkey } = await createEscrow()
      await setWager(challengeId)

      const response = await localAPIClient.post("/challenge", {
        playerTag: playerTag.trim(),
        deck: selectedDeck,
        wagerAmount: parseFloat(wagerAmount),
        publicKey: publicKey.toBase58(),
        challengeId: challengeId,
        escrowPubkey: escrowPubkey,
      });

      if (response.status === 201) {
        const { challengeId } = response.data;
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const link = `${baseUrl}/challenge/${challengeId}`;
        setShareableLink(link);
      }
    } catch (error) {
      console.error("Failed to create challenge:", error);
      alert("An error occurred while creating the challenge. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto p-4 w-screen min-h-screen flex items-center flex-col" >
      <h1 className="text-5xl max-sm:text-3xl my-10 font-bold mb-4 text-white font-supercell text-center">Create Challenge</h1>
      {!publicKey ? (
        <button
          type="button"
          onClick={() => connect()}
          className="w-fit px-10 py-2 pt-3 border-2 transform border-white rounded-xl text-2xl font-supercell bg-yellow-500 text-white p-2 ease-out duration-150 hover:scale-105 mx-auto"
        >
          Connect Wallet
        </button>
      ) : !playerData ? (
        <form onSubmit={handleTagSubmit} className="space-y-4 mt-10 flex flex-col items-center justify-center">
          <div className="flex flex-row gap-4 items-center justify-center">
            <label className="text-2xl mb-2 text-black text-nowrap font-supercell mt-2">Player Tag:</label>
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
        <div className="space-y-6 w-[80%] max-sm:w-[90%] mx-auto mb-80">
          <div className="p-4 border-b-[1px] border-white/50 pb-10">
            <DeckSelector cards={playerData.cards} onSelect={setSelectedDeck} />
          </div>
          <form className="sm:w-[60%] mx-auto rounded-xl p-4" onSubmit={handleChallengeSubmit}>
            <div className="sm:w-full ">
              <label className="block mb-2 sm:w-full text-center text-white font-supercell">Wager Amount (SOL)</label>
              <input
                type="number"
                value={wagerAmount}
                onChange={(e) => setWagerAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-white w-full outline-white max-sm:w-full bg-white/20 placeholder:text-white px-3 py-2 pt-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent font-supercell text-sm"
                required
                disabled={isProcessing}
              />
            </div>
            <button
              type="submit"
              disabled={selectedDeck.length !== 8 || isProcessing}
              className="w-full mt-2 border-2 border-white rounded-xl font-supercell bg-green-500 text-white p-2 hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Create Challenge"}
            </button>
          </form>
        </div>
      )}

      {shareableLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white border-2 border-black p-6 rounded-xl shadow-lg w-[90%] max-w-md">
            <h3 className="text-xl font-supercell text-black mb-2">Share Challenge</h3>
            <p className="text-gray-400 mb-2 font-supercell text-sm">Share this link with your opponent:</p>
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="w-full p-2 border rounded text-black bg-gray-100 text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareableLink);
                  const btn = document.getElementById('copyBtn');
                  btn?.classList.add('copied');
                  setTimeout(() => btn?.classList.remove('copied'), 1000);
                }}
                id="copyBtn"
                className="group relative flex-1 bg-blue-500 border-2 border-black text-white py-2 pt-3 rounded-lg hover:bg-blue-600 transition-colors font-supercell text-sm overflow-hidden"
              >
                <span className="absolute inset-0 flex items-center justify-center group-[.copied]:opacity-0 transition-opacity duration-200">
                  Copy Link
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-[.copied]:opacity-100 transition-opacity duration-200">
                  <span className="flex items-center gap-2">
                    ✓ <span>Copied</span>
                  </span>
                </span>
              </button>
              <button
                onClick={() => setShareableLink(null)}
                className="flex-1 bg-gray-500 border-2 border-black text-white py-2 pt-3 rounded-lg hover:bg-gray-600 transition-colors font-supercell text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}