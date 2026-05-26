import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { WatermarkSettings } from '@/services/imageProcessingService';

interface ControlConfig {
  key: keyof WatermarkSettings;
  label: string;
  min: number;
  max: number;
  step: number;
}

// `orientation` ties a group to portrait/landscape so callers can hide groups
// that don't apply to the images at hand. Groups without it always show.
const CONTROLS: { group: string; orientation?: 'portrait' | 'landscape'; items: ControlConfig[] }[] = [
  {
    group: 'Portrait (vertical photos)',
    orientation: 'portrait',
    items: [
      { key: 'widthRatioPortrait', label: 'Size', min: 0.05, max: 0.6, step: 0.01 },
      { key: 'paddingXRatioPortrait', label: 'Space from right', min: 0, max: 0.4, step: 0.005 },
      { key: 'paddingYRatioPortrait', label: 'Space from bottom', min: 0, max: 0.4, step: 0.005 },
    ],
  },
  {
    group: 'Landscape (horizontal photos)',
    orientation: 'landscape',
    items: [
      { key: 'widthRatioLandscape', label: 'Size', min: 0.05, max: 0.6, step: 0.01 },
      { key: 'paddingXRatioLandscape', label: 'Space from right', min: 0, max: 0.4, step: 0.005 },
      { key: 'paddingYRatioLandscape', label: 'Space from bottom', min: 0, max: 0.4, step: 0.005 },
    ],
  },
  {
    group: 'General',
    items: [{ key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 }],
  },
];

interface WatermarkControlsProps {
  settings: WatermarkSettings;
  onChange: (key: keyof WatermarkSettings, value: number) => void;
  /**
   * Which orientation groups to show. Defaults to both. Use this to hide the
   * group that doesn't match the images being edited (e.g. only landscape).
   * The General group always shows.
   */
  orientations?: { portrait: boolean; landscape: boolean };
}

/**
 * Grouped sliders + numeric inputs for tuning watermark settings.
 * Shared by the watermark preview page and the per-banknote editor.
 */
const WatermarkControls: React.FC<WatermarkControlsProps> = ({
  settings,
  onChange,
  orientations = { portrait: true, landscape: true },
}) => {
  const visibleSections = CONTROLS.filter(
    (section) => !section.orientation || orientations[section.orientation]
  );
  const gridColsClass =
    visibleSections.length >= 3
      ? 'md:grid-cols-3'
      : visibleSections.length === 2
      ? 'md:grid-cols-2'
      : 'md:grid-cols-1';

  const renderControl = (cfg: ControlConfig) => {
    const value = settings[cfg.key];
    return (
      <div key={cfg.key} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">{cfg.label}</Label>
          <Input
            type="number"
            value={value}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            onChange={(e) => onChange(cfg.key, parseFloat(e.target.value))}
            className="h-8 w-24 text-right"
          />
        </div>
        <Slider
          value={[value]}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          onValueChange={([v]) => onChange(cfg.key, v)}
        />
        <div className="text-xs text-muted-foreground text-right">
          {cfg.key === 'opacity' ? value.toFixed(2) : `${(value * 100).toFixed(1)}%`}
        </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 ${gridColsClass} gap-6`}>
      {visibleSections.map((section, i) => (
        <div key={section.group} className="space-y-4">
          <h3 className="font-semibold text-sm"><span>{section.group}</span></h3>
          {i > 0 && <Separator className="md:hidden" />}
          {section.items.map(renderControl)}
        </div>
      ))}
    </div>
  );
};

export default WatermarkControls;
