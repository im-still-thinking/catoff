/* eslint-disable @typescript-eslint/no-explicit-any */

type ChallengeStatus = "created" | "accepted" | "resolved" | "declined";

type Challenge = {
    id: Types.ObjectId | string;
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
    escrowPubkey: string;
    // proofData: string | null,
    createdAt: Date;
    updatedAt?: Date;
    expiresAt: Date;
    exp?: number;
};

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
    battleTime: string;
    isLadderTournament: boolean;
    arena: {
        id: number;
        name: string;
    };
    gameMode: {
        id: number;
        name: string;
    };
    deckSelection: string;
    team: [];
};


type DeckSelectorProps = {
    cards: Card[];
    onSelect: (deck: Card[]) => void;
};

type AcceptChallengeFormProps = {
    challenge: Challenge;
    token: string;
};

type ChallengeRequestValidation = {
    challengeId: string;
    playerTag: string;
    deck: Card[];
    wagerAmount: number;
    publicKey: string;
    escrowPubkey: string;
}

type ChallengeTransactionLog = {
    timestamp: string;
    escrowAddress: string;
    transactionHash: string;
    status: "pending" | "confirmed" | "failed";
    blockHeight?: number;
    slot?: number;
    error?: string;
    message?: string;
};

type ChallengeTransactionResult = {
    success: boolean;
    signature: string;
    logs: TransactionLog[];
    error?: {
        code: string;
        message: string;
        details?: any;
    };
};