import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { BarChart as BarChartIcon, TrendingUp, Users, Target } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface PerformanceMetric {
  id: string;
  employee_id: string;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
  notes: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

const Performance = () => {
  const { toast } = useToast();

  // Query for employee profiles
  const { data: profiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['employee-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (error) {
        toast({
          title: "Error fetching profiles",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data;
    },
  });

  // Query for performance metrics
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_performance')
        .select(`
          *,
          profiles:employee_id (
            full_name,
            email
          )
        `)
        .order('recorded_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching metrics",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data;
    },
  });

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          refetchProfiles();
        }
      )
      .subscribe();

    // Subscribe to performance metrics changes
    const metricsChannel = supabase
      .channel('metrics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_performance' },
        () => {
          refetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [refetchProfiles, refetchMetrics]);

  // Calculate active employees (employees with at least one performance metric)
  const activeEmployees = metrics 
    ? new Set(metrics.map(m => m.employee_id)).size
    : 0;

  // Calculate average performance across all metrics
  const averagePerformance = metrics?.length
    ? Math.round(
        metrics.reduce((acc, curr) => acc + curr.metric_value, 0) / metrics.length
      )
    : 0;

  // Calculate performance trend (comparing last month to previous month)
  const calculateTrend = () => {
    if (!metrics?.length) return 0;
    
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    
    const currentMonth = new Date().getMonth();
    const currentMonthMetrics = sortedMetrics.filter(
      m => new Date(m.recorded_at).getMonth() === currentMonth
    );
    const lastMonthMetrics = sortedMetrics.filter(
      m => new Date(m.recorded_at).getMonth() === currentMonth - 1
    );

    const currentAvg = currentMonthMetrics.reduce((acc, curr) => acc + curr.metric_value, 0) / 
      (currentMonthMetrics.length || 1);
    const lastAvg = lastMonthMetrics.reduce((acc, curr) => acc + curr.metric_value, 0) / 
      (lastMonthMetrics.length || 1);

    return Math.round(((currentAvg - lastAvg) / lastAvg) * 100) || 0;
  };

  const trend = calculateTrend();

  // Get recent metrics for the chart
  const recentMetrics = metrics
    ?.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, 6)
    .reverse()
    .map(metric => ({
      ...metric,
      name: metric.profiles?.full_name || 'Unknown',
      date: new Date(metric.recorded_at).toLocaleDateString(),
    }));

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Performance Metrics</h1>
          <p className="text-gray-600 mt-1">Track and analyze team performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Average Performance"
            value={`${averagePerformance}%`}
            icon={<BarChartIcon className="w-6 h-6" />}
            description="Across all metrics"
          />
          <StatCard
            title="Performance Trend"
            value={`${trend > 0 ? '+' : ''}${trend}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            description="Month over month"
          />
          <StatCard
            title="Active Employees"
            value={activeEmployees}
            icon={<Users className="w-6 h-6" />}
            description="With recorded metrics"
          />
          <StatCard
            title="Total Metrics"
            value={metrics?.length || 0}
            icon={<Target className="w-6 h-6" />}
            description="Performance records"
          />
        </div>

        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Performance Trends</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip />
                <Bar 
                  dataKey="metric_value" 
                  fill="hsl(var(--primary))" 
                  name="Performance Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
            <div className="space-y-3">
              {metrics
                ?.sort((a, b) => b.metric_value - a.metric_value)
                .slice(0, 5)
                .map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{metric.profiles?.full_name || 'Unknown Employee'}</h3>
                      <p className="text-sm text-muted-foreground">{metric.metric_name}</p>
                    </div>
                    <div className="text-primary font-semibold">{metric.metric_value}%</div>
                  </div>
                ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Recent Updates</h2>
            <div className="space-y-3">
              {metrics
                ?.slice(0, 5)
                .map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{metric.profiles?.full_name || 'Unknown Employee'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(metric.recorded_at).toLocaleDateString()} - {metric.metric_name}
                      </p>
                    </div>
                    <div className="text-primary font-semibold">{metric.metric_value}%</div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Performance;