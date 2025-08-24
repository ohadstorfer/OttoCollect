import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, Globe } from 'lucide-react';
import { StatCard } from './StatCard';
import { statisticsService, UserStats } from '@/services/statisticsService';
import { useTranslation } from 'react-i18next';

export const UserStatsSection: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [currentTotals, setCurrentTotals] = useState({
    totalRegistered: 0,
    weeklyGuests: 0,
    weeklyActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const [stats, totals] = await Promise.all([
        statisticsService.getUserStats(30),
        statisticsService.getCurrentUserTotals()
      ]);
      
      setUserStats(stats.reverse()); // Reverse to show chronological order
      setCurrentTotals(totals);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    totalRegistered: {
      label: t('statistics.userStats.totalRegistered'),
      color: "hsl(var(--primary))",
    },
    weeklyActive: {
      label: t('statistics.userStats.weeklyActive'),
      color: "hsl(0, 0%, 30%)", // Dark grey color
    },
    weeklyGuests: {
      label: t('statistics.userStats.weeklyGuests'),
      color: "hsl(280, 70%, 60%)", // Purple color to distinguish from primary
    },
  };

  const chartData = userStats.map(stat => ({
    date: new Date(stat.date).toLocaleDateString(),
    totalRegistered: stat.totalRegisteredUsers,
    weeklyActive: stat.weeklyActiveUsers,
    weeklyGuests: stat.weeklyGuestVisits
  }));

  if (loading) {
    return <div>{t('statistics.userStats.loading')}</div>;
  }

  console.log('User stats data:', { userStats, currentTotals, chartData });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t('statistics.userStats.totalRegisteredUsers')}
          value={currentTotals.totalRegistered}
          icon={Users}
          description={t('statistics.userStats.allRegisteredUsers')}
        />
        <StatCard
          title={t('statistics.userStats.weeklyGuestVisits')}
          value={currentTotals.weeklyGuests}
          icon={Globe}
          description={t('statistics.userStats.last7Days')}
        />
        <StatCard
          title={t('statistics.userStats.weeklyRegisteredUsers')}
          value={currentTotals.weeklyActive}
          icon={UserCheck}
          description={t('statistics.userStats.loggedInUsersLast7Days')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle><span>{t('statistics.userStats.userGrowthTrends')}</span></CardTitle>
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
                    dataKey="totalRegistered" 
                    stroke="var(--color-totalRegistered)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weeklyActive" 
                    stroke="var(--color-weeklyActive)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weeklyGuests" 
                    stroke="var(--color-weeklyGuests)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">{t('statistics.userStats.noHistoricalData')}</p>
                <p className="text-sm">{t('statistics.userStats.generateDailyStats')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};