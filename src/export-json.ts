import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db, initSchema, getAllGoals, getAllPlayers, getWeights, getGameCount } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

initSchema();

// Get all data
const goals = getAllGoals();
const players = getAllPlayers();
const weights = Object.fromEntries(getWeights());
const gameCount = getGameCount();

// Get games for date lookup
const games = db.prepare('SELECT game_id, date, home_team, away_team FROM games').all() as {
  game_id: number;
  date: string;
  home_team: string;
  away_team: string;
}[];

const gamesMap = Object.fromEntries(games.map(g => [g.game_id, g]));

// Export format
const exportData = {
  meta: {
    exportedAt: new Date().toISOString(),
    gameCount,
    goalCount: goals.length,
    playerCount: players.size,
  },
  weights,
  players: Array.from(players.values()).map(p => ({
    id: p.player_id,
    name: p.name,
    team: p.team,
    nationality: p.nationality,
  })),
  goals: goals.map(g => {
    const game = gamesMap[g.game_id];
    return {
      id: g.id,
      gameId: g.game_id,
      date: game?.date,
      homeTeam: game?.home_team,
      awayTeam: game?.away_team,
      period: g.period,
      time: g.time_in_period,
      situation: g.situation_code,
      scorerId: g.scorer_id,
      assist1Id: g.assist1_id,
      assist2Id: g.assist2_id,
      homeScore: g.home_score_after,
      awayScore: g.away_score_after,
      emptyNet: g.is_empty_net === 1,
      gameWinner: g.is_game_winner === 1,
      overtime: g.is_overtime === 1,
      scorerTeam: g.scorer_team,
    };
  }),
};

const outputPath = join(__dirname, '..', 'web', 'public', 'data.json');
writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`Exported to ${outputPath}`);
console.log(`  ${exportData.meta.gameCount} games`);
console.log(`  ${exportData.meta.goalCount} goals`);
console.log(`  ${exportData.meta.playerCount} players`);
