"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from "@/hooks/useWallet";
import { localAPIClient } from "@/adapters/xhr";
import DeckSelector from "@/components/DeckSelector";

interface AcceptChallengeFormProps {
  challenge: Challenge;
  token: string;
}

export default function AcceptChallengeForm({ challenge, token }: AcceptChallengeFormProps) {
  const [playerTag, setPlayerTag] = useState("");
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Card[]>([]);
  const router = useRouter();
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
    await fetchPlayerData(playerTag.trim());
  };

  const handleAccept = async () => {
    if (!challenge || !publicKey || selectedDeck.length !== 8) {
      alert("Complete all fields before accepting the challenge.");
      return;
    }

    try {
      const response = await localAPIClient.post(`/challenge/${challenge.id}/accept`, {
        playerTag: playerTag.trim(),
        deck: selectedDeck,
        publicKey: publicKey.toBase58(),
        token: token
      });

      if (response.status === 200) {
        router.push(`/challenge/${challenge.id}/status?token=${encodeURIComponent(response.data.token)}`);
      } else {
        alert("Failed to accept the challenge.");
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
    }
  };

  const handleDecline = async () => {
    if (!challenge || !token) return;

    try {
      const response = await localAPIClient.post(`/challenge/${challenge.id}/decline`, {
        token: token
      });

      if (response.status === 200) {
        router.push("/");
      } else {
        alert("Failed to decline the challenge.");
      }
    } catch (error) {
      console.error("Error declining challenge:", error);
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
        <form onSubmit={handleTagSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-black">Your Player Tag</label>
            <input
              type="text"
              value={playerTag}
              onChange={(e) => setPlayerTag(e.target.value)}
              className="w-full p-2 border rounded text-black"
              placeholder="#XXXXXX"
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
        <>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-black">Select Your Deck</h2>
            <DeckSelector 
              cards={playerData.cards}
              onSelect={setSelectedDeck}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAccept}
              className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={selectedDeck.length !== 8}
            >
              Accept Challenge
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
            >
              Decline Challenge
            </button>
          </div>
        </>
      )}
    </div>
  );
}