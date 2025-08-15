import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { runImageCleanup } from '@/services/imageCleanupService';
import { toast } from 'sonner';

export default function UpdatedTestCleanup() {
  const [mounted, setMounted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Enhanced Image Cleanup Test</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Image Storage Cleanup</CardTitle>
            <CardDescription>
              Remove orphaned images from storage that are no longer referenced in the database.
              This includes images from:
              <ul className="mt-2 text-sm space-y-1">
                <li>• Banknotes (front/back pictures, watermarked, thumbnails)</li>
                <li>• Collection items (obverse/reverse images, personal photos)</li>
                <li>• Profile avatars</li>
                <li>• Forum posts and announcements</li>
                <li>• Blog posts</li>
                <li>• Image suggestions</li>
                <li>• Country images</li>
                <li>• Stamp images (tughra, watermark, seal, signatures)</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleRunCleanup} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Running Enhanced Cleanup...' : 'Run Enhanced Image Cleanup'}
            </Button>
            
            {result && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Cleanup Results:</h3>
                <div className="text-sm space-y-1">
                  <p>Status: {result.success ? '✅ Success' : '❌ Failed'}</p>
                  <p>Total DB Images: {result.summary?.totalDbImages || 'N/A'}</p>
                  <p>Total DB References: {result.summary?.totalDbReferences || 'N/A'}</p>
                  <p>Total Storage Files: {result.summary?.totalStorageFiles || 'N/A'}</p>
                  <p>Orphaned Files Found: {result.summary?.orphanedFiles || 'N/A'}</p>
                  <p>Files Deleted: {result.summary?.deletedFiles || 'N/A'}</p>
                  <p>Errors: {result.summary?.errors || 'N/A'}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Image Types Covered</CardTitle>
            <CardDescription>
              The cleanup tool now searches for images in all these locations:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Banknote Images:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Front/back pictures</li>
                  <li>• Watermarked versions</li>
                  <li>• Thumbnail versions</li>
                  <li>• Signature pictures (arrays)</li>
                  <li>• Seal pictures (arrays)</li>
                  <li>• Other element pictures (arrays)</li>
                  <li>• Watermark pictures</li>
                  <li>• Tughra pictures</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">User Content Images:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Collection item images</li>
                  <li>• Profile avatars</li>
                  <li>• Forum post images</li>
                  <li>• Forum announcement images</li>
                  <li>• Blog post images</li>
                  <li>• Image suggestions</li>
                  <li>• Country images</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}