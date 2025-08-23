import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';

export const AdminStatistics: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation(['admin']);

  useEffect(() => {
    // Auto-generate daily statistics when component loads
    generateStatsOnLoad();
  }, []);

  const generateStatsOnLoad = async () => {
    try {
      setIsGenerating(true);
      await statisticsService.generateDailyStats();
      console.log('Daily statistics auto-generated successfully');
      setRefreshKey(prev => prev + 1); // Trigger refresh of child components
    } catch (error) {
      console.error('Error auto-generating daily stats:', error);
      // Don't show error toast for auto-generation to avoid annoying users
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualGenerateStats = async () => {
    setIsGenerating(true);
    try {
      await statisticsService.generateDailyStats();
      toast.success(t('statistics.generateSuccess'));
      setRefreshKey(prev => prev + 1); // Trigger refresh of child components
    } catch (error) {
      console.error('Error generating daily stats:', error);
      toast.error(t('statistics.generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 ">
      <div className="flex justify-between items-center">
        <div>
          <CardTitle className="text-2xl font-serif"><span>{t('statistics.title')}</span></CardTitle>
          <p className="text-muted-foreground">
            {t('statistics.description')}
          </p>
        </div>
        <Button 
          onClick={handleManualGenerateStats}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? t('statistics.generating') : t('statistics.refreshButton')}
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('statistics.tabs.users')}
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('statistics.tabs.catalog')}
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('statistics.tabs.content')}
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('statistics.tabs.views')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserStatsSection key={`user-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <CatalogStatsSection key={`catalog-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <ContentStatsSection key={`content-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="views" className="space-y-4">
          <ViewStatsSection key={`views-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};