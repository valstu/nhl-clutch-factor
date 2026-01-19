import { Goal, Weights, Player, PlayerStats, GoalDetail } from './types';

function parseStrength(situation: string | null): 'pp' | 'sh' | 'ev' {
  if (!situation || situation.length !== 4) return 'ev';
  const awaySkaters = parseInt(situation[1], 10);
  const homeSkaters = parseInt(situation[2], 10);
  // Assume scorer is home for simplicity (we use scorerTeam to determine)
  if (homeSkaters > awaySkaters) return 'pp';
  if (homeSkaters < awaySkaters) return 'sh';
  return 'ev';
}

function getScoreDiffBefore(goal: Goal): number {
  // Determine if scorer is home team
  const isHome = goal.scorerTeam === goal.homeTeam;
  const homeBefore = goal.homeScore - (isHome ? 1 : 0);
  const awayBefore = goal.awayScore - (isHome ? 0 : 1);

  if (isHome) {
    return homeBefore - awayBefore;
  } else {
    return awayBefore - homeBefore;
  }
}

export function calculateGoalWeight(goal: Goal, weights: Weights): GoalDetail {
  const breakdown = {
    base: 1.0,
    situation: '',
    situationMultiplier: 1.0,
    strength: 'ev',
    strengthMultiplier: 1.0,
    periodBonus: 1.0,
    otBonus: 1.0,
    gwgBonus: 0,
  };

  // Empty net
  if (goal.emptyNet) {
    return {
      ...goal,
      weight: weights.empty_net,
      weightBreakdown: { ...breakdown, situation: 'Empty Net', situationMultiplier: weights.empty_net },
    };
  }

  let weight = 1.0;

  // Overtime
  if (goal.overtime) {
    weight *= weights.overtime;
    breakdown.otBonus = weights.overtime;
  }

  // Strength
  const strength = parseStrength(goal.situation);
  breakdown.strength = strength;
  if (strength === 'pp') {
    weight *= weights.strength_pp;
    breakdown.strengthMultiplier = weights.strength_pp;
  } else if (strength === 'sh') {
    weight *= weights.strength_sh;
    breakdown.strengthMultiplier = weights.strength_sh;
  } else {
    weight *= weights.strength_ev;
    breakdown.strengthMultiplier = weights.strength_ev;
  }

  // Score situation
  const diffBefore = getScoreDiffBefore(goal);

  if (diffBefore === 0) {
    weight *= weights.score_tie;
    breakdown.situation = 'Go-ahead (tied)';
    breakdown.situationMultiplier = weights.score_tie;
  } else if (diffBefore === -1) {
    weight *= weights.score_tie;
    breakdown.situation = 'Tying goal';
    breakdown.situationMultiplier = weights.score_tie;
  } else if (diffBefore === -2) {
    weight *= weights.score_lead_1;
    breakdown.situation = 'Comeback (-2 to -1)';
    breakdown.situationMultiplier = weights.score_lead_1;
  } else if (diffBefore <= -3) {
    weight *= weights.score_lead_3plus;
    breakdown.situation = 'Down 3+ (low impact)';
    breakdown.situationMultiplier = weights.score_lead_3plus;
  } else if (diffBefore === 1) {
    weight *= weights.score_lead_1;
    breakdown.situation = 'Insurance (+1 to +2)';
    breakdown.situationMultiplier = weights.score_lead_1;
  } else if (diffBefore === 2) {
    weight *= weights.score_lead_2;
    breakdown.situation = 'Comfortable (+2 to +3)';
    breakdown.situationMultiplier = weights.score_lead_2;
  } else {
    weight *= weights.score_lead_3plus;
    breakdown.situation = 'Garbage time (+3+)';
    breakdown.situationMultiplier = weights.score_lead_3plus;
  }

  // 3rd period bonus
  if (goal.period === 3) {
    weight *= weights.clutch_3rd;
    breakdown.periodBonus = weights.clutch_3rd;
  }

  // GWG bonus
  if (goal.gameWinner) {
    weight += weights.gwg_bonus;
    breakdown.gwgBonus = weights.gwg_bonus;
  }

  return {
    ...goal,
    weight,
    weightBreakdown: breakdown,
  };
}

export function calculateAllStats(
  goals: Goal[],
  players: Player[],
  weights: Weights
): PlayerStats[] {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const stats = new Map<number, {
    games: Set<number>;
    goals: number;
    assists: number;
    weightedGoals: number;
    weightedAssists: number;
  }>();

  const getOrCreate = (playerId: number) => {
    if (!stats.has(playerId)) {
      stats.set(playerId, {
        games: new Set(),
        goals: 0,
        assists: 0,
        weightedGoals: 0,
        weightedAssists: 0,
      });
    }
    return stats.get(playerId)!;
  };

  for (const goal of goals) {
    const detail = calculateGoalWeight(goal, weights);
    const assistWeight = detail.weight * 0.7;

    // Scorer
    const scorer = getOrCreate(goal.scorerId);
    scorer.games.add(goal.gameId);
    scorer.goals++;
    scorer.weightedGoals += detail.weight;

    // Primary assist
    if (goal.assist1Id) {
      const a1 = getOrCreate(goal.assist1Id);
      a1.games.add(goal.gameId);
      a1.assists++;
      a1.weightedAssists += assistWeight;
    }

    // Secondary assist
    if (goal.assist2Id) {
      const a2 = getOrCreate(goal.assist2Id);
      a2.games.add(goal.gameId);
      a2.assists++;
      a2.weightedAssists += assistWeight * 0.85;
    }
  }

  // Convert to array with rankings
  const result: PlayerStats[] = [];

  for (const [playerId, s] of stats) {
    const player = playerMap.get(playerId);
    if (!player) continue;

    result.push({
      playerId,
      name: player.name,
      team: player.team || '???',
      nationality: player.nationality || '???',
      games: s.games.size,
      goals: s.goals,
      assists: s.assists,
      points: s.goals + s.assists,
      weightedGoals: s.weightedGoals,
      weightedAssists: s.weightedAssists,
      weightedPoints: s.weightedGoals + s.weightedAssists,
      traditionalRank: 0,
      weightedRank: 0,
      rankChange: 0,
    });
  }

  // Traditional rank
  result.sort((a, b) => b.points - a.points || b.goals - a.goals);
  result.forEach((p, i) => { p.traditionalRank = i + 1; });

  // Weighted rank
  result.sort((a, b) => b.weightedPoints - a.weightedPoints || b.weightedGoals - a.weightedGoals);
  result.forEach((p, i) => {
    p.weightedRank = i + 1;
    p.rankChange = p.traditionalRank - p.weightedRank;
  });

  return result;
}

export function getPlayerGoals(goals: Goal[], playerId: number, weights: Weights): GoalDetail[] {
  return goals
    .filter(g => g.scorerId === playerId || g.assist1Id === playerId || g.assist2Id === playerId)
    .map(g => calculateGoalWeight(g, weights))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
