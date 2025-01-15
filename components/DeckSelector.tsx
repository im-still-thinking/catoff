"use client"

import { useState } from 'react';
import Image from 'next/image';
import { IoTrashBinSharp, IoSearchOutline } from "react-icons/io5";


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
    <div className="space-y-4 mt-10 max-sm:mt-0 w-full">
      <div className="flex w-full max-sm:flex-col items-center justify-between border-b-[1px] border-white/50 pb-4">
        <h3 className="text-lg max-sm:text-base font-semibold text-black font-supercell bg-white max-sm:py-1 max-sm:px-2 sm:px-5 sm:py-1 max-sm:rounded-t-lg sm:border-2 sm:rounded-lg  max-sm:border-x-2 max-sm:border-t-2 border-black">
          Select 8 Cards ({selectedCards.length}/8)
        </h3>
        <div className="relative max-sm:w-full">
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 outline-white max-sm:w-full bg-white/20 placeholder:text-white pr-3 py-2 pt-3 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-supercell text-sm"
          />
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold text-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardSelect(card)}
            disabled={selectedCards.length >= 8 && !selectedCards.some(selected => selected.id === card.id)}
            
            className={` group
              backdrop-blur-sm w-full h-full rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-sm shadow-black p-4 
              ${getRarityColor(card.rarity)}
              ${selectedCards.some(selected => selected.id === card.id)
                ? ' bg-white/40 hover:bg-white/30' 
                : 'hover:bg-white/10'}
              ${selectedCards.length >= 8 && !selectedCards.some(selected => selected.id === card.id)
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'}
            `}
          >
            <div className="w-full group-hover:scale-110 transition-all duration-300 aspect-square relative">
              <Image
                src={card.iconUrls.medium}
                alt={card.name}
                width={100}
                height={100}
                className="w-full h-full object-contain"
                priority={selectedCards.some(selected => selected.id === card.id)}
              />
              {/* {selectedCards.some(selected => selected.id === card.id) && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {selectedCards.findIndex(selected => selected.id === card.id) + 1}
                </div>
              )} */}
            </div>
            <div className="text-black font-medium text-sm text-center font-supercell">{card.name}</div>

          </button>
        ))}
      </div>

      {selectedCards.length > 0 && (
        <div className=" p-5 fixed bottom-0 left-0 right-0 w-screen h-fit">
          <div className=" bg-white/10 backdrop-blur-lg w-full h-full rounded-xl border-t-[1px] border-l-[1px] border-t-white/50 border-l-white/50 shadow-sm shadow-black p-4">
            <h4 className="font-medium font-supercell text-center mx-auto text-white max-sm:mb-3">Your Deck Selection:</h4>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {selectedCards.map((card) => (
                <div
                  key={card.id}
                  className="relative group"
                >
                  <Image
                    src={card.iconUrls.medium}
                    alt={card.name}
                    width={80}
                    height={80}
                    className="w-full aspect-square max-sm:scale-125 object-contain group-hover:scale-110 transition-all duration-300 "
                    priority
                  />
                  <button
                    onClick={() => handleCardSelect(card)}
                    className="absolute top-1/2 left-1/2 bg-red-800/50 shadow-sm shadow-black border-t-[1px] border-l-[1px] border-white/80 backdrop-blur-sm -translate-x-1/2 -translate-y-1/2 text-xl text-white w-12 h-12 rounded-full 
                            flex items-center justify-center opacity-0 group-hover:opacity-100 
                            transition-opacity"
                  >
                    <IoTrashBinSharp />
                  </button>
                  {/* <div className="absolute -top-2 -left-2 bg-blue-500 text-white w-6 h-6 rounded-full 
                                flex items-center justify-center text-sm">
                    {index + 1}
                  </div> */}
                </div>
              ))}
              {[...Array(8 - selectedCards.length)].map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className=""
                >
                  <Image
                    src={'/assets/notselected.png'}
                    alt={"not selected"}
                    width={80}
                    height={80}
                    className="w-full aspect-square max-sm:scale-125 object-contain hover:opacity-50 duration-200 "
                    priority
                  />
                </div>
              ))}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}