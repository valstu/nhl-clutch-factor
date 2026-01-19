import { db, initSchema, insertPlayer } from './db.js';
import { getPlayer } from './nhl-api.js';

async function main() {
  initSchema();

  // Get all players without nationality
  const players = db.prepare(`
    SELECT player_id, name, team FROM players WHERE nationality IS NULL
  `).all() as { player_id: number; name: string; team: string | null }[];

  console.log(`Updating nationality for ${players.length} players...\n`);

  let updated = 0;
  for (const player of players) {
    updated++;
    process.stdout.write(`[${updated}/${players.length}] ${player.name}...`);

    const data = await getPlayer(player.player_id);
    if (data?.birthCountry) {
      insertPlayer({
        player_id: player.player_id,
        name: player.name,
        team: data.currentTeamAbbrev ?? player.team,
        nationality: data.birthCountry,
      });
      console.log(` ${data.birthCountry}`);
    } else {
      console.log(' ?');
    }

    await new Promise(r => setTimeout(r, 30));
  }

  // Show count by nationality
  console.log('\n\nPlayers by nationality:');
  const counts = db.prepare(`
    SELECT nationality, COUNT(*) as count
    FROM players
    WHERE nationality IS NOT NULL
    GROUP BY nationality
    ORDER BY count DESC
  `).all() as { nationality: string; count: number }[];

  for (const row of counts) {
    console.log(`  ${row.nationality}: ${row.count}`);
  }
}

main().catch(console.error);
