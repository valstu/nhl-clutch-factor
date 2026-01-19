import { initSchema, getAllGoals, getAllPlayers, getWeights } from './db.js';
import { aggregateStats, type Weights } from './weighting.js';

initSchema();
const goals = getAllGoals();
const players = getAllPlayers();
const weightsMap = getWeights();

const weights: Weights = {
  score_tie: weightsMap.get('score_tie') ?? 1.5,
  score_lead_1: weightsMap.get('score_lead_1') ?? 1.3,
  score_lead_2: weightsMap.get('score_lead_2') ?? 0.7,
  score_lead_3plus: weightsMap.get('score_lead_3plus') ?? 0.5,
  strength_sh: weightsMap.get('strength_sh') ?? 1.5,
  strength_ev: weightsMap.get('strength_ev') ?? 1.0,
  strength_pp: weightsMap.get('strength_pp') ?? 0.8,
  empty_net: weightsMap.get('empty_net') ?? 0.3,
  overtime: weightsMap.get('overtime') ?? 1.5,
  gwg_bonus: weightsMap.get('gwg_bonus') ?? 0.3,
  clutch_3rd: weightsMap.get('clutch_3rd') ?? 1.2,
};

const stats = aggregateStats(goals, weights, players);

interface RankedPlayer {
  name: string;
  team: string;
  goals: number;
  assists: number;
  points: number;
  wG: number;
  wA: number;
  wP: number;
  tradRank?: number;
  wRank?: number;
  delta?: number;
}

const ranked: RankedPlayer[] = stats.map(s => ({
  name: s.name,
  team: s.team,
  goals: s.goals,
  assists: s.assists,
  points: s.goals + s.assists,
  wG: s.weighted_goals,
  wA: s.weighted_assists,
  wP: s.weighted_goals + s.weighted_assists,
}));

// Traditional rank
ranked.sort((a, b) => b.points - a.points || b.goals - a.goals);
ranked.forEach((p, i) => { p.tradRank = i + 1; });

// Weighted rank
ranked.sort((a, b) => b.wP - a.wP || b.wG - a.wG);
ranked.forEach((p, i) => {
  p.wRank = i + 1;
  p.delta = p.tradRank! - p.wRank;
});

console.log('Top 30 by Weighted Points:');
console.log('─'.repeat(85));
console.log('wRank  Player                    Team   G   A   P    wG    wA    wP  Trad   Δ');
console.log('─'.repeat(85));

for (const p of ranked.slice(0, 30)) {
  const delta = p.delta! > 0 ? '+' + p.delta : p.delta! < 0 ? '' + p.delta : '-';
  console.log(
    String(p.wRank).padStart(5) + '  ' +
    p.name.padEnd(24) + '  ' +
    (p.team || '???').padEnd(4) + ' ' +
    String(p.goals).padStart(3) + ' ' +
    String(p.assists).padStart(3) + ' ' +
    String(p.points).padStart(3) + '  ' +
    p.wG.toFixed(1).padStart(5) + ' ' +
    p.wA.toFixed(1).padStart(5) + ' ' +
    p.wP.toFixed(1).padStart(5) + '  ' +
    String(p.tradRank).padStart(4) + ' ' +
    delta.padStart(4)
  );
}

console.log('\n\nBiggest RISERS (clutch players - top 50 traditional):');
console.log('─'.repeat(65));
const top50 = ranked.filter(p => p.tradRank! <= 50);
const risers = [...top50].sort((a, b) => b.delta! - a.delta!).slice(0, 12);
for (const p of risers) {
  console.log(
    '  +' + String(p.delta).padStart(2) + '  ' +
    p.name.padEnd(22) +
    ' (Trad #' + p.tradRank + ' → wP #' + p.wRank + ')  ' +
    p.points + 'P → ' + p.wP.toFixed(1) + 'wP'
  );
}

console.log('\nBiggest FALLERS (garbage time scorers - top 50 traditional):');
console.log('─'.repeat(65));
const fallers = [...top50].sort((a, b) => a.delta! - b.delta!).slice(0, 12);
for (const p of fallers) {
  console.log(
    '  ' + String(p.delta).padStart(3) + '  ' +
    p.name.padEnd(22) +
    ' (Trad #' + p.tradRank + ' → wP #' + p.wRank + ')  ' +
    p.points + 'P → ' + p.wP.toFixed(1) + 'wP'
  );
}
