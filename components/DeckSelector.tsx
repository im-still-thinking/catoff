"use client"

import { useState } from 'react';
import Image from 'next/image';

export default function DeckSelector({ cards, onSelect }: DeckSelectorProps) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCardSelect = (card: Card) => {
    if (selectedCards.some(selected => selected.id === card.id)) {
      const newDeck = selectedCards.filter(selected => selected.id !== card.id);
      setSelectedCards(newDeck);
      onSelect(newDeck);
    } else if (selectedCards.length < 8) {
      const newDeck = [...selectedCards, card];
      setSelectedCards(newDeck);
      onSelect(newDeck);
    }
  };

  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'border-gray-400';
      case 'rare': return 'border-blue-400';
      case 'epic': return 'border-purple-400';
      case 'legendary': return 'border-yellow-400';
      default: return 'border-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">
          Select 8 Cards ({selectedCards.length}/8)
        </h3>
        <input
          type="text"
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1 border rounded text-black"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardSelect(card)}
            disabled={selectedCards.length >= 8 && !selectedCards.some(selected => selected.id === card.id)}
            className={`
              p-3 border-2 rounded-lg transition-all flex flex-col items-center
              ${getRarityColor(card.rarity)}
              ${selectedCards.some(selected => selected.id === card.id)
                ? 'bg-blue-100 border-blue-500' 
                : 'hover:bg-gray-50'}
              ${selectedCards.length >= 8 && !selectedCards.some(selected => selected.id === card.id)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'}
            `}
          >
            <div className="w-full aspect-square mb-2 relative">
              <Image
                src={card.iconUrls.medium}
                alt={card.name}
                width={100}
                height={100}
                className="w-full h-full object-contain"
                priority={selectedCards.some(selected => selected.id === card.id)}
              />
              {selectedCards.some(selected => selected.id === card.id) && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {selectedCards.findIndex(selected => selected.id === card.id) + 1}
                </div>
              )}
            </div>
            <div className="text-black font-medium text-sm text-center">{card.name}</div>
            <div className="text-xs text-gray-600">
              Level {card.level}/{card.maxLevel}
            </div>
          </button>
        ))}
      </div>

      {selectedCards.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-black mb-3">Selected Deck:</h4>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {selectedCards.map((card, index) => (
              <div
                key={card.id}
                className="relative group"
              >
                <Image
                  src={card.iconUrls.medium}
                  alt={card.name}
                  width={80}
                  height={80}
                  className="w-full aspect-square object-contain rounded border-2 border-blue-500"
                  priority
                />
                <button
                  onClick={() => handleCardSelect(card)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full 
                           flex items-center justify-center opacity-0 group-hover:opacity-100 
                           transition-opacity"
                >
                  ×
                </button>
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white w-6 h-6 rounded-full 
                              flex items-center justify-center text-sm">
                  {index + 1}
                </div>
              </div>
            ))}
            {[...Array(8 - selectedCards.length)].map((_, index) => (
              <div
                key={`empty-${index}`}
                className="border-2 border-dashed border-gray-300 rounded aspect-square"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}