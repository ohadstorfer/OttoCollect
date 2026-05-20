import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateWatermarkedCanvas,
  WatermarkParamsApplied,
  WatermarkSettings,
  DEFAULT_WATERMARK_SETTINGS,
} from '@/services/imageProcessingService';

const STORAGE_KEY = 'watermark-preview-settings';

interface LoadedImage {
  bitmap: ImageBitmap;
  fileName: string;
}

interface PreviewState {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  params: WatermarkParamsApplied;
  fileName: string;
}

interface ControlConfig {
  key: keyof WatermarkSettings;
  label: string;
  min: number;
  max: number;
  step: number;
}

const CONTROLS: { group: string; items: ControlConfig[] }[] = [
  {
    group: 'Portrait (vertical photos)',
    items: [
      { key: 'widthRatioPortrait', label: 'Size', min: 0.05, max: 0.6, step: 0.01 },
      { key: 'paddingXRatioPortrait', label: 'Space from right', min: 0, max: 0.4, step: 0.005 },
      { key: 'paddingYRatioPortrait', label: 'Space from bottom', min: 0, max: 0.4, step: 0.005 },
    ],
  },
  {
    group: 'Landscape (horizontal photos)',
    items: [
      { key: 'widthRatioLandscape', label: 'Size', min: 0.05, max: 0.6, step: 0.01 },
      { key: 'paddingXRatioLandscape', label: 'Space from right', min: 0, max: 0.4, step: 0.005 },
      { key: 'paddingYRatioLandscape', label: 'Space from bottom', min: 0, max: 0.4, step: 0.005 },
    ],
  },
  {
    group: 'General',
    items: [
      { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
    ],
  },
];

function loadStoredSettings(): WatermarkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATERMARK_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_WATERMARK_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_WATERMARK_SETTINGS;
  }
}

const WatermarkPreview: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WatermarkSettings>(loadStoredSettings);
  const [landscapeImage, setLandscapeImage] = useState<LoadedImage | null>(null);
  const [portraitImage, setPortraitImage] = useState<LoadedImage | null>(null);
  const [landscapePreview, setLandscapePreview] = useState<PreviewState | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<PreviewState | null>(null);
  const landscapeInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  // Persist settings so admins keep their tweaks across reloads.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const renderPreview = async (
    image: LoadedImage | null,
    setter: (p: PreviewState | null) => void
  ) => {
    if (!image) {
      setter(null);
      return;
    }
    try {
      const { canvas, params } = await generateWatermarkedCanvas(image.bitmap, settings);
      setter({
        dataUrl: canvas.toDataURL('image/jpeg', 1.0),
        originalWidth: image.bitmap.width,
        originalHeight: image.bitmap.height,
        params,
        fileName: image.fileName,
      });
    } catch (err) {
      console.error('Watermark preview failed:', err);
      toast({
        title: 'Error',
        description: 'Could not generate the preview. Check the console.',
        variant: 'destructive',
      });
    }
  };

  // Re-render both slots whenever settings or loaded images change.
  useEffect(() => {
    renderPreview(landscapeImage, setLandscapePreview);
    renderPreview(portraitImage, setPortraitPreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, landscapeImage, portraitImage]);

  const handleFile = async (file: File | undefined, setter: (img: LoadedImage | null) => void) => {
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        premultiplyAlpha: 'premultiply',
        colorSpaceConversion: 'default',
      });
      setter({ bitmap, fileName: file.name });
    } catch (err) {
      console.error('Failed to load image:', err);
      toast({
        title: 'Error',
        description: 'Could not load the image.',
        variant: 'destructive',
      });
    }
  };

  const updateSetting = (key: keyof WatermarkSettings, value: number) => {
    if (Number.isNaN(value)) return;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings(DEFAULT_WATERMARK_SETTINGS);

  const downloadPreview = (preview: PreviewState | null, suffix: string) => {
    if (!preview) return;
    const link = document.createElement('a');
    link.href = preview.dataUrl;
    link.download = `watermark-preview-${suffix}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            onChange={(e) => updateSetting(cfg.key, parseFloat(e.target.value))}
            className="h-8 w-24 text-right"
          />
        </div>
        <Slider
          value={[value]}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          onValueChange={([v]) => updateSetting(cfg.key, v)}
        />
        <div className="text-xs text-muted-foreground text-right">
          {cfg.key === 'opacity' ? value.toFixed(2) : `${(value * 100).toFixed(1)}%`}
        </div>
      </div>
    );
  };

  const renderSlot = (
    title: string,
    suffix: 'landscape' | 'portrait',
    preview: PreviewState | null,
    onUpload: (file: File | undefined) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <Button onClick={() => inputRef.current?.click()} className="gap-2">
            <ImageIcon className="h-4 w-4" />
            {preview ? 'Change photo' : 'Upload photo'}
          </Button>
          <Button
            onClick={() => downloadPreview(preview, suffix)}
            disabled={!preview}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>

        {preview ? (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div><span className="font-medium">File:</span> {preview.fileName}</div>
              <div>
                <span className="font-medium">Dimensions:</span>{' '}
                {preview.originalWidth} × {preview.originalHeight}{' '}
                ({preview.params.isLandscape ? 'landscape' : 'portrait'})
              </div>
              <div>
                <span className="font-medium">Size:</span>{' '}
                {(preview.params.widthRatio * 100).toFixed(0)}% of width ={' '}
                {Math.round(preview.params.watermarkWidth)} ×{' '}
                {Math.round(preview.params.watermarkHeight)} px
              </div>
              <div>
                <span className="font-medium">Space from right:</span>{' '}
                {(preview.params.paddingXRatio * 100).toFixed(1)}% ({Math.round(preview.params.paddingX)}px){' · '}
                <span className="font-medium">from bottom:</span>{' '}
                {(preview.params.paddingYRatio * 100).toFixed(1)}% ({Math.round(preview.params.paddingY)}px){' · '}
                <span className="font-medium">Opacity:</span> {preview.params.opacity}
              </div>
            </div>
            <img
              src={preview.dataUrl}
              alt={`Preview ${suffix}`}
              className="w-full rounded-md border"
            />
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            No photo loaded
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Watermark Preview</h1>
        <p className="text-muted-foreground mt-2">
          Upload a horizontal and a vertical photo, move the controls, and see the
          result live. Nothing is uploaded to storage — this is preview only.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Watermark settings</CardTitle>
          <Button onClick={resetSettings} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONTROLS.map((section, i) => (
              <div key={section.group} className="space-y-4">
                <h3 className="font-semibold text-sm">{section.group}</h3>
                {i > 0 && <Separator className="md:hidden" />}
                {section.items.map(renderControl)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSlot('Horizontal (landscape)', 'landscape', landscapePreview, (f) => handleFile(f, setLandscapeImage), landscapeInputRef)}
        {renderSlot('Vertical (portrait)', 'portrait', portraitPreview, (f) => handleFile(f, setPortraitImage), portraitInputRef)}
      </div>
    </div>
  );
};

export default WatermarkPreview;
