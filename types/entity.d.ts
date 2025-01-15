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
    };
};

type Player = {
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

type Battle = {
    type: string;
    battleTime: string,
    isLadderTournament: boolean,
    arena: {
        id: number,
        name: string
    };
    gameMode: {
        id: number,
        name: string,
    };
    deckSelection: string,
    team: [
        
    ]
}

type ChallengeStatus = "created" | "accepted" | "resolved" | "declined";

type jwtStatus = "valid" | "invalid"

type Challenge = {
    id: Types.ObjectId | string;
    jwtStatus: jwtStatus
    playerA: {
        tag: string;
        wallet: string;
        deck: Card[];
    };
    playerB?: {
        tag: string;
        wallet: string;
        deck: Card[];
    };
    wagerAmount: number;
    status: challengeStatus;
    winner?: Types.ObjectId | null;
    // proofData: string | null,
    createdAt: Date;
    updatedAt?: Date;
    expiresAt: Date;
    exp?: number;
};

type DeckSelectorProps = {
    cards: Card[];
    onSelect: (deck: Card[]) => void;
};

type CreateChallengeRequest = {
    playerTag: string;
    deck: Card[];
    wagerAmount: number;
    publicKey: string;
};
