import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Languages, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { bulkBanknoteTranslationService } from '@/services/bulkBanknoteTranslationService';

interface BulkTranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryName: string;
}

interface TranslationProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  currentBanknote?: string;
}

const BulkTranslationDialog: React.FC<BulkTranslationDialogProps> = ({
  open,
  onOpenChange,
  countryName
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleStartTranslation = async () => {
    setIsProcessing(true);
    setCompleted(false);
    setErrors([]);
    setProgress(null);

    try {
      const result = await bulkBanknoteTranslationService.processBulkTranslation(
        countryName,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setCompleted(true);
      setErrors(result.errors);

      if (result.success) {
        toast.success(
          `Translation completed! Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`
        );
      } else {
        toast.error('Translation failed with errors. Check the details below.');
      }
    } catch (error) {
      console.error('Bulk translation error:', error);
      toast.error('Failed to process translations');
      setErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setProgress(null);
      setCompleted(false);
      setErrors([]);
    }
  };

  const progressPercentage = progress ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
            <span>
            Bulk Translation for {countryName}
            </span>
          </DialogTitle>
          <DialogDescription>
            This will automatically translate all banknote fields for the selected country to Arabic and Turkish.
            Only missing translations will be processed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isProcessing && !completed && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2"><span>What will be translated:</span></h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Country name, face value, Islamic year</li>
                  <li>• Sultan name, printer, type, category</li>
                  <li>• Signatures (front and back)</li>
                  <li>• Seal names, security elements, colors</li>
                  <li>• Banknote and historical descriptions</li>
                  <li>• Dimensions and other text fields</li>
                </ul>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleStartTranslation}>
                  Start Translation
                </Button>
              </div>
            </div>
          )}

          {isProcessing && progress && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.processed} / {progress.total}</span>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                    {progress.currentBanknote && (
                      <p className="text-sm text-muted-foreground">
                        Processing: {progress.currentBanknote}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{progress.created}</div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{progress.updated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{progress.errors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold">{progressPercentage}%</div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Translation process completed!</span>
              </div>

              {progress && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{progress.created}</div>
                      <div className="text-sm text-muted-foreground">Created</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{progress.updated}</div>
                      <div className="text-sm text-muted-foreground">Updated</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{progress.errors}</div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{progress.processed}</div>
                      <div className="text-sm text-muted-foreground">Total Processed</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {errors.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">Errors ({errors.length})</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTranslationDialog;