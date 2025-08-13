import React, { useEffect, useState } from 'react';
import { ImageCleanupTool } from '@/components/admin/ImageCleanupTool';

export default function TestCleanup() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Image Cleanup Test</h1>
      <ImageCleanupTool />
    </div>
  );
}