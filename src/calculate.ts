import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSchema, getAllGoals, getAllPlayers, getWeights, getGameCount } from './db.js';
import { aggregateStats, type Weights } from './weighting.js';
import { generateHtml, type RankedPlayer } from './html.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'output', 'rankings.html');

function main() {
  console.log('NHL Pistepörssi - Calculate Script');
  console.log('===================================\n');

  // Initialize DB (in case not run yet)
  initSchema();

  // Load data
  const goals = getAllGoals();
  const players = getAllPlayers();
  const weightsMap = getWeights();
  const gameCount = getGameCount();

  console.log(`Loaded ${goals.length} goals from ${gameCount} games`);
  console.log(`Loaded ${players.size} players\n`);

  if (goals.length === 0) {
    console.log('No goals in database. Run fetch.ts first.');
    return;
  }

  // Convert weights map to object
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

  console.log('Weights:', weights);
  console.log('');

  // Calculate stats
  const stats = aggregateStats(goals, weights, players);

  // Calculate totals and rank
  const ranked: RankedPlayer[] = stats.map(s => ({
    ...s,
    points: s.goals + s.assists,
    weighted_points: s.weighted_goals + s.weighted_assists,
    rank_traditional: 0,
    rank_weighted: 0,
    rank_change: 0,
    games_count: s.games.size,
  }));

  // Sort by traditional points for traditional rank
  ranked.sort((a, b) => b.points - a.points || b.goals - a.goals);
  ranked.forEach((p, i) => { p.rank_traditional = i + 1; });

  // Sort by weighted points for weighted rank
  ranked.sort((a, b) => b.weighted_points - a.weighted_points || b.weighted_goals - a.weighted_goals);
  ranked.forEach((p, i) => {
    p.rank_weighted = i + 1;
    p.rank_change = p.rank_traditional - p.rank_weighted;
  });

  // Generate HTML
  const html = generateHtml(ranked, weightsMap, gameCount);
  writeFileSync(OUTPUT_PATH, html);

  console.log(`Generated rankings for ${ranked.length} players`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  // Print top 10
  console.log('Top 10 by Weighted Points:');
  console.log('─'.repeat(70));
  console.log(`${'#'.padStart(3)} ${'Player'.padEnd(25)} ${'wP'.padStart(7)} ${'P'.padStart(5)} ${'Trad#'.padStart(6)} ${'Δ'.padStart(4)}`);
  console.log('─'.repeat(70));

  for (const p of ranked.slice(0, 10)) {
    const change = p.rank_change > 0 ? `+${p.rank_change}` : p.rank_change < 0 ? `${p.rank_change}` : '-';
    console.log(
      `${p.rank_weighted.toString().padStart(3)} ` +
      `${p.name.padEnd(25)} ` +
      `${p.weighted_points.toFixed(1).padStart(7)} ` +
      `${p.points.toString().padStart(5)} ` +
      `${p.rank_traditional.toString().padStart(6)} ` +
      `${change.padStart(4)}`
    );
  }

  console.log('\nDone!');
}

main();
