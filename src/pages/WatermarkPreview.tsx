import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateWatermarkedCanvas,
  WatermarkParamsApplied,
  WATERMARK_OPACITY,
  WATERMARK_PADDING_X_RATIO_LANDSCAPE,
  WATERMARK_PADDING_X_RATIO_PORTRAIT,
  WATERMARK_PADDING_Y_RATIO_LANDSCAPE,
  WATERMARK_PADDING_Y_RATIO_PORTRAIT,
  WATERMARK_WIDTH_RATIO_LANDSCAPE,
  WATERMARK_WIDTH_RATIO_PORTRAIT,
} from '@/services/imageProcessingService';

interface PreviewState {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  params: WatermarkParamsApplied;
  fileName: string;
}

const WatermarkPreview: React.FC = () => {
  const { toast } = useToast();
  const [landscapePreview, setLandscapePreview] = useState<PreviewState | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<PreviewState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const landscapeInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<PreviewState> => {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      premultiplyAlpha: 'premultiply',
      colorSpaceConversion: 'default',
    });

    const { canvas, params } = await generateWatermarkedCanvas(bitmap);
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);

    return {
      dataUrl,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      params,
      fileName: file.name,
    };
  };

  const handleFile = async (
    file: File | undefined,
    setter: (p: PreviewState | null) => void
  ) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const result = await processFile(file);
      setter(result);
    } catch (err) {
      console.error('Watermark preview failed:', err);
      toast({
        title: 'Error',
        description: 'No se pudo generar el preview. Revisá la consola.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
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

  const renderSlot = (
    title: string,
    suffix: 'landscape' | 'portrait',
    preview: PreviewState | null,
    setter: (p: PreviewState | null) => void,
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
            onChange={(e) => handleFile(e.target.files?.[0], setter)}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            {preview ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          <Button
            onClick={() => downloadPreview(preview, suffix)}
            disabled={!preview}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        </div>

        {preview ? (
          <>
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div><span className="font-medium">Archivo:</span> {preview.fileName}</div>
              <div>
                <span className="font-medium">Dimensiones:</span>{' '}
                {preview.originalWidth} × {preview.originalHeight}{' '}
                ({preview.params.isLandscape ? 'landscape' : 'portrait'})
              </div>
              <div>
                <span className="font-medium">Watermark:</span>{' '}
                {(preview.params.widthRatio * 100).toFixed(0)}% del ancho ={' '}
                {Math.round(preview.params.watermarkWidth)} ×{' '}
                {Math.round(preview.params.watermarkHeight)} px
              </div>
              <div>
                <span className="font-medium">Padding:</span>{' '}
                X {(preview.params.paddingXRatio * 100).toFixed(1)}% ({Math.round(preview.params.paddingX)}px){' '}
                / Y {(preview.params.paddingYRatio * 100).toFixed(1)}% ({Math.round(preview.params.paddingY)}px)
                {' · '}
                <span className="font-medium">Opacidad:</span> {preview.params.opacity}
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
            Sin foto cargada
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
          Probá el watermark con dos fotos (horizontal y vertical) sin subir nada al
          storage. Valores actuales (todos en % del ancho/alto): portrait tamaño{' '}
          {(WATERMARK_WIDTH_RATIO_PORTRAIT * 100).toFixed(0)}% / padding X{' '}
          {(WATERMARK_PADDING_X_RATIO_PORTRAIT * 100).toFixed(1)}% Y{' '}
          {(WATERMARK_PADDING_Y_RATIO_PORTRAIT * 100).toFixed(1)}%, landscape tamaño{' '}
          {(WATERMARK_WIDTH_RATIO_LANDSCAPE * 100).toFixed(0)}% / padding X{' '}
          {(WATERMARK_PADDING_X_RATIO_LANDSCAPE * 100).toFixed(1)}% Y{' '}
          {(WATERMARK_PADDING_Y_RATIO_LANDSCAPE * 100).toFixed(1)}%, opacidad{' '}
          {WATERMARK_OPACITY}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSlot('Horizontal (landscape)', 'landscape', landscapePreview, setLandscapePreview, landscapeInputRef)}
        {renderSlot('Vertical (portrait)', 'portrait', portraitPreview, setPortraitPreview, portraitInputRef)}
      </div>
    </div>
  );
};

export default WatermarkPreview;
