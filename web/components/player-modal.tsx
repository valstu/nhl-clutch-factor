'use client';

import { useMemo } from 'react';
import { PlayerStats, Goal, Weights } from '@/lib/types';
import { getPlayerGoals, calculateGoalWeight } from '@/lib/weighting';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Props {
  player: PlayerStats;
  goals: Goal[];
  weights: Weights;
  onClose: () => void;
}

const SITUATION_COLORS: Record<string, string> = {
  'Go-ahead (tied)': '#22c55e',      // green - clutch
  'Tying goal': '#10b981',           // emerald - very clutch
  'Comeback (-2 to -1)': '#3b82f6',  // blue - good
  'Insurance (+1 to +2)': '#eab308', // yellow - solid
  'Comfortable (+2 to +3)': '#f97316', // orange - meh
  'Down 3+ (low impact)': '#8b5cf6', // purple - trailing big
  'Garbage time (+3+)': '#ef4444',   // red - garbage
  'Empty Net': '#6b7280',            // gray
};

const STRENGTH_LABELS: Record<string, string> = {
  'ev': 'Even Strength',
  'pp': 'Power Play',
  'sh': 'Shorthanded',
};

const STRENGTH_COLORS: Record<string, string> = {
  'Even Strength': '#d4a843',
  'Power Play': '#3b82f6',
  'Shorthanded': '#22c55e',
};

const SPECIAL_LABELS: Record<string, string> = {
  'GWG': 'Game Winner',
  'OT': 'Overtime',
  'EN': 'Empty Net',
  'REG': 'Regular',
};

