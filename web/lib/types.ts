export interface Player {
  id: number;
  name: string;
  team: string | null;
  nationality: string | null;
}

export interface Goal {
  id: number;
  gameId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  period: number;
  time: string;
  situation: string | null;
  scorerId: number;
  assist1Id: number | null;
  assist2Id: number | null;
  homeScore: number;
  awayScore: number;
  emptyNet: boolean;
  gameWinner: boolean;
  overtime: boolean;
  scorerTeam: string | null;
}

export interface Weights {
  score_tie: number;
  score_lead_1: number;
  score_lead_2: number;
  score_lead_3plus: number;
  strength_sh: number;
  strength_ev: number;
  strength_pp: number;
  empty_net: number;
  overtime: number;
  gwg_bonus: number;
  clutch_3rd: number;
}

export interface NHLData {
  meta: {
    exportedAt: string;
    gameCount: number;
    goalCount: number;
    playerCount: number;
  };
  weights: Weights;
  players: Player[];
  goals: Goal[];
}

export interface PlayerStats {
  playerId: number;
  name: string;
  team: string;
  nationality: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
  weightedGoals: number;
  weightedAssists: number;
  weightedPoints: number;
  traditionalRank: number;
  weightedRank: number;
  rankChange: number;
}

export interface GoalDetail extends Goal {
  weight: number;
  weightBreakdown: {
    base: number;
    situation: string;
    situationMultiplier: number;
    strength: string;
    strengthMultiplier: number;
    periodBonus: number;
    otBonus: number;
    gwgBonus: number;
  };
}

export const DEFAULT_WEIGHTS: Weights = {
  score_tie: 1.5,
  score_lead_1: 1.3,
  score_lead_2: 0.7,
  score_lead_3plus: 0.5,
  strength_sh: 1.5,
  strength_ev: 1.0,
  strength_pp: 0.8,
  empty_net: 0.3,
  overtime: 1.5,
  gwg_bonus: 0.3,
  clutch_3rd: 1.2,
};
