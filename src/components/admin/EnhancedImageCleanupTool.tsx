import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { runImageCleanup } from '@/services/imageCleanupService';
import { processImageCleanupQueue } from '@/services/imageQueueService';
import { toast } from 'sonner';

export function EnhancedImageCleanupTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunCleanup = async () => {
    try {
      setIsRunning(true);
      setResult(null);
      
      const data = await runImageCleanup();
      setResult(data);
      
      if (data.success) {
        toast.success(`Cleanup completed! Deleted ${data.summary?.deletedFiles || 0} orphaned files.`);
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

  const handleProcessQueue = async () => {
    try {
      setIsRunning(true);
      
      const data = await processImageCleanupQueue();
      
      if (data.success) {
        toast.success(`Queue processed! Processed ${data.processed || 0} items with ${data.errors || 0} errors.`);
      } else {
        toast.error('Queue processing failed');
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      toast.error('Failed to process queue');
    } finally {
      setIsRunning(false);
    }
  };

  const imageTypes = [
    { category: 'Banknotes', types: ['front_picture', 'back_picture', 'front_picture_watermarked', 'back_picture_watermarked', 'front_picture_thumbnail', 'back_picture_thumbnail'] },
    { category: 'Stamps', types: ['signature_pictures', 'seal_pictures', 'other_element_pictures', 'watermark_picture', 'tughra_picture'] },
    { category: 'Collections', types: ['obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 'obverse_image_thumbnail', 'reverse_image_thumbnail'] },
    { category: 'User Content', types: ['avatar_url', 'image_urls (forum)', 'main_image_url (blog)', 'image_url (countries)'] },
    { category: 'Suggestions', types: ['obverse_image', 'reverse_image', 'obverse_image_watermarked', 'reverse_image_watermarked', 'obverse_image_thumbnail', 'reverse_image_thumbnail'] }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Image Storage Cleanup</CardTitle>
          <CardDescription>
            Remove orphaned images from storage that are no longer referenced in the database.
            This enhanced version covers all image types across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleRunCleanup} 
              disabled={isRunning}
              variant="outline"
              className="flex-1"
            >
              {isRunning ? 'Running Cleanup...' : 'Scan for Orphaned Images'}
            </Button>
            <Button 
              onClick={handleProcessQueue} 
              disabled={isRunning}
              variant="default"
              className="flex-1"
            >
              {isRunning ? 'Processing Queue...' : 'Process Deletion Queue'}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Scan:</strong> Find orphaned images in storage that are no longer referenced in database</p>
            <p><strong>Process Queue:</strong> Delete images queued by database triggers when records are updated</p>
          </div>
          
          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Cleanup Results
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>Total DB Images: <strong>{result.summary?.totalDbImages || 0}</strong></p>
                  <p>Total DB References: <strong>{result.summary?.totalDbReferences || 0}</strong></p>
                  <p>Total Storage Files: <strong>{result.summary?.totalStorageFiles || 0}</strong></p>
                </div>
                <div>
                  <p>Orphaned Files: <strong>{result.summary?.orphanedFiles || 0}</strong></p>
                  <p>Files Deleted: <strong className="text-green-600">{result.summary?.deletedFiles || 0}</strong></p>
                  <p>Errors: <strong className="text-red-600">{result.summary?.errors || 0}</strong></p>
                </div>
              </div>
              
              {result.orphanedFilesList && result.orphanedFilesList.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium">
                    Orphaned Files List ({result.orphanedFilesList.length})
                  </summary>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    <ul className="text-xs space-y-1">
                      {result.orphanedFilesList.map((file: string, index: number) => (
                        <li key={index} className="truncate font-mono bg-muted-foreground/10 px-2 py-1 rounded">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
              
              {result.errors && result.errors.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium text-destructive">
                    Errors ({result.errors.length})
                  </summary>
                  <ul className="mt-2 text-xs space-y-1">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index} className="text-destructive bg-destructive/10 px-2 py-1 rounded">
                        {error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Types Coverage</CardTitle>
          <CardDescription>
            This cleanup tool searches for images in all the following locations:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageTypes.map((category) => (
              <div key={category.category} className="space-y-2">
                <h4 className="font-medium text-sm">{category.category}</h4>
                <div className="space-y-1">
                  {category.types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}