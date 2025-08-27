import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Info, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const Guide = () => {
  const { t } = useTranslation('guide');
  const { direction } = useLanguage();


  // Function to replace emojis with Lucide icons
  const renderDescriptionWithIcons = (text: string) => {
    if (!text) return text;
    
    // Replace trash emoji with Trash2 icon
    const parts = text.split('🗑️');
    if (parts.length > 1) {
      return parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <Trash2 className="inline-block w-4 h-4 text-red-500 mx-1" />
          )}
        </React.Fragment>
      ));
    }
    
    return text;
  };

  // State to track which sections are expanded (default to all minimized)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    addBanknote: false,
    editBanknote: false,
    suggestPicture: false,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const StepIcon = ({ type }: { type?: string }) => {
    if (type === 'error') {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return <CheckCircle className="h-5 w-5 text-primary" />;
  };

  const renderSection = (sectionKey: string) => {
    const section = t(`sections.${sectionKey}`, { returnObjects: true }) as any;
    const isExpanded = expandedSections[sectionKey];

    return (
      <Card key={sectionKey} className="mb-8">
        <CardContent className="p-0">
          {/* Collapsible Header */}
          <Button
            variant="ghost"
            onClick={() => toggleSection(sectionKey)}
            className="w-full p-8 h-auto justify-between hover:bg-muted/50 rounded-none"
          >
            <div className="flex flex-wrap items-center gap-3 ">

              <h2 className="text-[1.25rem] font-bold text-foreground break-words whitespace-normal text-left">
                <span className="text-[1.25rem] shrink-0">{section.icon}</span>
                <span>{section.title}</span>
              </h2>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-6 w-6 text-muted-foreground" />
            )}
          </Button>

          {/* Collapsible Content */}
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-none opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="px-8 pb-8">
              <div className="space-y-6">
                {Object.entries(section.steps).map(([stepKey, step]: [string, any]) => (
                  <div key={stepKey}>
                    <div className="flex items-start gap-4">
                      <StepIcon type={step.type} />
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold text-foreground mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                          <span>{step.title}</span>
                        </h3>
                        <p className={`text-muted-foreground leading-relaxed ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                          {renderDescriptionWithIcons(step.description)}
                        </p>
                      </div>
                    </div>
                    {stepKey !== Object.keys(section.steps)[Object.keys(section.steps).length - 1] && (
                      <Separator className="my-6" />
                    )}
                  </div>
                ))}

                {section.note && (
                  <>
                    <Separator className="my-6" />
                    <div className="flex items-start gap-4 bg-muted/50 p-4 rounded-lg">
                      <Info className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">
                          <span>ℹ️ {section.note.title}</span>
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {section.note.description}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          <span>{t('title')}</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-8">
        {renderSection('addBanknote')}
        {renderSection('editBanknote')}
        {renderSection('suggestPicture')}
      </div>
    </div>
  );
};

export default Guide;