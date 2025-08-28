import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Languages, Loader2, Check, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { translationService } from '@/services/translationService';

interface AutoTranslateFormProps {
  content: {
    title?: string;
    content?: string;
    description?: string;
    name?: string;
  };
  onTranslated: (translations: {
    title_ar?: string;
    title_tr?: string;
    content_ar?: string;
    content_tr?: string;
    description_ar?: string;
    description_tr?: string;
    name_ar?: string;
    name_tr?: string;
  }) => void;
  className?: string;
}

export const AutoTranslateForm: React.FC<AutoTranslateFormProps> = ({
  content,
  onTranslated,
  className = ''
}) => {
  const { isTranslating } = useTranslation();
  const [translations, setTranslations] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAutoTranslate = async () => {
    setIsGenerating(true);
    try {
      const result = await translationService.autoTranslateContent(content);
      setTranslations(result);
      onTranslated(result);
    } catch (error) {
      console.error('Auto-translation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasContent = Object.values(content).some(value => value && value.trim() !== '');
  const hasTranslations = Object.keys(translations).length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Auto Translation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Automatically translate your content to Arabic and Turkish using Google Translate.
          </p>
          
          <Button
            onClick={handleAutoTranslate}
            disabled={isGenerating || isTranslating || !hasContent}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Translations...
              </>
            ) : hasTranslations ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Regenerate Translations
              </>
            ) : (
              <>
                <Languages className="h-4 w-4 mr-2" />
                Generate Translations
              </>
            )}
          </Button>

          {hasTranslations && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Translations generated successfully
              </div>
              <div className="text-xs text-muted-foreground">
                {Object.keys(translations).length} translation fields created
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};