import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Ban, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Fixed palette of swatches, Word/Docs-style (8 columns). */
const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffbf00', '#00a000', '#00b0b0', '#1155cc', '#0000ff',
  '#9900ff', '#ff00ff', '#e6b8af', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8',
];

const RECENT_KEY = 'rte-recent-colors';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(colors: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(colors));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

interface ColorPaletteProps {
  /** Currently applied color (hex), or undefined for the default. */
  value?: string;
  /** Apply a color to the selection. */
  onSelect: (color: string) => void;
  /** Clear the color (back to the default/automatic). */
  onClear: () => void;
}

function Swatch({
  color,
  active,
  onPick,
}: {
  color: string;
  active?: boolean;
  onPick: (color: string) => void;
}) {
  return (
    <button
      type="button"
      title={color}
      aria-label={color}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(color)}
      className={cn(
        'relative h-5 w-5 rounded-sm border border-border/60 transition-transform hover:scale-110',
        active && 'ring-2 ring-primary ring-offset-1 ring-offset-popover'
      )}
      style={{ backgroundColor: color }}
    >
      {active && (
        <Check
          className="absolute inset-0 m-auto h-3 w-3"
          style={{ color: isLight(color) ? '#000' : '#fff' }}
        />
      )}
    </button>
  );
}

/** Rough perceived-lightness check, to pick a readable checkmark color. */
function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/**
 * Word-style text-color picker: a fixed swatch palette plus remembered custom
 * colors, so a chosen color can be reused without re-picking it each time.
 */
export function ColorPalette({ value, onSelect, onClear }: ColorPaletteProps) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const customInputRef = React.useRef<HTMLInputElement>(null);

  // Load remembered colors when the popover first opens.
  useEffect(() => {
    if (open) setRecent(loadRecent());
  }, [open]);

  const remember = useCallback((color: string) => {
    setRecent((prev) => {
      const next = [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  const pick = useCallback(
    (color: string) => {
      onSelect(color);
      remember(color);
      setOpen(false);
    },
    [onSelect, remember]
  );

  const current = value?.toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Text color"
          aria-label="Text color"
          onMouseDown={(e) => e.preventDefault()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex flex-col items-center leading-none">
            <span className="text-[11px] font-semibold">A</span>
            <span
              className="mt-0.5 h-1 w-4 rounded-sm border border-border/40"
              style={{ backgroundColor: value || '#000000' }}
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-8 gap-1">
            {PRESET_COLORS.map((c) => (
              <Swatch key={c} color={c} active={current === c.toLowerCase()} onPick={pick} />
            ))}
          </div>

          {recent.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Recent</p>
              <div className="grid grid-cols-8 gap-1">
                {recent.map((c) => (
                  <Swatch key={c} color={c} active={current === c.toLowerCase()} onPick={pick} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <Ban className="h-3.5 w-3.5" />
              Automatic
            </button>

            <label
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
              title="Custom color"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Plus className="h-3.5 w-3.5" />
              Custom
              <input
                ref={customInputRef}
                type="color"
                className="sr-only"
                defaultValue={value || '#000000'}
                onChange={(e) => pick(e.target.value)}
              />
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ColorPalette;
