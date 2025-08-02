import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, FileText, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UserStatsSection } from './statistics/UserStatsSection';
import { CatalogStatsSection } from './statistics/CatalogStatsSection';
import { ContentStatsSection } from './statistics/ContentStatsSection';
import { ViewStatsSection } from './statistics/ViewStatsSection';
import { statisticsService } from '@/services/statisticsService';

export const AdminStatistics: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateStats = async () => {
    setIsGenerating(true);
    try {
      await statisticsService.generateDailyStats();
      toast.success('Daily statistics generated successfully');
      // Trigger a refresh of all stats components
      window.location.reload();
    } catch (error) {
      console.error('Error generating daily stats:', error);
      toast.error('Failed to generate daily statistics');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif"> <span>Platform Statistics</span></h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for your platform
          </p>
        </div>
        <Button 
          onClick={handleGenerateStats}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate Daily Stats'}
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Catalog Stats
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content Stats
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserStatsSection />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <CatalogStatsSection />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <ContentStatsSection />
        </TabsContent>

        <TabsContent value="views" className="space-y-4">
          <ViewStatsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};