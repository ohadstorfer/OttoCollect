import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Eye, Database, FileImage, ImageOff } from 'lucide-react';
import { statisticsService } from '@/services/statisticsService';
import { useTranslation } from 'react-i18next';

interface CatalogSummary {
  countryId: string;
  countryName: string;
  totalViews: number;
  totalCollections: number;
  totalItems: number;
  itemsMissingPhotos: number;
  itemsWithPhotos: number;
}

export const CatalogStatsSection: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [catalogStats, setCatalogStats] = useState<CatalogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalogStats();
  }, []);

  const loadCatalogStats = async () => {
    try {
      const data = await statisticsService.getCurrentCatalogTotals();
      setCatalogStats(data);
    } catch (error) {
      console.error('Error loading catalog stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    totalItems: {
      label: t('statistics.catalogStats.totalItems'),
      color: "hsl(var(--primary))",
    },
    itemsWithPhotos: {
      label: t('statistics.catalogStats.itemsWithPhotos'),
      color: "hsl(var(--secondary))",
    },
    itemsMissingPhotos: {
      label: t('statistics.catalogStats.itemsMissingPhotos'),
      color: "hsl(var(--destructive))",
    },
  };

  const chartData = catalogStats.map(stat => ({
    country: stat.countryName.length > 10 ? stat.countryName.substring(0, 10) + '...' : stat.countryName,
    totalItems: stat.totalItems,
    itemsWithPhotos: stat.itemsWithPhotos,
    itemsMissingPhotos: stat.itemsMissingPhotos
  }));

  if (loading) {
    return <div>{t('statistics.catalogStats.loading')}</div>;
  }

  console.log('Catalog stats data:', { catalogStats, chartData });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle><span>{t('statistics.catalogStats.catalogItemsOverview')}</span></CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="country" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="totalItems" 
                    fill="var(--color-totalItems)" 
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="itemsWithPhotos" 
                    fill="var(--color-itemsWithPhotos)" 
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="itemsMissingPhotos" 
                    fill="var(--color-itemsMissingPhotos)" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">{t('statistics.catalogStats.noCatalogData')}</p>
                <p className="text-sm">{t('statistics.catalogStats.generateDailyStats')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><span>{t('statistics.catalogStats.catalogStatisticsByCountry')}</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('statistics.catalogStats.country')}</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <Eye className="mr-2 h-4 w-4" />
                    {t('statistics.catalogStats.totalViews')}
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <Database className="mr-2 h-4 w-4" />
                    {t('statistics.catalogStats.collections')}
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <FileImage className="mr-2 h-4 w-4" />
                    {t('statistics.catalogStats.totalItems')}
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <ImageOff className="mr-2 h-4 w-4" />
                    {t('statistics.catalogStats.missingPhotos')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogStats.length > 0 ? (
                catalogStats.map((stat) => (
                  <TableRow key={stat.countryId}>
                    <TableCell className="font-medium">{stat.countryName}</TableCell>
                    <TableCell className="text-right">{stat.totalViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.totalCollections.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{stat.totalItems.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={stat.itemsMissingPhotos > 0 ? "text-destructive" : "text-muted-foreground"}>
                        {stat.itemsMissingPhotos.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('statistics.catalogStats.noCatalogStatistics')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};