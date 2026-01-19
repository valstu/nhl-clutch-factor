'use client';

import { PlayerStats } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  stats: PlayerStats[];
  onPlayerClick: (player: PlayerStats) => void;
}

export function RankingsTable({ stats, onPlayerClick }: Props) {
  return (
    <div className="retro-border rounded overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-card/80 hover:bg-card/80 border-b border-border">
            <TableHead className="w-12 text-primary font-bold text-xs uppercase">#</TableHead>
            <TableHead className="w-12 text-muted-foreground text-xs uppercase">+/-</TableHead>
            <TableHead className="text-foreground text-xs uppercase">Player</TableHead>
            <TableHead className="w-16 text-muted-foreground text-xs uppercase">Team</TableHead>
            <TableHead className="w-12 text-muted-foreground text-right text-xs uppercase">GP</TableHead>
            <TableHead className="w-12 text-muted-foreground text-right text-xs uppercase">G</TableHead>
            <TableHead className="w-12 text-muted-foreground text-right text-xs uppercase">A</TableHead>
            <TableHead className="w-12 text-muted-foreground text-right text-xs uppercase">P</TableHead>
            <TableHead className="w-16 text-primary text-right text-xs uppercase">wG</TableHead>
            <TableHead className="w-16 text-primary text-right text-xs uppercase">wA</TableHead>
            <TableHead className="w-16 text-primary text-right font-bold text-xs uppercase">wP</TableHead>
            <TableHead className="w-16 text-muted-foreground/60 text-right text-xs uppercase">Trad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.slice(0, 100).map((player, idx) => (
            <TableRow
              key={player.playerId}
              className={cn(
                "cursor-pointer hover:bg-primary/10 transition-colors border-b border-border/50",
                idx % 2 === 0 && "bg-card/30"
              )}
              onClick={() => onPlayerClick(player)}
            >
              <TableCell className="font-bold text-primary glow-amber">
                {player.weightedRank}
              </TableCell>
              <TableCell className={cn(
                'font-semibold',
                player.rankChange > 0 && 'text-green-400 glow-green',
                player.rankChange < 0 && 'text-red-400 glow-red',
                player.rankChange === 0 && 'text-muted-foreground/50'
              )}>
                {player.rankChange > 0 ? `+${player.rankChange}` :
                 player.rankChange < 0 ? player.rankChange : '·'}
              </TableCell>
              <TableCell className="font-medium text-foreground">{player.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{player.team}</TableCell>
              <TableCell className="text-right text-muted-foreground">{player.games}</TableCell>
              <TableCell className="text-right text-foreground/80">{player.goals}</TableCell>
              <TableCell className="text-right text-foreground/80">{player.assists}</TableCell>
              <TableCell className="text-right text-foreground/80">{player.points}</TableCell>
              <TableCell className="text-right text-primary">
                {player.weightedGoals.toFixed(1)}
              </TableCell>
              <TableCell className="text-right text-primary">
                {player.weightedAssists.toFixed(1)}
              </TableCell>
              <TableCell className="text-right text-primary font-bold glow-amber">
                {player.weightedPoints.toFixed(1)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground/50">
                {player.traditionalRank}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
