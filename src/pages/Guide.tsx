import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Guide = () => {
  const { t } = useTranslation('guide');

  const StepIcon = ({ type }: { type?: string }) => {
    if (type === 'error') {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return <CheckCircle className="h-5 w-5 text-primary" />;
  };

  const renderSection = (sectionKey: string) => {
    const section = t(`sections.${sectionKey}`, { returnObjects: true }) as any;
    
    return (
      <Card key={sectionKey} className="mb-8">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">{section.icon}</span>
            <h2 className="text-2xl font-bold text-foreground"><span>{section.title}</span></h2>
          </div>
          
          <div className="space-y-6">
            {Object.entries(section.steps).map(([stepKey, step]: [string, any]) => (
              <div key={stepKey}>
                <div className="flex items-start gap-4">
                  <StepIcon type={step.type} />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      <span>{step.title}</span>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
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
          Learn how to use OttoCollect effectively
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