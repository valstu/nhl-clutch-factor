import { db, initSchema, getCompletedGameIds, insertGame, insertGoal, insertPlayer, getMissingPlayerIds, getPlayer as getPlayerFromDb } from './db.js';
import { getSchedule, getPlayByPlay, getPlayer, parseGoals, type ScheduleGame } from './nhl-api.js';

// Current NHL season (2025-26)
const SEASON_START = '2025-10-04';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

async function fetchAllSchedules(): Promise<ScheduleGame[]> {
  const today = formatDate(new Date());
  const allGames: ScheduleGame[] = [];
  let currentDate = SEASON_START;

  console.log(`Fetching schedules from ${SEASON_START} to ${today}...`);

  while (currentDate <= today) {
    try {
      const games = await getSchedule(currentDate);
      allGames.push(...games);
      // Schedule endpoint returns a week, so jump ahead
      currentDate = addDays(currentDate, 7);
    } catch (err) {
      console.error(`Error fetching schedule for ${currentDate}:`, err);
      currentDate = addDays(currentDate, 1);
    }
  }

  // Dedupe by game ID
  const seen = new Set<number>();
  return allGames.filter(g => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

async function main() {
  console.log('NHL Pistepörssi - Fetch Script');
  console.log('==============================\n');

  // Initialize database
  initSchema();
  console.log('Database initialized.\n');

  // Get already processed games
  const existingGameIds = getCompletedGameIds();
  console.log(`Found ${existingGameIds.size} games already in database.\n`);

  // Fetch schedules
  const allGames = await fetchAllSchedules();
  console.log(`\nFound ${allGames.length} total games in schedule.\n`);

  // Filter to completed regular season/playoff games not in DB
  // Game IDs: 2025020xxx = regular season, 2025030xxx = playoffs
  // Skip preseason (2025010xxx)
  const completedGames = allGames.filter(g => {
    const gameIdStr = g.id.toString();
    const isRegularOrPlayoff = gameIdStr.startsWith('202502') || gameIdStr.startsWith('202503');
    const isComplete = g.gameState === 'OFF' || g.gameState === 'FINAL';
    return isRegularOrPlayoff && isComplete && !existingGameIds.has(g.id);
  });

  console.log(`${completedGames.length} new completed games to fetch.\n`);

  if (completedGames.length === 0) {
    console.log('No new games to process.');
    await fetchMissingPlayers();
    return;
  }

  // Process each game
  let processed = 0;
  for (const game of completedGames) {
    processed++;
    console.log(`[${processed}/${completedGames.length}] Game ${game.id}: ${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev} (${game.gameDate})`);

    try {
      // Fetch play-by-play
      const pbp = await getPlayByPlay(game.id);

      // Insert game
      insertGame({
        game_id: game.id,
        date: game.gameDate,
        home_team: game.homeTeam.abbrev,
        away_team: game.awayTeam.abbrev,
        home_score: game.homeTeam.score ?? 0,
        away_score: game.awayTeam.score ?? 0,
        is_complete: 1,
      });

      // Parse and insert goals
      const goals = parseGoals(pbp);

      // Determine game winner goal
      const homeWon = (game.homeTeam.score ?? 0) > (game.awayTeam.score ?? 0);
      const winningScore = homeWon ? game.homeTeam.score : game.awayTeam.score;
      const losingScore = homeWon ? game.awayTeam.score : game.homeTeam.score;

      for (const goal of goals) {
        // Check if this is the game-winning goal
        const isGWG = homeWon
          ? goal.home_score_after === losingScore! + 1 && goal.home_score_after <= winningScore!
          : goal.away_score_after === losingScore! + 1 && goal.away_score_after <= winningScore!;

        insertGoal({
          game_id: game.id,
          event_id: goal.event_id,
          period: goal.period,
          time_in_period: goal.time_in_period,
          situation_code: goal.situation_code,
          scorer_id: goal.scorer_id,
          assist1_id: goal.assist1_id,
          assist2_id: goal.assist2_id,
          home_score_after: goal.home_score_after,
          away_score_after: goal.away_score_after,
          is_empty_net: goal.is_empty_net,
          is_game_winner: isGWG ? 1 : 0,
          is_overtime: goal.is_overtime,
          scorer_team: goal.scorer_team,
        });
      }

      console.log(`  -> ${goals.length} goals inserted`);

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`  ERROR processing game ${game.id}:`, err);
    }
  }

  // Fetch missing player info
  await fetchMissingPlayers();

  console.log('\nDone!');
}

async function fetchMissingPlayers() {
  const missingIds = getMissingPlayerIds();
  if (missingIds.length === 0) {
    console.log('\nAll player info up to date.');
    return;
  }

  console.log(`\nFetching info for ${missingIds.length} missing players...`);

  let fetched = 0;
  for (const playerId of missingIds) {
    fetched++;
    process.stdout.write(`  [${fetched}/${missingIds.length}] Player ${playerId}...`);

    const playerData = await getPlayer(playerId);
    if (playerData) {
      insertPlayer({
        player_id: playerId,
        name: `${playerData.firstName.default} ${playerData.lastName.default}`,
        team: playerData.currentTeamAbbrev ?? null,
        nationality: playerData.birthCountry ?? null,
      });
      console.log(` ${playerData.firstName.default} ${playerData.lastName.default} (${playerData.birthCountry ?? '?'})`);
    } else {
      // Insert placeholder
      insertPlayer({
        player_id: playerId,
        name: `Unknown (${playerId})`,
        team: null,
        nationality: null,
      });
      console.log(' (unknown)');
    }

    await new Promise(r => setTimeout(r, 50));
  }
}

main().catch(console.error);
