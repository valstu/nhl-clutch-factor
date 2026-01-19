'use client';

import { useEffect, useState, useMemo } from 'react';
import { NHLData, Weights, PlayerStats, DEFAULT_WEIGHTS } from '@/lib/types';
import { calculateAllStats } from '@/lib/weighting';
import { RankingsTable } from '@/components/rankings-table';
import { WeightsPanel } from '@/components/weights-panel';
import { PlayerModal } from '@/components/player-modal';
import { ExplanationPanel } from '@/components/explanation-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [data, setData] = useState<NHLData | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [search, setSearch] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then((d: NHLData) => {
        setData(d);
        setWeights(d.weights);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    if (!data) return [];
    return calculateAllStats(data.goals, data.players, weights);
  }, [data, weights]);

  const filteredStats = useMemo(() => {
    let result = stats;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.team.toLowerCase().includes(s)
      );
    }
    if (nationalityFilter) {
      result = result.filter(p => p.nationality === nationalityFilter);
    }
    return result;
  }, [stats, search, nationalityFilter]);

  const nationalities = useMemo(() => {
    const counts = new Map<string, number>();
    stats.forEach(p => {
      counts.set(p.nationality, (counts.get(p.nationality) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [stats]);

  // Top clutch players (biggest positive rank change) - filter to top 100 traditional to be meaningful
  const clutchPlayers = useMemo(() => {
    return stats
      .filter(p => p.traditionalRank <= 100 && p.points >= 20)
      .sort((a, b) => b.rankChange - a.rankChange)
      .slice(0, 10);
  }, [stats]);

  // Top garbage time players (biggest negative rank change)
  const garbagePlayers = useMemo(() => {
    return stats
      .filter(p => p.traditionalRank <= 100 && p.points >= 20)
      .sort((a, b) => a.rankChange - b.rankChange)
      .slice(0, 10);
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-primary glow-amber">Loading NHL data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="scanlines absolute inset-0 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        <header className="mb-8 border-b border-border pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl font-bold text-primary glow-amber tracking-tight">
              CLUTCH PUCK
            </h1>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              2025-26
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl">
            Not all points are created equal. We weight goals by game situation to reveal who scores when it matters — and who pads stats in garbage time.
          </p>
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground font-medium tracking-wider uppercase">
            <span>[{data?.meta.gameCount} games]</span>
            <span>[{data?.meta.goalCount} goals]</span>
            <span>[{stats.length} players]</span>
          </div>
        </header>

        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="rankings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs tracking-wider">
              Rankings
            </TabsTrigger>
            <TabsTrigger value="weights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs tracking-wider">
              Weights
            </TabsTrigger>
            <TabsTrigger value="explanation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs tracking-wider">
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-6">
            {/* Highlights Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="retro-border bg-card rounded p-4">
                <h3 className="text-sm font-bold text-green-400 glow-green uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-lg">↑</span> Most Clutch Players
                </h3>
                <div className="space-y-1">
                  {clutchPlayers.map((p, i) => (
                    <div
                      key={p.playerId}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-primary/10 p-1 rounded transition-colors"
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 text-foreground">{p.name}</span>
                      <span className="text-muted-foreground text-[10px]">{p.team}</span>
                      <span className="w-8 text-right text-muted-foreground">#{p.traditionalRank}</span>
                      <span className="text-green-400 glow-green font-bold">+{p.rankChange}</span>
                      <span className="w-8 text-right text-primary font-bold">#{p.weightedRank}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="retro-border bg-card rounded p-4">
                <h3 className="text-sm font-bold text-red-400 glow-red uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-lg">↓</span> Garbage Time Scorers
                </h3>
                <div className="space-y-1">
                  {garbagePlayers.map((p, i) => (
                    <div
                      key={p.playerId}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-primary/10 p-1 rounded transition-colors"
                      onClick={() => setSelectedPlayer(p)}
                    >
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 text-foreground">{p.name}</span>
                      <span className="text-muted-foreground text-[10px]">{p.team}</span>
                      <span className="w-8 text-right text-muted-foreground">#{p.traditionalRank}</span>
                      <span className="text-red-400 glow-red font-bold">{p.rankChange}</span>
                      <span className="w-8 text-right text-primary font-bold">#{p.weightedRank}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <Input
                placeholder=">> Search player/team..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-xs bg-card border-border text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={nationalityFilter === null ? 'default' : 'outline'}
                  className="cursor-pointer text-xs uppercase tracking-wider"
                  onClick={() => setNationalityFilter(null)}
                >
                  All
                </Badge>
                {nationalities.map(([nat, count]) => (
                  <Badge
                    key={nat}
                    variant={nationalityFilter === nat ? 'default' : 'outline'}
                    className="cursor-pointer text-xs uppercase tracking-wider"
                    onClick={() => setNationalityFilter(nat === nationalityFilter ? null : nat)}
                  >
                    {nat} ({count})
                  </Badge>
                ))}
              </div>
            </div>

            <RankingsTable
              stats={filteredStats}
              onPlayerClick={setSelectedPlayer}
            />
          </TabsContent>

          <TabsContent value="weights">
            <WeightsPanel weights={weights} onChange={setWeights} />
          </TabsContent>

          <TabsContent value="explanation">
            <ExplanationPanel weights={weights} />
          </TabsContent>
        </Tabs>

        {selectedPlayer && data && (
          <PlayerModal
            player={selectedPlayer}
            goals={data.goals}
            weights={weights}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </div>
    </div>
  );
}
