import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Save, Globe } from 'lucide-react';
import { toast } from 'sonner';
import WatermarkControls from './WatermarkControls';
import {
  generateWatermarkedCanvas,
  regenerateWatermarkedInPlace,
  WatermarkSettings,
  DEFAULT_WATERMARK_SETTINGS,
} from '@/services/imageProcessingService';
import { fetchWatermarkSettings } from '@/services/watermarkSettingsService';

interface BanknoteWatermarkPanelProps {
  /** Original (un-watermarked) image URLs of this banknote. */
  frontOriginalUrl?: string | null;
  backOriginalUrl?: string | null;
  /** Existing watermarked URLs that will be overwritten in place. */
  frontWatermarkedUrl?: string | null;
  backWatermarkedUrl?: string | null;
  /** Country of the banknote — used to seed the sliders with the saved country settings. */
  countryId?: string | null;
}

interface SidePreview {
  dataUrl: string;
  isLandscape: boolean;
}

// Renders a live watermarked preview from an original image URL.
// `isLandscape` mirrors generateWatermarkedCanvas: width > height.
async function buildPreview(
  originalUrl: string,
  settings: WatermarkSettings
): Promise<SidePreview> {
  const response = await fetch(originalUrl);
  if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: 'from-image',
    premultiplyAlpha: 'premultiply',
    colorSpaceConversion: 'default',
  });
  const { canvas } = await generateWatermarkedCanvas(bitmap, settings);
  return { dataUrl: canvas.toDataURL('image/jpeg', 1.0), isLandscape: bitmap.width > bitmap.height };
}

/**
 * Per-banknote custom watermark editor: tune the watermark and preview it on
 * THIS banknote's own front/back images, then bake it into the banknote's
 * watermarked files in place (same URL). Affects only this banknote.
 */
const BanknoteWatermarkPanel: React.FC<BanknoteWatermarkPanelProps> = ({
  frontOriginalUrl,
  backOriginalUrl,
  frontWatermarkedUrl,
  backWatermarkedUrl,
  countryId,
}) => {
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_WATERMARK_SETTINGS);
  const [frontPreview, setFrontPreview] = useState<SidePreview | null>(null);
  const [backPreview, setBackPreview] = useState<SidePreview | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Seed sliders from the banknote's country settings (falls back to defaults).
  useEffect(() => {
    if (!countryId) return;
    fetchWatermarkSettings(countryId).then(setSettings).catch(() => {});
  }, [countryId]);

  // Re-render previews whenever the settings or source images change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (frontOriginalUrl) {
        try {
          const preview = await buildPreview(frontOriginalUrl, settings);
          if (!cancelled) setFrontPreview(preview);
        } catch (err) {
          console.error('Front preview failed:', err);
        }
      } else {
        setFrontPreview(null);
      }
      if (backOriginalUrl) {
        try {
          const preview = await buildPreview(backOriginalUrl, settings);
          if (!cancelled) setBackPreview(preview);
        } catch (err) {
          console.error('Back preview failed:', err);
        }
      } else {
        setBackPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings, frontOriginalUrl, backOriginalUrl]);

  // Show only the control groups that match the orientations actually present.
  // While images are still loading we show both so nothing flashes empty.
  const loadedOrientations = [frontPreview?.isLandscape, backPreview?.isLandscape].filter(
    (v): v is boolean => v !== undefined
  );
  const orientations =
    loadedOrientations.length === 0
      ? { portrait: true, landscape: true }
      : {
          portrait: loadedOrientations.some((isLandscape) => !isLandscape),
          landscape: loadedOrientations.some((isLandscape) => isLandscape),
        };

  const updateSetting = (key: keyof WatermarkSettings, value: number) => {
    if (Number.isNaN(value)) return;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const loadCountryDefaults = async () => {
    if (!countryId) {
      setSettings(DEFAULT_WATERMARK_SETTINGS);
      return;
    }
    const saved = await fetchWatermarkSettings(countryId);
    setSettings(saved);
    toast.success('Loaded country watermark settings');
  };

  const canApply =
    (!!frontOriginalUrl && !!frontWatermarkedUrl) ||
    (!!backOriginalUrl && !!backWatermarkedUrl);

  const handleApply = async () => {
    setIsApplying(true);
    let done = 0;
    let errors = 0;
    try {
      if (frontOriginalUrl && frontWatermarkedUrl) {
        try {
          await regenerateWatermarkedInPlace(frontOriginalUrl, frontWatermarkedUrl, settings);
          done += 1;
        } catch (err) {
          console.error('Failed to apply front watermark:', err);
          errors += 1;
        }
      }
      if (backOriginalUrl && backWatermarkedUrl) {
        try {
          await regenerateWatermarkedInPlace(backOriginalUrl, backWatermarkedUrl, settings);
          done += 1;
        } catch (err) {
          console.error('Failed to apply back watermark:', err);
          errors += 1;
        }
      }
      if (errors === 0) {
        toast.success(`Custom watermark applied to this banknote (${done} image${done === 1 ? '' : 's'}).`);
      } else {
        toast.error(`Applied ${done}, failed ${errors}. Check the console.`);
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tune the watermark and preview it on this banknote's own images. Applying overwrites
        only this banknote's watermarked files (same URL); the CDN cache may take up to a
        minute to refresh.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSettings(DEFAULT_WATERMARK_SETTINGS)} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
        <Button onClick={loadCountryDefaults} variant="outline" size="sm" className="gap-2" disabled={!countryId}>
          <Globe className="h-4 w-4" />
          Load country settings
        </Button>
        <Button onClick={handleApply} disabled={!canApply || isApplying} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {isApplying ? 'Applying…' : 'Apply to this banknote'}
        </Button>
      </div>

      <WatermarkControls settings={settings} onChange={updateSetting} orientations={orientations} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Front preview</Label>
          {frontPreview ? (
            <img src={frontPreview.dataUrl} alt="Front watermark preview" className="w-full rounded-md border" />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
              {frontOriginalUrl ? 'Rendering…' : 'No front image'}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Back preview</Label>
          {backPreview ? (
            <img src={backPreview.dataUrl} alt="Back watermark preview" className="w-full rounded-md border" />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground text-sm">
              {backOriginalUrl ? 'Rendering…' : 'No back image'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanknoteWatermarkPanel;
