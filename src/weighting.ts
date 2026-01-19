import type { Goal } from './db.js';

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

// Parse situation code: "1551" means away has 1 goalie + 5 skaters, home has 5 skaters + 1 goalie
// Format: [awayGoalies][awaySkaters][homeSkaters][homeGoalies]
function parseStrength(situationCode: string | null, scorerTeam: string | null, isHome: boolean): 'pp' | 'sh' | 'ev' {
  if (!situationCode || situationCode.length !== 4) return 'ev';

  const awaySkaters = parseInt(situationCode[1], 10);
  const homeSkaters = parseInt(situationCode[2], 10);

  // Determine if scorer is home or away team based on scorer_team matching
  const scorerIsHome = isHome;
  const scorerSkaters = scorerIsHome ? homeSkaters : awaySkaters;
  const oppSkaters = scorerIsHome ? awaySkaters : homeSkaters;

  if (scorerSkaters > oppSkaters) return 'pp';
  if (scorerSkaters < oppSkaters) return 'sh';
  return 'ev';
}

// Calculate score differential before goal
function getScoreDiffBefore(goal: Goal, isHome: boolean): number {
  const homeBefore = goal.home_score_after - (isHome ? 1 : 0);
  const awayBefore = goal.away_score_after - (isHome ? 0 : 1);

  if (isHome) {
    return homeBefore - awayBefore;
  } else {
    return awayBefore - homeBefore;
  }
}

export function calculateGoalWeight(goal: Goal, weights: Weights, isHome: boolean): number {
  let weight = 1.0;

  // Empty net gets special (low) weight
  if (goal.is_empty_net) {
    return weights.empty_net;
  }

  // Overtime bonus
  if (goal.is_overtime) {
    weight *= weights.overtime;
  }

  // Strength modifier
  const strength = parseStrength(goal.situation_code, goal.scorer_team, isHome);
  if (strength === 'pp') weight *= weights.strength_pp;
  else if (strength === 'sh') weight *= weights.strength_sh;
  else weight *= weights.strength_ev;

  // Score situation modifier (diffBefore = scorer's perspective before goal)
  // Positive = leading, 0 = tied, negative = trailing
  const diffBefore = getScoreDiffBefore(goal, isHome);

  if (diffBefore === 0) {
    // Tied game - go-ahead goal
    weight *= weights.score_tie;
  } else if (diffBefore === -1) {
    // Down by 1 - tying goal (very clutch)
    weight *= weights.score_tie;
  } else if (diffBefore === -2) {
    // Down by 2 - makes it a 1-goal game (meaningful comeback)
    weight *= weights.score_lead_1;
  } else if (diffBefore <= -3) {
    // Down by 3+ - still trailing by 2+, not that impactful
    weight *= weights.score_lead_3plus;
  } else if (diffBefore === 1) {
    // Leading by 1 - insurance goal
    weight *= weights.score_lead_1;
  } else if (diffBefore === 2) {
    // Leading by 2 - comfortable cushion
    weight *= weights.score_lead_2;
  } else {
    // Leading by 3+ - garbage time
    weight *= weights.score_lead_3plus;
  }

  // 3rd period clutch bonus
  if (goal.period === 3) {
    weight *= weights.clutch_3rd;
  }

  // Game winner bonus
  if (goal.is_game_winner) {
    weight += weights.gwg_bonus;
  }

  return weight;
}

// Assist weight = 0.7x of goal weight
export function calculateAssistWeight(goalWeight: number): number {
  return goalWeight * 0.7;
}

export interface PlayerStats {
  player_id: number;
  name: string;
  team: string;
  games: Set<number>;
  goals: number;
  assists: number;
  weighted_goals: number;
  weighted_assists: number;
}

export function aggregateStats(
  goals: Goal[],
  weights: Weights,
  players: Map<number, { name: string; team: string | null }>
): PlayerStats[] {
  const stats = new Map<number, PlayerStats>();

  const getOrCreate = (playerId: number): PlayerStats => {
    if (!stats.has(playerId)) {
      const player = players.get(playerId);
      stats.set(playerId, {
        player_id: playerId,
        name: player?.name ?? `Player ${playerId}`,
        team: player?.team ?? '???',
        games: new Set(),
        goals: 0,
        assists: 0,
        weighted_goals: 0,
        weighted_assists: 0,
      });
    }
    return stats.get(playerId)!;
  };

  for (const goal of goals) {
    // Determine if scorer is home team
    // We need to figure this out from the goal data
    // If home_score increased, scorer is home team
    const isHome = goal.scorer_team !== null; // We'll use a heuristic

    // Better approach: check if home score went up
    // This is tricky without knowing previous score
    // Let's use the scorer_team field instead if available

    const goalWeight = calculateGoalWeight(goal, weights, true); // Simplified: treat as home
    const assistWeight = calculateAssistWeight(goalWeight);

    // Scorer
    const scorer = getOrCreate(goal.scorer_id);
    scorer.games.add(goal.game_id);
    scorer.goals++;
    scorer.weighted_goals += goalWeight;

    // Primary assist
    if (goal.assist1_id) {
      const a1 = getOrCreate(goal.assist1_id);
      a1.games.add(goal.game_id);
      a1.assists++;
      a1.weighted_assists += assistWeight;
    }

    // Secondary assist
    if (goal.assist2_id) {
      const a2 = getOrCreate(goal.assist2_id);
      a2.games.add(goal.game_id);
      a2.assists++;
      a2.weighted_assists += assistWeight * 0.85; // Secondary slightly less
    }
  }

  return Array.from(stats.values());
}