export function PlayerModal({ player, goals, weights, onClose }: Props) {
  const playerGoals = getPlayerGoals(goals, player.playerId, weights);

  // Separate goals and assists
  const scoredGoals = playerGoals.filter(g => g.scorerId === player.playerId);
  const assists = playerGoals.filter(g =>
    g.assist1Id === player.playerId || g.assist2Id === player.playerId
  );

  // Calculate breakdowns for charts
  const situationData = useMemo(() => {
    const counts: Record<string, number> = {};
    scoredGoals.forEach(g => {
      const sit = g.weightBreakdown.situation;
      counts[sit] = (counts[sit] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: SITUATION_COLORS[name] || '#666' }))
      .sort((a, b) => b.value - a.value);
  }, [scoredGoals]);

  const strengthData = useMemo(() => {
    const counts: Record<string, number> = {};
    scoredGoals.forEach(g => {
      const str = g.weightBreakdown.strength;
      const label = STRENGTH_LABELS[str] || str.toUpperCase();
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: STRENGTH_COLORS[name] || '#666' }))
      .sort((a, b) => b.value - a.value);
  }, [scoredGoals]);

  const specialData = useMemo(() => {
    const data = [];
    const gwg = scoredGoals.filter(g => g.gameWinner).length;
    const ot = scoredGoals.filter(g => g.overtime).length;
    const en = scoredGoals.filter(g => g.emptyNet).length;

    if (gwg > 0) data.push({ name: 'Game Winner', value: gwg, color: '#22c55e' });
    if (ot > 0) data.push({ name: 'Overtime', value: ot, color: '#8b5cf6' });
    if (en > 0) data.push({ name: 'Empty Net', value: en, color: '#6b7280' });

    const normalGoals = scoredGoals.filter(g => !g.gameWinner && !g.overtime && !g.emptyNet).length;
    if (normalGoals > 0) data.push({ name: 'Regular', value: normalGoals, color: '#d4a843' });

    return data.sort((a, b) => b.value - a.value);
  }, [scoredGoals]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <span className="text-primary glow-amber font-bold uppercase tracking-wide">{player.name}</span>
            <Badge variant="outline" className="text-xs uppercase">{player.team}</Badge>
            <Badge variant="outline" className="text-xs uppercase">{player.nationality}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <StatCard label="Games" value={player.games} />
          <StatCard label="Goals" value={player.goals} weighted={player.weightedGoals} />
          <StatCard label="Assists" value={player.assists} weighted={player.weightedAssists} />
          <StatCard label="Points" value={player.points} weighted={player.weightedPoints} />
        </div>

        <div className="grid grid-cols-3 gap-4 my-4 p-4 retro-border rounded bg-card/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary glow-amber">#{player.weightedRank}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Weighted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">#{player.traditionalRank}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Traditional</div>
          </div>
          <div className="text-center">
            <div className={cn(
              'text-2xl font-bold',
              player.rankChange > 0 ? 'text-green-400 glow-green' : player.rankChange < 0 ? 'text-red-400 glow-red' : 'text-muted-foreground'
            )}>
              {player.rankChange > 0 ? `+${player.rankChange}` : player.rankChange || '·'}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Change</div>
          </div>
        </div>

        {/* Charts Section */}
        {scoredGoals.length > 0 && (
          <div className="grid grid-cols-3 gap-4 my-4">
            <div className="rounded p-3 bg-card/50">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 text-center">By Situation</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={situationData}
                    cx="50%"
                    cy="40%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {situationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '4px', fontSize: '11px', color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    labelStyle={{ color: '#d4a843' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: '9px', paddingTop: '16px' }}
                    formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded p-3 bg-card/50">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 text-center">By Strength</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={strengthData}
                    cx="50%"
                    cy="40%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {strengthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '4px', fontSize: '11px', color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    labelStyle={{ color: '#d4a843' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: '9px', paddingTop: '16px' }}
                    formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded p-3 bg-card/50">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 text-center">Special Goals</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={specialData}
                    cx="50%"
                    cy="40%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {specialData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: 'none', borderRadius: '4px', fontSize: '11px', color: '#e5e5e5' }}
                    itemStyle={{ color: '#e5e5e5' }}
                    labelStyle={{ color: '#d4a843' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: '9px', paddingTop: '16px' }}
                    formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold mb-3 text-primary uppercase tracking-wider border-b border-border pb-2">
              Goals [{scoredGoals.length}]
            </h3>
            <ScrollArea className="h-64">
              <div className="space-y-1 pr-4">
                {scoredGoals.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} playerId={player.playerId} />
                ))}
              </div>
            </ScrollArea>
          </section>

          <section>
            <h3 className="text-sm font-bold mb-3 text-blue-400 uppercase tracking-wider border-b border-border pb-2">
              Assists [{assists.length}]
            </h3>
            <ScrollArea className="h-64">
              <div className="space-y-1 pr-4">
                {assists.map((goal) => (
                  <GoalRow key={goal.id} goal={goal} playerId={player.playerId} isAssist />
                ))}
              </div>
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, weighted }: { label: string; value: number; weighted?: number }) {
  return (
    <div className="retro-border bg-card/50 rounded p-3 text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      {weighted !== undefined && (
        <div className="text-primary text-sm glow-amber font-bold">{weighted.toFixed(1)}</div>
      )}
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function GoalRow({ goal, playerId, isAssist = false }: {
  goal: ReturnType<typeof calculateGoalWeight>;
  playerId: number;
  isAssist?: boolean;
}) {
  const isPrimary = goal.assist1Id === playerId;
  const weight = isAssist
    ? goal.weight * 0.7 * (isPrimary ? 1 : 0.85)
    : goal.weight;

  return (
    <div className="flex items-center gap-2 p-2 bg-card/30 border-b border-border/30 text-xs">
      <div className="w-20 text-muted-foreground">{goal.date}</div>
      <div className="w-16 text-muted-foreground">
        {goal.awayTeam}@{goal.homeTeam}
      </div>
      <div className="w-14 text-muted-foreground">
        P{goal.period} {goal.time}
      </div>
      <div className="w-10 text-center text-foreground">
        {goal.awayScore}-{goal.homeScore}
      </div>
      <div className="flex-1 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] uppercase">
          {goal.weightBreakdown.situation}
        </Badge>
        {goal.weightBreakdown.strength !== 'ev' && (
          <Badge variant="outline" className="text-[10px] uppercase">
            {goal.weightBreakdown.strength.toUpperCase()}
          </Badge>
        )}
        {goal.overtime && (
          <Badge variant="outline" className="text-[10px] border-purple-500/50 text-purple-400">
            OT
          </Badge>
        )}
        {goal.emptyNet && (
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
            EN
          </Badge>
        )}
        {goal.gameWinner && (
          <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-400">
            GWG
          </Badge>
        )}
        {isAssist && !isPrimary && (
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
            A2
          </Badge>
        )}
      </div>
      <div className="w-14 text-right text-primary font-bold glow-amber">
        {weight.toFixed(2)}
      </div>
    </div>
  );
}
