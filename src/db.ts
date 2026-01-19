import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'nhl.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      game_id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      is_complete INTEGER DEFAULT 0,
      fetched_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      period INTEGER NOT NULL,
      time_in_period TEXT NOT NULL,
      situation_code TEXT,
      scorer_id INTEGER NOT NULL,
      assist1_id INTEGER,
      assist2_id INTEGER,
      home_score_after INTEGER NOT NULL,
      away_score_after INTEGER NOT NULL,
      is_empty_net INTEGER DEFAULT 0,
      is_game_winner INTEGER DEFAULT 0,
      is_overtime INTEGER DEFAULT 0,
      scorer_team TEXT,
      FOREIGN KEY (game_id) REFERENCES games(game_id),
      UNIQUE(game_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS players (
      player_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT,
      nationality TEXT
    );

    CREATE TABLE IF NOT EXISTS weights (
      key TEXT PRIMARY KEY,
      value REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_goals_game ON goals(game_id);
    CREATE INDEX IF NOT EXISTS idx_goals_scorer ON goals(scorer_id);
    CREATE INDEX IF NOT EXISTS idx_goals_assist1 ON goals(assist1_id);
    CREATE INDEX IF NOT EXISTS idx_goals_assist2 ON goals(assist2_id);
  `);

  // Insert default weights if not exist
  const defaultWeights: Record<string, number> = {
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

  const insertWeight = db.prepare(
    'INSERT OR IGNORE INTO weights (key, value) VALUES (?, ?)'
  );
  for (const [key, value] of Object.entries(defaultWeights)) {
    insertWeight.run(key, value);
  }
}

// Types
export interface Game {
  game_id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_complete: number;
  fetched_at: string | null;
}

export interface Goal {
  id: number;
  game_id: number;
  event_id: number;
  period: number;
  time_in_period: string;
  situation_code: string | null;
  scorer_id: number;
  assist1_id: number | null;
  assist2_id: number | null;
  home_score_after: number;
  away_score_after: number;
  is_empty_net: number;
  is_game_winner: number;
  is_overtime: number;
  scorer_team: string | null;
}

export interface Player {
  player_id: number;
  name: string;
  team: string | null;
  nationality: string | null;
}

// Queries
export function getCompletedGameIds(): Set<number> {
  const rows = db.prepare('SELECT game_id FROM games WHERE is_complete = 1').all() as { game_id: number }[];
  return new Set(rows.map(r => r.game_id));
}

export function insertGame(game: Omit<Game, 'fetched_at'> & { fetched_at?: string }) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO games (game_id, date, home_team, away_team, home_score, away_score, is_complete, fetched_at)
    VALUES (@game_id, @date, @home_team, @away_team, @home_score, @away_score, @is_complete, @fetched_at)
  `);
  stmt.run({ ...game, fetched_at: game.fetched_at ?? new Date().toISOString() });
}

export function insertGoal(goal: Omit<Goal, 'id'>) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO goals (game_id, event_id, period, time_in_period, situation_code, scorer_id, assist1_id, assist2_id, home_score_after, away_score_after, is_empty_net, is_game_winner, is_overtime, scorer_team)
    VALUES (@game_id, @event_id, @period, @time_in_period, @situation_code, @scorer_id, @assist1_id, @assist2_id, @home_score_after, @away_score_after, @is_empty_net, @is_game_winner, @is_overtime, @scorer_team)
  `);
  stmt.run(goal);
}

export function insertPlayer(player: Player) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO players (player_id, name, team, nationality)
    VALUES (@player_id, @name, @team, @nationality)
  `);
  stmt.run(player);
}

export function getPlayer(playerId: number): Player | undefined {
  return db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId) as Player | undefined;
}

export function getMissingPlayerIds(): number[] {
  const rows = db.prepare(`
    SELECT DISTINCT player_id FROM (
      SELECT scorer_id AS player_id FROM goals
      UNION SELECT assist1_id AS player_id FROM goals WHERE assist1_id IS NOT NULL
      UNION SELECT assist2_id AS player_id FROM goals WHERE assist2_id IS NOT NULL
    ) WHERE player_id NOT IN (SELECT player_id FROM players)
  `).all() as { player_id: number }[];
  return rows.map(r => r.player_id);
}

export function getAllGoals(): Goal[] {
  return db.prepare('SELECT * FROM goals').all() as Goal[];
}

export function getAllPlayers(): Map<number, Player> {
  const rows = db.prepare('SELECT * FROM players').all() as Player[];
  return new Map(rows.map(p => [p.player_id, p]));
}

export function getWeights(): Map<string, number> {
  const rows = db.prepare('SELECT key, value FROM weights').all() as { key: string; value: number }[];
  return new Map(rows.map(r => [r.key, r.value]));
}

export function getGameCount(): number {
  return (db.prepare('SELECT COUNT(*) as count FROM games WHERE is_complete = 1').get() as { count: number }).count;
}
