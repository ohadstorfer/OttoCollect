import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  processImageCleanupQueue, 
  getCleanupQueueStats, 
  cleanupOldQueueItems 
} from '@/services/imageCleanupService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function ImageCleanupTool() {
  const { t } = useTranslation(['admin']);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleRunCleanup = async () => {
    try {
      setIsRunning(true);
      setLastResult(null);
      
      // Process the cleanup queue
      const result = await processImageCleanupQueue();
      setLastResult(result);
      
      // Refresh stats
      await refreshStats();
      
      if (result.errors === 0) {
        toast.success(t('imageCleanupTool.cleanupCompleted', { processed: result.processed }));
      } else {
        toast.warning(t('imageCleanupTool.cleanupCompletedWithErrors', { errors: result.errors, processed: result.processed }));
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error(t('imageCleanupTool.cleanupFailed'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleCleanupOldItems = async () => {
    try {
      setIsRunning(true);
      const deletedCount = await cleanupOldQueueItems();
      toast.success(t('imageCleanupTool.oldItemsCleanedUp', { deletedCount }));
      await refreshStats();
    } catch (error) {
      console.error('Error cleaning up old items:', error);
      toast.error(t('imageCleanupTool.cleanupOldItemsFailed'));
    } finally {
      setIsRunning(false);
    }
  };

  const refreshStats = async () => {
    try {
      const queueStats = await getCleanupQueueStats();
      setStats(queueStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Load stats on component mount
  React.useEffect(() => {
    refreshStats();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('imageCleanupTool.title')}</CardTitle>
        <CardDescription>
          {t('imageCleanupTool.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Statistics */}
        {stats && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">{t('imageCleanupTool.queueStatistics')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{t('imageCleanupTool.totalItems')} {stats.total}</p>
                <p className="text-muted-foreground">{t('imageCleanupTool.processed')} {stats.processed}</p>
              </div>
              <div>
                <p className="font-medium">{t('imageCleanupTool.pending')} {stats.pending}</p>
                <p className="text-muted-foreground">{t('imageCleanupTool.errors')} {stats.errors}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={handleRunCleanup} 
            disabled={isRunning || (stats && stats.pending === 0)}
            title={stats && stats.pending === 0 ? t('imageCleanupTool.noPendingItems') : undefined}
            className="w-full"
          >
            {isRunning ? t('imageCleanupTool.processing') : t('imageCleanupTool.runCleanup')}
          </Button>
          
          <Button 
            onClick={handleCleanupOldItems} 
            disabled={isRunning}
            variant="outline"
            className="w-full"
          >
            {isRunning ? t('imageCleanupTool.cleaning') : t('imageCleanupTool.cleanupOldItems')}
          </Button>
          
          <Button 
            onClick={refreshStats} 
            disabled={isRunning}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            {t('imageCleanupTool.refreshStats')}
          </Button>
        </div>
        
        {/* Last Processing Result */}
        {lastResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">{t('imageCleanupTool.lastProcessingResult')}</h3>
            <div className="text-sm space-y-1">
              <p>{t('imageCleanupTool.processed')}: {lastResult.processed}</p>
              <p>{t('imageCleanupTool.errors')}: {lastResult.errors}</p>
            </div>
            
            {lastResult.details && lastResult.details.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">
                  {t('imageCleanupTool.processingDetails')} ({lastResult.details.length})
                </summary>
                <ul className="mt-2 text-xs max-h-40 overflow-y-auto space-y-1">
                  {lastResult.details.map((detail: string, index: number) => (
                    <li key={index} className="truncate">{detail}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}