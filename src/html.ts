import type { PlayerStats } from './weighting.js';

export interface RankedPlayer extends PlayerStats {
  points: number;
  weighted_points: number;
  rank_traditional: number;
  rank_weighted: number;
  rank_change: number;
  games_count: number;
}

export function generateHtml(players: RankedPlayer[], weights: Map<string, number>, gameCount: number): string {
  const timestamp = new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });

  const weightsTable = Array.from(weights.entries())
    .map(([key, val]) => `<tr><td>${key}</td><td>${val}</td></tr>`)
    .join('\n');

  const playerRows = players
    .slice(0, 100) // Top 100
    .map((p, i) => {
      const rankChange = p.rank_change;
      const changeClass = rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : '';
      const changeText = rankChange > 0 ? `+${rankChange}` : rankChange < 0 ? `${rankChange}` : '-';

      return `
        <tr>
          <td class="rank">${p.rank_weighted}</td>
          <td class="change ${changeClass}">${changeText}</td>
          <td class="player">${p.name}</td>
          <td class="team">${p.team}</td>
          <td class="num">${p.games_count}</td>
          <td class="num">${p.goals}</td>
          <td class="num">${p.assists}</td>
          <td class="num">${p.points}</td>
          <td class="num weighted">${p.weighted_goals.toFixed(1)}</td>
          <td class="num weighted">${p.weighted_assists.toFixed(1)}</td>
          <td class="num weighted total">${p.weighted_points.toFixed(1)}</td>
          <td class="num trad-rank">${p.rank_traditional}</td>
        </tr>
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NHL Pistepörssi - Weighted Rankings</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --surface: #16213e;
      --primary: #e94560;
      --text: #eaeaea;
      --muted: #8b8b8b;
      --up: #00d26a;
      --down: #ff4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: var(--primary);
    }
    .subtitle {
      color: var(--muted);
      margin-bottom: 2rem;
    }
    .stats-bar {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
      color: var(--muted);
      font-size: 0.9rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
    }
    th {
      background: rgba(233, 69, 96, 0.1);
      color: var(--primary);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) { background: rgba(255,255,255,0.02); }
    tr:hover { background: rgba(233, 69, 96, 0.05); }
    .rank { font-weight: 700; color: var(--primary); width: 50px; }
    .change { width: 50px; font-weight: 600; }
    .change.up { color: var(--up); }
    .change.down { color: var(--down); }
    .player { font-weight: 500; }
    .team { color: var(--muted); width: 60px; }
    .num { text-align: right; width: 60px; }
    .weighted { color: #ffd700; }
    .total { font-weight: 700; font-size: 1.1rem; }
    .trad-rank { color: var(--muted); }

    .weights-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--surface);
      border-radius: 8px;
    }
    .weights-section h2 {
      font-size: 1rem;
      color: var(--primary);
      margin-bottom: 1rem;
    }
    .weights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.5rem;
    }
    .weight-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: rgba(255,255,255,0.03);
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .weight-key { color: var(--muted); }
    .weight-val { color: #ffd700; font-weight: 600; }

    @media (max-width: 768px) {
      body { padding: 1rem; }
      th, td { padding: 0.5rem; font-size: 0.8rem; }
      .num { width: auto; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NHL Pistepörssi</h1>
    <p class="subtitle">Weighted Point Rankings - 2025-26 Season</p>

    <div class="stats-bar">
      <span>Games: ${gameCount}</span>
      <span>Updated: ${timestamp}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>+/-</th>
          <th>Player</th>
          <th>Team</th>
          <th>GP</th>
          <th>G</th>
          <th>A</th>
          <th>P</th>
          <th>wG</th>
          <th>wA</th>
          <th>wP</th>
          <th>Trad#</th>
        </tr>
      </thead>
      <tbody>
        ${playerRows}
      </tbody>
    </table>

    <div class="weights-section">
      <h2>Current Weights</h2>
      <div class="weights-grid">
        ${Array.from(weights.entries()).map(([k, v]) => `
          <div class="weight-item">
            <span class="weight-key">${k}</span>
            <span class="weight-val">${v}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;
}
