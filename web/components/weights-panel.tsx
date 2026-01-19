'use client';

import { Weights, DEFAULT_WEIGHTS } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface Props {
  weights: Weights;
  onChange: (weights: Weights) => void;
}

const WEIGHT_CONFIG: {
  key: keyof Weights;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  category: string;
}[] = [
  // Score situation
  { key: 'score_tie', label: 'Tie / Tying Goal', description: 'Go-ahead or tying goal', min: 0.5, max: 3, step: 0.1, category: 'Score Situation' },
  { key: 'score_lead_1', label: 'Close Game (+/-1)', description: 'Insurance or comeback goal', min: 0.5, max: 2, step: 0.1, category: 'Score Situation' },
  { key: 'score_lead_2', label: 'Comfortable Lead (+2)', description: '2 goal cushion', min: 0.3, max: 1.5, step: 0.1, category: 'Score Situation' },
  { key: 'score_lead_3plus', label: 'Garbage Time (+3+)', description: 'Big lead / down big', min: 0.1, max: 1, step: 0.1, category: 'Score Situation' },
  // Strength
  { key: 'strength_ev', label: 'Even Strength', description: '5v5 play', min: 0.5, max: 1.5, step: 0.1, category: 'Strength' },
  { key: 'strength_pp', label: 'Power Play', description: 'Man advantage', min: 0.3, max: 1.5, step: 0.1, category: 'Strength' },
  { key: 'strength_sh', label: 'Shorthanded', description: 'Down a man', min: 1, max: 3, step: 0.1, category: 'Strength' },
  // Special
  { key: 'empty_net', label: 'Empty Net', description: 'No goalie in net', min: 0.1, max: 1, step: 0.1, category: 'Special' },
  { key: 'overtime', label: 'Overtime', description: 'OT goals', min: 1, max: 3, step: 0.1, category: 'Special' },
  { key: 'gwg_bonus', label: 'Game Winner Bonus', description: 'Added to GWG', min: 0, max: 1, step: 0.1, category: 'Special' },
  { key: 'clutch_3rd', label: '3rd Period', description: 'Clutch time multiplier', min: 1, max: 2, step: 0.1, category: 'Special' },
];

export function WeightsPanel({ weights, onChange }: Props) {
  const categories = [...new Set(WEIGHT_CONFIG.map(w => w.category))];

  const handleChange = (key: keyof Weights, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleReset = () => {
    onChange(DEFAULT_WEIGHTS);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-primary glow-amber uppercase tracking-wide">Adjust Weights</h2>
          <p className="text-muted-foreground text-sm">Modify how different situations are valued</p>
        </div>
        <Button variant="outline" onClick={handleReset} className="uppercase text-xs tracking-wider">
          [Reset]
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <Card key={category} className="retro-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-primary uppercase tracking-wider font-bold">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {WEIGHT_CONFIG.filter(w => w.category === category).map(config => (
                <div key={config.key} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-medium text-foreground">{config.label}</label>
                    <span className="text-primary font-bold glow-amber">
                      {weights[config.key].toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[weights[config.key]]}
                    onValueChange={([v]) => handleChange(config.key, v)}
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
