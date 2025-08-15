import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  processImageCleanupQueue, 
  getCleanupQueueStats, 
  cleanupOldQueueItems 
} from '@/services/imageCleanupService';
import { toast } from 'sonner';

export function ImageCleanupTool() {
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
        toast.success(`Cleanup completed! Processed ${result.processed} items.`);
      } else {
        toast.warning(`Cleanup completed with ${result.errors} errors. Processed ${result.processed} items.`);
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCleanupOldItems = async () => {
    try {
      setIsRunning(true);
      const deletedCount = await cleanupOldQueueItems();
      toast.success(`Cleaned up ${deletedCount} old processed queue items.`);
      await refreshStats();
    } catch (error) {
      console.error('Error cleaning up old items:', error);
      toast.error('Failed to clean up old items');
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
        <CardTitle>Image Cleanup Queue Manager</CardTitle>
        <CardDescription>
          Process the image cleanup queue to delete old images from storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Statistics */}
        {stats && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Queue Statistics:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Total Items: {stats.total}</p>
                <p className="text-muted-foreground">Processed: {stats.processed}</p>
              </div>
              <div>
                <p className="font-medium">Pending: {stats.pending}</p>
                <p className="text-muted-foreground">Errors: {stats.errors}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={handleRunCleanup} 
            disabled={isRunning || (stats && stats.pending === 0)}
            className="w-full"
          >
            {isRunning ? 'Processing Queue...' : 'Process Cleanup Queue'}
          </Button>
          
          <Button 
            onClick={handleCleanupOldItems} 
            disabled={isRunning}
            variant="outline"
            className="w-full"
          >
            {isRunning ? 'Cleaning...' : 'Clean Up Old Processed Items'}
          </Button>
          
          <Button 
            onClick={refreshStats} 
            disabled={isRunning}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Refresh Stats
          </Button>
        </div>
        
        {/* Last Processing Result */}
        {lastResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Last Processing Result:</h3>
            <div className="text-sm space-y-1">
              <p>Processed: {lastResult.processed}</p>
              <p>Errors: {lastResult.errors}</p>
            </div>
            
            {lastResult.details && lastResult.details.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">
                  Processing Details ({lastResult.details.length})
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