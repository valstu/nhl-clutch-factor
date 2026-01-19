import { db, initSchema, getAllGoals, getAllPlayers, getWeights } from './db.js';
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

// Rank all
ranked.sort((a, b) => b.points - a.points || b.goals - a.goals);
ranked.forEach((p, i) => { p.tradRank = i + 1; });
ranked.sort((a, b) => b.wP - a.wP || b.wG - a.wG);
ranked.forEach((p, i) => {
  p.wRank = i + 1;
  p.delta = p.tradRank! - p.wRank;
});

// Get Finnish players from database
const finnishPlayerIds = new Set(
  (db.prepare('SELECT player_id FROM players WHERE nationality = ?').all('FIN') as { player_id: number }[])
    .map(r => r.player_id)
);

const finnishNames = new Set(
  (db.prepare('SELECT name FROM players WHERE nationality = ?').all('FIN') as { name: string }[])
    .map(r => r.name)
);

const isFinnish = (name: string): boolean => finnishNames.has(name);

const finns = ranked.filter(p => isFinnish(p.name));

console.log('SUOMALAISET PELAAJAT - NHL Pistepörssi 2025-26');
console.log('═'.repeat(85));
console.log('wRank  Pelaaja                   Joukkue  G   A   P    wG    wA    wP  Trad   Δ');
console.log('─'.repeat(85));

for (const p of finns) {
  const delta = p.delta! > 0 ? '+' + p.delta : p.delta! < 0 ? '' + p.delta : '-';
  console.log(
    String(p.wRank).padStart(5) + '  ' +
    p.name.padEnd(24) + '  ' +
    (p.team || '???').padEnd(4) + '   ' +
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

console.log('─'.repeat(85));
console.log(`Yhteensä ${finns.length} suomalaista pisteillä`);
