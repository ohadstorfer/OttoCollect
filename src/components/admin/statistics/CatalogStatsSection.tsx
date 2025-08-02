import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Eye, Database, FileImage, ImageOff } from 'lucide-react';
import { statisticsService } from '@/services/statisticsService';

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
      label: "Total Items",
      color: "hsl(var(--primary))",
    },
    itemsWithPhotos: {
      label: "Items with Photos",
      color: "hsl(var(--secondary))",
    },
    itemsMissingPhotos: {
      label: "Items Missing Photos",
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
    return <div>Loading catalog statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle><span>Catalog Items Overview</span></CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><span>Catalog Statistics by Country</span></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <Eye className="mr-2 h-4 w-4" />
                    Total Views
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <Database className="mr-2 h-4 w-4" />
                    Collections
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <FileImage className="mr-2 h-4 w-4" />
                    Total Items
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end">
                    <ImageOff className="mr-2 h-4 w-4" />
                    Missing Photos
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogStats.map((stat) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};