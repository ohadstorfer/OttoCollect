import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, Globe } from 'lucide-react';
import { StatCard } from './StatCard';
import { statisticsService, UserStats } from '@/services/statisticsService';

export const UserStatsSection: React.FC = () => {
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
      label: "Total Registered",
      color: "hsl(var(--primary))",
    },
    weeklyActive: {
      label: "Weekly Active",
      color: "hsl(var(--secondary))",
    },
    weeklyGuests: {
      label: "Weekly Guests",
      color: "hsl(var(--accent))",
    },
  };

  const chartData = userStats.map(stat => ({
    date: new Date(stat.date).toLocaleDateString(),
    totalRegistered: stat.totalRegisteredUsers,
    weeklyActive: stat.weeklyActiveUsers,
    weeklyGuests: stat.weeklyGuestVisits
  }));

  if (loading) {
    return <div>Loading user statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Registered Users"
          value={currentTotals.totalRegistered}
          icon={Users}
          description="All registered users"
        />
        <StatCard
          title="Weekly Guest Visits"
          value={currentTotals.weeklyGuests}
          icon={Globe}
          description="Last 7 days"
        />
        <StatCard
          title="Weekly Active Users"
          value={currentTotals.weeklyActive}
          icon={UserCheck}
          description="Logged in users (last 7 days)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle><span>User Growth Trends</span></CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};