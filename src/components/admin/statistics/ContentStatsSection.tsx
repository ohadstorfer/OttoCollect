import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { FileText, MessageSquare } from 'lucide-react';
import { StatCard } from './StatCard';
import { statisticsService, BlogStats, ForumStats } from '@/services/statisticsService';
import { useTranslation } from 'react-i18next';

export const ContentStatsSection: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [blogStats, setBlogStats] = useState<BlogStats[]>([]);
  const [forumStats, setForumStats] = useState<ForumStats[]>([]);
  const [currentTotals, setCurrentTotals] = useState({
    totalBlogPosts: 0,
    totalForumPosts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContentStats();
  }, []);

  const loadContentStats = async () => {
    try {
      const [blogStatsData, forumStatsData, blogTotal, forumTotal] = await Promise.all([
        statisticsService.getBlogStats(30),
        statisticsService.getForumStats(30),
        statisticsService.getCurrentBlogTotals(),
        statisticsService.getCurrentForumTotals()
      ]);
      
      setBlogStats(blogStatsData.reverse());
      setForumStats(forumStatsData.reverse());
      setCurrentTotals({
        totalBlogPosts: blogTotal,
        totalForumPosts: forumTotal
      });
    } catch (error) {
      console.error('Error loading content stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    blogPosts: {
      label: t('statistics.contentStats.blogPosts'),
      color: "hsl(var(--primary))",
    },
    forumPosts: {
      label: t('statistics.contentStats.forumPosts'),
      color: "hsl(280, 70%, 60%)", // Purple color
    },
  };

  // Combine blog and forum stats by date
  const chartData = blogStats.map(blogStat => {
    const forumStat = forumStats.find(fs => fs.date === blogStat.date);
    return {
      date: new Date(blogStat.date).toLocaleDateString(),
      blogPosts: blogStat.totalBlogPosts,
      forumPosts: forumStat?.totalForumPosts || 0
    };
  });

  if (loading) {
    return <div>{t('statistics.contentStats.loading')}</div>;
  }

  console.log('Content stats data:', { blogStats, forumStats, currentTotals, chartData });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title={t('statistics.contentStats.totalBlogPosts')}
          value={currentTotals.totalBlogPosts}
          icon={FileText}
          description={t('statistics.contentStats.allPublishedBlogPosts')}
        />
        <StatCard
          title={t('statistics.contentStats.totalForumPosts')}
          value={currentTotals.totalForumPosts}
          icon={MessageSquare}
          description={t('statistics.contentStats.allForumDiscussions')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle><span>{t('statistics.contentStats.contentGrowthOverTime')}</span></CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="blogPosts" 
                    stroke="var(--color-blogPosts)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forumPosts" 
                    stroke="var(--color-forumPosts)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">{t('statistics.contentStats.noContentGrowthData')}</p>
                <p className="text-sm">{t('statistics.contentStats.generateDailyStats')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};