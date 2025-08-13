import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { runImageCleanup } from '@/services/imageCleanupService';
import { toast } from 'sonner';

export function ImageCleanupTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunCleanup = async () => {
    try {
      setIsRunning(true);
      setResult(null);
      
      const data = await runImageCleanup();
      setResult(data);
      
      if (data.success) {
        toast.success(`Cleanup completed! Deleted ${data.summary.deletedFiles} orphaned files.`);
      } else {
        toast.error('Cleanup failed');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Storage Cleanup</CardTitle>
        <CardDescription>
          Remove orphaned images from storage that are no longer referenced in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleRunCleanup} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Cleanup...' : 'Run Image Cleanup'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Cleanup Results:</h3>
            <div className="text-sm space-y-1">
              <p>Total DB Images: {result.summary.totalDbImages}</p>
              <p>Total DB References: {result.summary.totalDbReferences}</p>
              <p>Total Storage Files: {result.summary.totalStorageFiles}</p>
              <p>Orphaned Files Found: {result.summary.orphanedFiles}</p>
              <p>Files Deleted: {result.summary.deletedFiles}</p>
              <p>Errors: {result.summary.errors}</p>
            </div>
            
            {result.orphanedFilesList && result.orphanedFilesList.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">
                  First 100 Orphaned Files
                </summary>
                <ul className="mt-2 text-xs max-h-40 overflow-y-auto">
                  {result.orphanedFilesList.map((file: string, index: number) => (
                    <li key={index} className="truncate">{file}</li>
                  ))}
                </ul>
              </details>
            )}
            
            {result.errors && result.errors.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-destructive">
                  Errors ({result.errors.length})
                </summary>
                <ul className="mt-2 text-xs">
                  {result.errors.map((error: string, index: number) => (
                    <li key={index} className="text-destructive">{error}</li>
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