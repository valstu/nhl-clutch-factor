const BASE_URL = 'https://api-web.nhle.com/v1';

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 404) throw new Error(`Not found: ${url}`);
      if (res.status >= 500) throw new Error(`Server error: ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

export interface ScheduleGame {
  id: number;
  gameDate: string; // We'll add this when parsing
  gameState: string;
  homeTeam: { abbrev: string; score?: number };
  awayTeam: { abbrev: string; score?: number };
}

interface RawScheduleGame {
  id: number;
  gameState: string;
  homeTeam: { abbrev: string; score?: number };
  awayTeam: { abbrev: string; score?: number };
}

export interface ScheduleResponse {
  gameWeek: {
    date: string;
    games: RawScheduleGame[];
  }[];
}

export async function getSchedule(date: string): Promise<ScheduleGame[]> {
  const url = `${BASE_URL}/schedule/${date}`;
  const res = await fetchWithRetry(url);
  const data = await res.json() as ScheduleResponse;

  // Flatten and add date to each game
  const games: ScheduleGame[] = [];
  for (const week of data.gameWeek ?? []) {
    for (const game of week.games) {
      games.push({
        ...game,
        gameDate: week.date,
      });
    }
  }
  return games;
}

export interface PlayByPlayGoal {
  eventId: number;
  period: number;
  timeInPeriod: string;
  situationCode: string;
  scoringPlayerId: number;
  assist1PlayerId?: number;
  assist2PlayerId?: number;
  homeScore: number;
  awayScore: number;
  goalModifier?: string;
  scoringPlayerTotal: number;
}

export interface PlayByPlayEvent {
  eventId: number;
  typeDescKey: string;
  periodDescriptor: { number: number; periodType: string };
  timeInPeriod: string;
  situationCode: string;
  details?: {
    scoringPlayerId?: number;
    assist1PlayerId?: number;
    assist2PlayerId?: number;
    homeScore?: number;
    awayScore?: number;
    goalModifier?: string;
    eventOwnerTeamId?: number;
  };
}

export interface PlayByPlayResponse {
  id: number;
  homeTeam: { id: number; abbrev: string };
  awayTeam: { id: number; abbrev: string };
  plays: PlayByPlayEvent[];
}

export async function getPlayByPlay(gameId: number): Promise<PlayByPlayResponse> {
  const url = `${BASE_URL}/gamecenter/${gameId}/play-by-play`;
  const res = await fetchWithRetry(url);
  return res.json() as Promise<PlayByPlayResponse>;
}

export interface PlayerLanding {
  playerId: number;
  firstName: { default: string };
  lastName: { default: string };
  currentTeamAbbrev?: string;
  birthCountry?: string;
}

export async function getPlayer(playerId: number): Promise<PlayerLanding | null> {
  try {
    const url = `${BASE_URL}/player/${playerId}/landing`;
    const res = await fetchWithRetry(url);
    return res.json() as Promise<PlayerLanding>;
  } catch {
    console.log(`  Could not fetch player ${playerId}`);
    return null;
  }
}

// Parse goals from play-by-play
export function parseGoals(pbp: PlayByPlayResponse): Array<{
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
  is_overtime: number;
  scorer_team: string;
}> {
  const goals: ReturnType<typeof parseGoals> = [];

  for (const play of pbp.plays) {
    if (play.typeDescKey !== 'goal') continue;
    if (!play.details?.scoringPlayerId) continue;

    // Skip shootout goals - they don't count in stats
    if (play.periodDescriptor.periodType === 'SO') continue;

    const isOT = play.periodDescriptor.periodType === 'OT' || play.periodDescriptor.number > 3;
    const isEmptyNet = play.details.goalModifier === 'empty-net';

    // Determine scorer's team
    let scorerTeam = '';
    if (play.details.eventOwnerTeamId === pbp.homeTeam.id) {
      scorerTeam = pbp.homeTeam.abbrev;
    } else if (play.details.eventOwnerTeamId === pbp.awayTeam.id) {
      scorerTeam = pbp.awayTeam.abbrev;
    }

    goals.push({
      event_id: play.eventId,
      period: play.periodDescriptor.number,
      time_in_period: play.timeInPeriod,
      situation_code: play.situationCode || null,
      scorer_id: play.details.scoringPlayerId,
      assist1_id: play.details.assist1PlayerId || null,
      assist2_id: play.details.assist2PlayerId || null,
      home_score_after: play.details.homeScore ?? 0,
      away_score_after: play.details.awayScore ?? 0,
      is_empty_net: isEmptyNet ? 1 : 0,
      is_overtime: isOT ? 1 : 0,
      scorer_team: scorerTeam,
    });
  }

  return goals;
}
