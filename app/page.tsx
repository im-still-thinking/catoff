"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import DeckSelector from "@/components/DeckSelector";
import { localAPIClient } from "@/adapters/xhr";

export default function CreateChallenge() {
  const [playerTag, setPlayerTag] = useState("");
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const [wagerAmount, setWagerAmount] = useState("0");
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const { publicKey, connect } = useWallet();

  useEffect(() => {
    if (publicKey && playerTag && !playerData) {
      fetchPlayerData(playerTag.trim());
    }
  }, [publicKey, playerData, playerTag]);

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
    if(playerTag.trim().indexOf('#') === 0){
      setPlayerTag(playerTag.substring(1).trim())
      await fetchPlayerData(playerTag.substring(1).trim());
    }
    await fetchPlayerData(playerTag.trim());
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerTag.trim()) {
      alert("Player tag is required");
      return;
    }

    if (!selectedDeck || selectedDeck.length !== 8) {
      alert("Please select exactly 8 cards for your deck");
      return;
    }

    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const response = await localAPIClient.post("/challenge", {
        playerTag: playerTag.trim(),
        deck: selectedDeck,
        wagerAmount: parseFloat(wagerAmount),
        publicKey: publicKey.toBase58(),
      });

      if (response.status === 201) {
        const { challengeId, token } = response.data;
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const link = `${baseUrl}/challenge/${challengeId}/?token=${encodeURIComponent(token)}`;
        setShareableLink(link);
      } else {
        throw new Error("Failed to create challenge");
      }
    } catch (error) {
      console.error("Failed to create challenge:", error);
      alert("An error occurred while creating the challenge. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-black">Create Challenge</h1>

      {!publicKey ? (
        <button
          type="button"
          onClick={() => connect()}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          Connect Wallet
        </button>
      ) : !playerData ? (
        <form onSubmit={handleTagSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-black">Player Tag</label>
            <input
              type="text"
              value={playerTag}
              onChange={(e) => setPlayerTag(e.target.value)}
              placeholder="#XXXXXX"
              className="w-full p-2 border rounded text-black"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors"
          >
            Fetch Player Data
          </button>
        </form>
      ) : (
        <form onSubmit={handleChallengeSubmit} className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <DeckSelector cards={playerData.cards} onSelect={setSelectedDeck} />
          </div>
          <div>
            <label className="block mb-2 text-black">Wager Amount (SOL)</label>
            <input
              type="number"
              value={wagerAmount}
              onChange={(e) => setWagerAmount(e.target.value)}
              min="0"
              step="0.1"
              className="w-full p-2 border rounded text-black"
              required
            />
          </div>
          <button
            type="submit"
            disabled={selectedDeck.length !== 8}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Create Challenge
          </button>
        </form>
      )}

      {shareableLink && (
        <div className="mt-4 bg-gray-100 p-4 rounded">
          <p className="text-black mb-2">Share this link with your opponent:</p>
          <input
            type="text"
            value={shareableLink}
            readOnly
            className="w-full p-2 border rounded text-black bg-gray-200"
          />
          <button
            onClick={() => navigator.clipboard.writeText(shareableLink)}
            className="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
          >
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
}