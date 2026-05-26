import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Image as ImageIcon, RotateCcw, Save, Play, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { fetchCountries } from '@/services/countryService';
import {
  generateWatermarkedCanvas,
  regenerateWatermarkedInPlace,
  WatermarkParamsApplied,
  WatermarkSettings,
  DEFAULT_WATERMARK_SETTINGS,
} from '@/services/imageProcessingService';
import {
  fetchWatermarkSettings,
  saveWatermarkSettings,
  collectCountryWatermarkTargets,
  collectUserCollectionWatermarkTargets,
  WatermarkTarget,
} from '@/services/watermarkSettingsService';

const DEFAULT_TEST_USER_ID = '64681131-4747-4036-9c32-fe60a560bf78';
const TEST_USERNAME = 'Dror K.';

interface CountryOption {
  id: string;
  name: string;
}

interface RegenStats {
  processed: number;
  errors: number;
  total: number;
}

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
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'Super Admin';
  const isCountryAdmin = !!user?.role && user.role.endsWith(' Admin') && !isSuperAdmin;
  const hasAdminAccess = isSuperAdmin || isCountryAdmin;

  const [settings, setSettings] = useState<WatermarkSettings>(loadStoredSettings);

  // Per-country settings + bulk regeneration state.
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [scanResult, setScanResult] = useState<{ targets: WatermarkTarget[]; skipped: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenStats, setRegenStats] = useState<RegenStats>({ processed: 0, errors: 0, total: 0 });

  // Test tool: regenerate one fixed user's collection only.
  const testUserId = DEFAULT_TEST_USER_ID;
  const [testScanResult, setTestScanResult] = useState<{ targets: WatermarkTarget[]; skipped: number } | null>(null);
  const [isTestScanning, setIsTestScanning] = useState(false);
  const [isTestRegenerating, setIsTestRegenerating] = useState(false);
  const [testStats, setTestStats] = useState<RegenStats>({ processed: 0, errors: 0, total: 0 });

  const selectedCountryName = countries.find((c) => c.id === selectedCountryId)?.name ?? '';

  // Load the country list; for a country admin, lock to their own country.
  useEffect(() => {
    if (!hasAdminAccess) return;
    (async () => {
      const data = await fetchCountries();
      const opts: CountryOption[] = data.map((c) => ({ id: c.id, name: c.name }));
      setCountries(opts);
      if (isCountryAdmin && user?.role) {
        const myCountry = user.role.replace(' Admin', '');
        const match = opts.find((c) => c.name === myCountry);
        if (match) setSelectedCountryId(match.id);
      }
    })();
  }, [hasAdminAccess, isCountryAdmin, user?.role]);

  // When the country changes, load its saved settings and reset regen state.
  useEffect(() => {
    if (!selectedCountryId) return;
    (async () => {
      const saved = await fetchWatermarkSettings(selectedCountryId);
      setSettings(saved);
      setScanResult(null);
      setRegenStats({ processed: 0, errors: 0, total: 0 });
    })();
  }, [selectedCountryId]);
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

  const handleSaveSettings = async () => {
    if (!selectedCountryId) {
      toast({
        title: 'Select a country',
        description: 'Choose a country before saving settings.',
        variant: 'destructive',
      });
      return;
    }
    setSavingSettings(true);
    try {
      await saveWatermarkSettings(selectedCountryId, settings);
      toast({ title: 'Saved', description: `Watermark settings saved for ${selectedCountryName}.` });
    } catch (err) {
      console.error('Failed to save watermark settings:', err);
      toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleScan = async () => {
    if (!selectedCountryName) return;
    setIsScanning(true);
    setScanResult(null);
    try {
      const result = await collectCountryWatermarkTargets(selectedCountryName);
      setScanResult(result);
      setRegenStats({ processed: 0, errors: 0, total: result.targets.length });
    } catch (err) {
      console.error('Failed to scan country images:', err);
      toast({ title: 'Error', description: 'Could not scan the country images.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleRegenerate = async () => {
    if (!scanResult || scanResult.targets.length === 0) return;
    setIsRegenerating(true);
    const stats: RegenStats = { processed: 0, errors: 0, total: scanResult.targets.length };
    setRegenStats({ ...stats });
    // Sequential on purpose: re-encoding + uploading many images at once would
    // exhaust browser memory and saturate the connection.
    for (const target of scanResult.targets) {
      try {
        await regenerateWatermarkedInPlace(target.originalUrl, target.watermarkedUrl, settings);
        stats.processed += 1;
      } catch (err) {
        console.error('Failed to regenerate watermark:', target.watermarkedUrl, err);
        stats.errors += 1;
      }
      setRegenStats({ ...stats });
    }
    setIsRegenerating(false);
    toast({
      title: 'Regeneration complete',
      description: `Processed: ${stats.processed}, Errors: ${stats.errors}`,
    });
  };

  const handleTestScan = async () => {
    const userId = testUserId.trim();
    if (!userId) return;
    setIsTestScanning(true);
    setTestScanResult(null);
    try {
      const result = await collectUserCollectionWatermarkTargets(userId);
      setTestScanResult(result);
      setTestStats({ processed: 0, errors: 0, total: result.targets.length });
    } catch (err) {
      console.error('Failed to scan user collection:', err);
      toast({ title: 'Error', description: "Could not scan the user's collection.", variant: 'destructive' });
    } finally {
      setIsTestScanning(false);
    }
  };

  const handleTestRegenerate = async () => {
    if (!testScanResult || testScanResult.targets.length === 0) return;
    setIsTestRegenerating(true);
    const stats: RegenStats = { processed: 0, errors: 0, total: testScanResult.targets.length };
    setTestStats({ ...stats });
    for (const target of testScanResult.targets) {
      try {
        await regenerateWatermarkedInPlace(target.originalUrl, target.watermarkedUrl, settings);
        stats.processed += 1;
      } catch (err) {
        console.error('Failed to regenerate watermark (test):', target.watermarkedUrl, err);
        stats.errors += 1;
      }
      setTestStats({ ...stats });
    }
    setIsTestRegenerating(false);
    toast({
      title: 'Test regeneration complete',
      description: `Processed: ${stats.processed}, Errors: ${stats.errors}`,
    });
  };

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
        <CardTitle><span>{title}</span></CardTitle>
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

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto text-center rounded-md border p-8">
          <h1 className="text-2xl font-bold mb-2"><span>Access restricted</span></h1>
          <p className="text-muted-foreground">This page is for administrators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold"><span>Watermark Preview</span></h1>
        <p className="text-muted-foreground mt-2">
          Upload a horizontal and a vertical photo, move the controls, and see the
          result live. Save settings per country and regenerate existing watermarks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><span>Country</span></CardTitle>
        </CardHeader>
        <CardContent>
          {isCountryAdmin ? (
            <p className="text-sm text-muted-foreground">
              Managing watermark settings for <strong>{selectedCountryName || '…'}</strong>
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="watermark-country-select">Select a country</Label>
              <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                <SelectTrigger id="watermark-country-select" className="w-64">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle><span>Watermark settings</span></CardTitle>
          <div className="flex gap-2">
            <Button onClick={resetSettings} variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to defaults
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!selectedCountryId || savingSettings}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {savingSettings ? 'Saving…' : 'Save for country'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONTROLS.map((section, i) => (
              <div key={section.group} className="space-y-4">
                <h3 className="font-semibold text-sm"><span>{section.group}</span></h3>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle><span>Regenerate watermarks for this country</span></CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Re-applies the saved settings to every existing watermarked photo of{' '}
              <strong>{selectedCountryName || 'the selected country'}</strong> — catalog,
              unlisted, and collection items. Files are overwritten in place (same URL);
              the CDN cache may take up to a minute to refresh.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleScan}
              disabled={!selectedCountryName || isScanning || isRegenerating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {isScanning ? 'Scanning…' : 'Scan'}
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={!scanResult || scanResult.targets.length === 0 || isRegenerating}
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scanResult ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">Photos to regenerate: {scanResult.targets.length}</Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Skipped (no original/watermarked pair): {scanResult.skipped}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Processed: {regenStats.processed}
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  Errors: {regenStats.errors}
                </Badge>
              </div>
              {isRegenerating && regenStats.total > 0 && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((regenStats.processed + regenStats.errors) / regenStats.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing… {regenStats.processed + regenStats.errors} / {regenStats.total}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedCountryName
                ? 'Scan the country to count how many watermarked photos will be regenerated.'
                : 'Select a country first.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><span>Test: regenerate one user's collection</span></CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Regenerates the watermarks of the collection of the user "{TEST_USERNAME}" — a small, safe scope to verify the pipeline.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm">
                The user name: <strong>"{TEST_USERNAME}"</strong>
              </p>
              <Button
                onClick={() => navigate(`/profile/${encodeURIComponent(TEST_USERNAME)}`)}
                variant="link"
                size="sm"
                className="h-auto p-0 gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View profile
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTestScan}
                disabled={isTestScanning || isTestRegenerating}
                variant="outline"
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                {isTestScanning ? 'Scanning…' : 'Scan'}
              </Button>
              <Button
                onClick={handleTestRegenerate}
                disabled={!testScanResult || testScanResult.targets.length === 0 || isTestRegenerating}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>

          {testScanResult ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">Photos to regenerate: {testScanResult.targets.length}</Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Skipped: {testScanResult.skipped}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Processed: {testStats.processed}
                </Badge>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  Errors: {testStats.errors}
                </Badge>
              </div>
              {isTestRegenerating && testStats.total > 0 && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((testStats.processed + testStats.errors) / testStats.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing… {testStats.processed + testStats.errors} / {testStats.total}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scan the user to count how many watermarked photos will be regenerated.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WatermarkPreview;
