type Card = {
    name: string;
    id: number;
    level: number;
    maxLevel: number;
    maxEvolutionLevel?: number;
    rarity?: string;
    starLevel?: number;
    elixirCost: number;
    count: number;
    iconUrls: {
        evolutionMeidum?: string;
        medium: string;
    }
  };
  

type PlayerDTO = {
    tag: string | null;
    name: string | null;
    clan: string | null;
    trophies: number | null;
    arena: string | null;
    badges: string[] | null;
    achievements: string[] | null;
    cards: Card[];
    currentDeckSupportCards: string[] | null;
    currentFavouriteCard: string | null;
};

type ChallengeStatus = 'created' | 'accepted' | 'resolved' | 'declined';

// type PlayerDeck = {
//     cards: Card[];
//     verified: boolean;
// };

type Challenge = {
    id: Types.ObjectId | string,
    playerA: {
        tag: string,
        wallet: string,
        deck: Card[],
    },
    playerB?: {
        tag: string,
        wallet: string,
        deck: Card[],
    },
    wagerAmount: number,
    status: challengeStatus,
    winner?: Types.ObjectId | null,
    // proofData: string | null,
    createdAt: Date,
    updatedAt?: Date,
    expiresAt: Date,
    exp?: number
};

type CreateChallengeDTO = {
    playerA: {
        id: Types.ObjectId | string,
        deck: PlayerDeck,
    },
    playerB: null,
    wagerAmount: number,
    status: challengeStatus,
    winner: Types.ObjectId | null,
    proofData: string | null,
};

type ChallengeDTO = {
    playerA: {
        id: Types.ObjectId | string,
        deck: PlayerDeck,
    },
    playerB: {
        id: Types.ObjectId | string,
        deck: PlayerDeck,
    } | null,
    wagerAmount: number,
    status: challengeStatus,
    winner: Types.ObjectId | null,
    proofData: string | null,
    createdAt: Date,
    updatedAt: Date,
};
