'use client';

import { Weights } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  weights: Weights;
}

export function ExplanationPanel({ weights }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-bold text-primary glow-amber uppercase tracking-wide mb-2">System Documentation</h2>
        <p className="text-muted-foreground text-sm">
          Not all points are created equal. A goal to tie the game in the 3rd period
          is more valuable than a goal when you're already up by 4.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="retro-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Score Situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              The game situation before the goal determines its weight.
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Tied game / Tying goal</td>
                  <td className="text-right text-primary font-bold">{weights.score_tie}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Down by 2 → 1 goal game</td>
                  <td className="text-right text-primary font-bold">{weights.score_lead_1}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Leading by 1 (insurance)</td>
                  <td className="text-right text-primary font-bold">{weights.score_lead_1}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Leading by 2 (comfortable)</td>
                  <td className="text-right text-primary font-bold">{weights.score_lead_2}x</td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground">Leading/trailing by 3+ (garbage)</td>
                  <td className="text-right text-primary font-bold">{weights.score_lead_3plus}x</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="retro-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Strength Situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Shorthanded goals are hard. Power play goals are easier.
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Even strength (5v5)</td>
                  <td className="text-right text-primary font-bold">{weights.strength_ev}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Power play (PP)</td>
                  <td className="text-right text-primary font-bold">{weights.strength_pp}x</td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground">Shorthanded (SH)</td>
                  <td className="text-right text-primary font-bold">{weights.strength_sh}x</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="retro-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Special Situations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">3rd period (clutch time)</td>
                  <td className="text-right text-primary font-bold">{weights.clutch_3rd}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Overtime goals</td>
                  <td className="text-right text-primary font-bold">{weights.overtime}x</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Game-winning goal bonus</td>
                  <td className="text-right text-primary font-bold">+{weights.gwg_bonus}</td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground">Empty net goals</td>
                  <td className="text-right text-primary font-bold">{weights.empty_net}x</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="retro-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Assists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Assists are weighted based on the goal's weight.
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-foreground">Primary assist (A1)</td>
                  <td className="text-right text-primary font-bold">70% of goal</td>
                </tr>
                <tr>
                  <td className="py-2 text-foreground">Secondary assist (A2)</td>
                  <td className="text-right text-primary font-bold">~60% of goal</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card className="retro-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">Example Calculations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded">
              <div className="font-bold text-green-400 glow-green mb-2 uppercase tracking-wider">Clutch Goal</div>
              <p className="text-muted-foreground mb-2">
                Tying goal in 3rd period at even strength:
              </p>
              <div className="text-primary font-bold glow-amber">
                1.0 × {weights.score_tie} × {weights.strength_ev} × {weights.clutch_3rd} = {(weights.score_tie * weights.strength_ev * weights.clutch_3rd).toFixed(2)}
              </div>
            </div>
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded">
              <div className="font-bold text-red-400 glow-red mb-2 uppercase tracking-wider">Garbage Goal</div>
              <p className="text-muted-foreground mb-2">
                Power play goal when up 4-1 in 2nd:
              </p>
              <div className="text-primary font-bold glow-amber">
                1.0 × {weights.score_lead_3plus} × {weights.strength_pp} × 1.0 = {(weights.score_lead_3plus * weights.strength_pp).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
